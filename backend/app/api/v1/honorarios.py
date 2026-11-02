from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc, update, case
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission
from app.models.usuario import Usuario
from app.models.medico import Medico
from app.models.caja import Cobro, CobroDetalle
from app.models.honorario import LiquidacionHonorario
from app.models.tasa_cambio import TasaCambio
from app.models.auditoria import AuditoriaLog
from app.schemas.honorario import (
    ConfiguracionComisionMedicoUpdate,
    ResumenCalculoHonorariosResponse,
    MedicoMiniHonorario,
    ItemCalculoCobro,
    LiquidarHonorariosRequest,
    PagarLiquidacionRequest,
    LiquidacionHonorarioResponse,
    LiquidacionesListResponse,
)

router = APIRouter(prefix="/honorarios", tags=["Liquidación de Honorarios Médicos"])


async def _get_tasa_bcv(db: AsyncSession, empresa_id: int) -> float:
    res = await db.execute(
        select(TasaCambio)
        .where(
            TasaCambio.empresa_id == empresa_id,
            TasaCambio.moneda_origen == "USD",
        )
        .order_by(desc(TasaCambio.created_at))
        .limit(1)
    )
    tasa = res.scalar_one_or_none()
    if tasa and tasa.tasa:
        return float(tasa.tasa)
    return 1.0


@router.get("/resumen-calculo", response_model=ResumenCalculoHonorariosResponse)
async def resumen_calculo_honorarios(
    medico_id: int = Query(..., description="ID del médico especialista a liquidar"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal específica"),
    fecha_desde: Optional[str] = Query(None, description="Fecha inicial YYYY-MM-DD"),
    fecha_hasta: Optional[str] = Query(None, description="Fecha final YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Calcula en tiempo real los cobros pendientes de liquidar para un médico,
    aplicando sus reglas de comisiones (% o fijo) y reteniendo la parte clínica.
    """
    # 1. Obtener datos del médico y verificar pertenencia a la empresa
    q_med = select(Medico).options(selectinload(Medico.especialidad)).where(Medico.id == medico_id)
    if not current_user.es_superadmin:
        q_med = q_med.where(Medico.empresa_id == current_user.empresa_id)

    res_med = await db.execute(q_med)
    medico = res_med.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # 2. Configurar fechas
    today = date.today()
    if fecha_desde:
        try:
            dt_desde = datetime.combine(datetime.strptime(fecha_desde, "%Y-%m-%d").date(), time.min)
        except ValueError:
            dt_desde = datetime.combine(today.replace(day=1), time.min)
    else:
        dt_desde = datetime.combine(today.replace(day=1), time.min)

    if fecha_hasta:
        try:
            dt_hasta = datetime.combine(datetime.strptime(fecha_hasta, "%Y-%m-%d").date(), time.max)
        except ValueError:
            dt_hasta = datetime.combine(today, time.max)
    else:
        dt_hasta = datetime.combine(today, time.max)

    # 3. Consultar cobros completados del médico que aún no han sido liquidados
    q_cobros = (
        select(Cobro)
        .options(selectinload(Cobro.paciente), selectinload(Cobro.detalles))
        .where(
            Cobro.medico_id == medico_id,
            Cobro.estado == "completado",
            or_(Cobro.liquidacion_id.is_(None), Cobro.liquidacion_id == 0),
            Cobro.fecha_emision >= dt_desde,
            Cobro.fecha_emision <= dt_hasta,
        )
        .order_by(Cobro.fecha_emision.asc())
    )
    if not current_user.es_superadmin:
        q_cobros = q_cobros.where(Cobro.empresa_id == current_user.empresa_id)
    if sucursal_id:
        q_cobros = q_cobros.where(Cobro.sucursal_id == sucursal_id)

    res_cobros = await db.execute(q_cobros)
    cobros = res_cobros.scalars().all()

    # 4. Parámetros de comisión del médico
    tipo_comision = medico.tipo_comision or "porcentaje"
    porcentaje = float(medico.porcentaje_honorario if medico.porcentaje_honorario is not None else 70.0)
    monto_fijo = float(medico.monto_fijo_honorario if medico.monto_fijo_honorario is not None else 0.0)

    total_recaudado = 0.0
    total_honorarios = 0.0
    total_retencion = 0.0
    items_calculados: List[ItemCalculoCobro] = []

    for c in cobros:
        monto_cobro = float(c.total_divisa or 0.0)
        total_recaudado += monto_cobro

        if tipo_comision == "fijo" and monto_fijo > 0:
            honorario_item = min(monto_fijo, monto_cobro)
            retencion_item = monto_cobro - honorario_item
            pct_aplicado = round((honorario_item / monto_cobro * 100.0), 2) if monto_cobro > 0 else 0.0
        else:
            honorario_item = round(monto_cobro * (porcentaje / 100.0), 2)
            retencion_item = round(monto_cobro - honorario_item, 2)
            pct_aplicado = porcentaje

        total_honorarios += honorario_item
        total_retencion += retencion_item

        # Extraer concepto principal
        conceptos = [d.descripcion for d in (c.detalles or [])]
        concepto_str = ", ".join(conceptos) if conceptos else "Atención médica"

        pac_nom = f"{c.paciente.nombres} {c.paciente.apellidos}" if c.paciente else "Paciente general"
        pac_doc = f"{c.paciente.tipo_documento}-{c.paciente.documento_identidad}" if c.paciente and c.paciente.documento_identidad else None

        items_calculados.append(
            ItemCalculoCobro(
                cobro_id=c.id,
                numero_recibo=c.numero_recibo,
                fecha=c.fecha_emision.strftime("%d/%m/%Y %H:%M") if c.fecha_emision else "",
                paciente_nombre=pac_nom,
                paciente_documento=pac_doc,
                concepto=concepto_str,
                monto_total_usd=monto_cobro,
                tipo_comision=tipo_comision,
                porcentaje_aplicado=pct_aplicado,
                honorario_medico_usd=honorario_item,
                retencion_clinica_usd=retencion_item,
            )
        )

    tasa_bcv = await _get_tasa_bcv(db, current_user.empresa_id)
    honorarios_ves = round(total_honorarios * tasa_bcv, 2)

    esp_nom = medico.especialidad.nombre if medico.especialidad else "Medicina General"
    med_doc = f"{medico.tipo_documento}-{medico.documento_identidad}" if medico.documento_identidad else None

    return ResumenCalculoHonorariosResponse(
        medico=MedicoMiniHonorario(
            id=medico.id,
            nombres=medico.nombres,
            apellidos=medico.apellidos,
            nombre_completo=f"Dr(a). {medico.nombres} {medico.apellidos}",
            especialidad=esp_nom,
            documento=med_doc,
            tipo_comision=tipo_comision,
            porcentaje_honorario=porcentaje,
            monto_fijo_honorario=monto_fijo,
            datos_bancarios=medico.datos_bancarios or {},
        ),
        periodo_desde=dt_desde.strftime("%Y-%m-%d"),
        periodo_hasta=dt_hasta.strftime("%Y-%m-%d"),
        total_cobros=len(cobros),
        monto_total_recaudado_usd=round(total_recaudado, 2),
        monto_honorarios_usd=round(total_honorarios, 2),
        monto_retencion_clinica_usd=round(total_retencion, 2),
        tasa_bcv=tasa_bcv,
        monto_honorarios_ves=honorarios_ves,
        cobros_pendientes=items_calculados,
    )


@router.post("/liquidar", response_model=LiquidacionHonorarioResponse)
async def liquidar_honorarios(
    payload: LiquidarHonorariosRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Genera la liquidación formal de honorarios para el médico seleccionado,
    asociando los recibos de cobro y bloqueándolos para evitar doble liquidación.
    """
    if not payload.cobros_ids:
        raise HTTPException(status_code=400, detail="Debe seleccionar al menos un recibo de cobro para liquidar.")

    # 1. Verificar médico
    q_med = select(Medico).where(Medico.id == payload.medico_id)
    if not current_user.es_superadmin:
        q_med = q_med.where(Medico.empresa_id == current_user.empresa_id)
    res_med = await db.execute(q_med)
    medico = res_med.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    # 2. Consultar y validar cobros
    q_cobros = (
        select(Cobro)
        .options(selectinload(Cobro.paciente), selectinload(Cobro.detalles))
        .where(
            Cobro.id.in_(payload.cobros_ids),
            Cobro.medico_id == payload.medico_id,
            Cobro.estado == "completado",
            or_(Cobro.liquidacion_id.is_(None), Cobro.liquidacion_id == 0),
        )
    )
    if not current_user.es_superadmin:
        q_cobros = q_cobros.where(Cobro.empresa_id == current_user.empresa_id)

    res_cobros = await db.execute(q_cobros)
    cobros = res_cobros.scalars().all()
    if not cobros:
        raise HTTPException(
            status_code=400,
            detail="Ninguno de los cobros seleccionados es válido o ya fueron liquidados previamente.",
        )

    # 3. Realizar el cálculo definitivo
    tipo_comision = medico.tipo_comision or "porcentaje"
    porcentaje = float(medico.porcentaje_honorario if medico.porcentaje_honorario is not None else 70.0)
    monto_fijo = float(medico.monto_fijo_honorario if medico.monto_fijo_honorario is not None else 0.0)

    total_recaudado = 0.0
    total_honorarios = 0.0
    total_retencion = 0.0
    desglose_cobros: List[Dict[str, Any]] = []

    for c in cobros:
        monto_c = float(c.total_divisa or 0.0)
        total_recaudado += monto_c

        if tipo_comision == "fijo" and monto_fijo > 0:
            hon = min(monto_fijo, monto_c)
            ret = monto_c - hon
            pct = round((hon / monto_c * 100.0), 2) if monto_c > 0 else 0.0
        else:
            hon = round(monto_c * (porcentaje / 100.0), 2)
            ret = round(monto_c - hon, 2)
            pct = porcentaje

        total_honorarios += hon
        total_retencion += ret

        conceptos = [d.descripcion for d in (c.detalles or [])]
        desglose_cobros.append({
            "cobro_id": c.id,
            "numero_recibo": c.numero_recibo,
            "fecha": c.fecha_emision.strftime("%Y-%m-%d %H:%M") if c.fecha_emision else "",
            "paciente": f"{c.paciente.nombres} {c.paciente.apellidos}" if c.paciente else "General",
            "concepto": ", ".join(conceptos) if conceptos else "Consulta Médica",
            "monto_cobro_usd": monto_c,
            "honorario_usd": hon,
            "retencion_clinica_usd": ret,
            "porcentaje_aplicado": pct,
        })

    # Aplicar deducciones
    deducciones = max(0.0, float(payload.monto_deducciones_usd or 0.0))
    neto_usd = max(0.0, total_honorarios - deducciones)

    tasa_bcv = await _get_tasa_bcv(db, current_user.empresa_id)
    neto_ves = round(neto_usd * tasa_bcv, 2)

    # 4. Generar correlativo de liquidación (Ej. LIQ-2026-00001)
    year = datetime.utcnow().year
    count_res = await db.execute(
        select(func.count(LiquidacionHonorario.id)).where(
            LiquidacionHonorario.empresa_id == current_user.empresa_id
        )
    )
    total_liq_empresa = count_res.scalar() or 0
    codigo = f"LIQ-{year}-{(total_liq_empresa + 1):05d}"

    # Parsear periodos
    try:
        dt_p_desde = datetime.strptime(payload.periodo_desde, "%Y-%m-%d")
    except Exception:
        dt_p_desde = datetime.utcnow()

    try:
        dt_p_hasta = datetime.strptime(payload.periodo_hasta, "%Y-%m-%d")
    except Exception:
        dt_p_hasta = datetime.utcnow()

    estado_liq = "pagado" if payload.marcar_como_pagado else "pendiente"
    fecha_pago_val = datetime.utcnow() if payload.marcar_como_pagado else None

    # 5. Crear registro de liquidación
    liquidacion = LiquidacionHonorario(
        empresa_id=current_user.empresa_id,
        sucursal_id=payload.sucursal_id or medico.sucursal_defecto_id,
        medico_id=medico.id,
        codigo_liquidacion=codigo,
        fecha_emision=datetime.utcnow(),
        periodo_desde=dt_p_desde,
        periodo_hasta=dt_p_hasta,
        total_cobros=len(cobros),
        monto_total_recaudado_usd=Decimal(str(round(total_recaudado, 2))),
        tipo_comision_aplicado=tipo_comision,
        porcentaje_aplicado=Decimal(str(porcentaje)),
        monto_fijo_aplicado=Decimal(str(monto_fijo)),
        monto_honorarios_usd=Decimal(str(round(total_honorarios, 2))),
        monto_retencion_clinica_usd=Decimal(str(round(total_retencion, 2))),
        monto_deducciones_usd=Decimal(str(round(deducciones, 2))),
        motivo_deduccion=payload.motivo_deduccion,
        monto_neto_pagar_usd=Decimal(str(round(neto_usd, 2))),
        monto_neto_pagar_ves=Decimal(str(round(neto_ves, 2))),
        tasa_bcv_aplicada=Decimal(str(round(tasa_bcv, 4))),
        estado=estado_liq,
        fecha_pago=fecha_pago_val,
        metodo_pago=payload.metodo_pago,
        referencia_pago=payload.referencia_pago,
        banco_origen=payload.banco_origen,
        banco_destino=payload.banco_destino,
        cobros_ids=[c.id for c in cobros],
        desglose_cobros=desglose_cobros,
        datos_bancarios_medico=medico.datos_bancarios or {},
        notas=payload.notas,
        creado_por_id=current_user.id,
        pagado_por_id=current_user.id if payload.marcar_como_pagado else None,
    )
    db.add(liquidacion)
    await db.flush()

    # 6. Vincular los cobros con la liquidación generada
    for c in cobros:
        c.liquidacion_id = liquidacion.id

    # 7. Registrar auditoría
    db.add(
        AuditoriaLog(
            empresa_id=current_user.empresa_id,
            usuario_id=current_user.id,
            accion="GENERAR_LIQUIDACION_HONORARIOS",
            modulo="honorarios",
            detalles={
                "liquidacion_id": liquidacion.id,
                "codigo": codigo,
                "medico_id": medico.id,
                "medico": f"{medico.nombres} {medico.apellidos}",
                "total_cobros": len(cobros),
                "monto_neto_usd": round(neto_usd, 2),
                "estado": estado_liq,
            },
        )
    )

    await db.commit()
    await db.refresh(liquidacion)
    return liquidacion


@router.get("/liquidaciones", response_model=LiquidacionesListResponse)
async def listar_liquidaciones(
    medico_id: Optional[int] = Query(None, description="Filtrar por médico"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal"),
    estado: Optional[str] = Query(None, description="pendiente, pagado, anulado"),
    search: Optional[str] = Query(None, description="Buscar por código o médico"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Lista el historial de liquidaciones de honorarios emitidas en la clínica
    con cálculo global de KPIs estadísticos.
    """
    query = (
        select(LiquidacionHonorario)
        .options(selectinload(LiquidacionHonorario.medico))
        .where(LiquidacionHonorario.empresa_id == current_user.empresa_id)
    )

    if medico_id:
        query = query.where(LiquidacionHonorario.medico_id == medico_id)
    if sucursal_id:
        query = query.where(LiquidacionHonorario.sucursal_id == sucursal_id)
    if estado:
        query = query.where(LiquidacionHonorario.estado == estado)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.join(LiquidacionHonorario.medico).where(
            or_(
                LiquidacionHonorario.codigo_liquidacion.ilike(term),
                Medico.nombres.ilike(term),
                Medico.apellidos.ilike(term),
                Medico.documento_identidad.ilike(term),
            )
        )

    # Contar total
    count_query = select(func.count()).select_from(query.subquery())
    total_count = (await db.execute(count_query)).scalar() or 0

    # Estadísticas globales de la clínica
    stats_query = select(
        func.sum(LiquidacionHonorario.monto_neto_pagar_usd).label("total_usd"),
        func.sum(
            case((LiquidacionHonorario.estado == "pagado", LiquidacionHonorario.monto_neto_pagar_usd), else_=0)
        ).label("pagado_usd"),
        func.sum(
            case((LiquidacionHonorario.estado == "pendiente", LiquidacionHonorario.monto_neto_pagar_usd), else_=0)
        ).label("pendiente_usd"),
        func.count(LiquidacionHonorario.id).label("total_registros"),
    ).where(
        LiquidacionHonorario.empresa_id == current_user.empresa_id,
        LiquidacionHonorario.estado != "anulado",
    )
    stats_res = (await db.execute(stats_query)).one_or_none()

    stats = {
        "total_liquidado_usd": float(stats_res.total_usd or 0.0) if stats_res else 0.0,
        "total_pagado_usd": float(stats_res.pagado_usd or 0.0) if stats_res else 0.0,
        "total_pendiente_usd": float(stats_res.pendiente_usd or 0.0) if stats_res else 0.0,
        "total_liquidaciones": int(stats_res.total_registros or 0) if stats_res else 0,
    }

    # Paginación
    offset = (page - 1) * page_size
    query = query.order_by(desc(LiquidacionHonorario.fecha_emision)).offset(offset).limit(page_size)

    items = (await db.execute(query)).scalars().all()

    return LiquidacionesListResponse(
        items=items,
        total=total_count,
        page=page,
        page_size=page_size,
        stats=stats,
    )


@router.get("/liquidaciones/{id}", response_model=LiquidacionHonorarioResponse)
async def obtener_detalle_liquidacion(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Obtiene el comprobante completo de liquidación con detalle de cada consulta y cobro liquidado.
    """
    q = (
        select(LiquidacionHonorario)
        .options(
            selectinload(LiquidacionHonorario.medico),
            selectinload(LiquidacionHonorario.sucursal),
            selectinload(LiquidacionHonorario.creado_por),
            selectinload(LiquidacionHonorario.pagado_por),
        )
        .where(LiquidacionHonorario.id == id)
    )
    if not current_user.es_superadmin:
        q = q.where(LiquidacionHonorario.empresa_id == current_user.empresa_id)

    res = await db.execute(q)
    liq = res.scalar_one_or_none()
    if not liq:
        raise HTTPException(status_code=404, detail="Liquidación de honorarios no encontrada")

    return liq


@router.post("/liquidaciones/{id}/pagar", response_model=LiquidacionHonorarioResponse)
async def registrar_pago_liquidacion(
    id: int,
    payload: PagarLiquidacionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Registra el desembolso o pago al especialista médico, cerrando el ciclo de honorarios.
    """
    q = select(LiquidacionHonorario).where(LiquidacionHonorario.id == id)
    if not current_user.es_superadmin:
        q = q.where(LiquidacionHonorario.empresa_id == current_user.empresa_id)

    res = await db.execute(q)
    liq = res.scalar_one_or_none()
    if not liq:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")

    if liq.estado == "pagado":
        raise HTTPException(status_code=400, detail="Esta liquidación ya fue registrada como pagada")
    if liq.estado == "anulado":
        raise HTTPException(status_code=400, detail="No se puede pagar una liquidación anulada")

    liq.estado = "pagado"
    liq.fecha_pago = datetime.utcnow()
    liq.metodo_pago = payload.metodo_pago
    liq.referencia_pago = payload.referencia_pago
    liq.banco_origen = payload.banco_origen
    liq.banco_destino = payload.banco_destino
    if payload.notas:
        liq.notas = f"{liq.notas or ''}\n[Pago]: {payload.notas}".strip()
    liq.pagado_por_id = current_user.id

    db.add(
        AuditoriaLog(
            empresa_id=current_user.empresa_id,
            usuario_id=current_user.id,
            accion="PAGAR_LIQUIDACION_HONORARIOS",
            modulo="honorarios",
            detalles={
                "liquidacion_id": liq.id,
                "codigo": liq.codigo_liquidacion,
                "monto_neto_usd": float(liq.monto_neto_pagar_usd),
                "metodo_pago": payload.metodo_pago,
                "referencia": payload.referencia_pago,
            },
        )
    )

    await db.commit()
    await db.refresh(liq)
    return liq


@router.post("/liquidaciones/{id}/anular", response_model=Dict[str, Any])
async def anular_liquidacion(
    id: int,
    motivo: Optional[str] = Query(None, description="Motivo de la anulación"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Anula una liquidación de honorarios y libera los recibos de cobro asociados
    para que puedan ser reliquidados en el futuro.
    """
    q = select(LiquidacionHonorario).where(LiquidacionHonorario.id == id)
    if not current_user.es_superadmin:
        q = q.where(LiquidacionHonorario.empresa_id == current_user.empresa_id)

    res = await db.execute(q)
    liq = res.scalar_one_or_none()
    if not liq:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")

    if liq.estado == "anulado":
        raise HTTPException(status_code=400, detail="La liquidación ya se encuentra anulada")

    # Liberar cobros
    if liq.cobros_ids:
        await db.execute(
            update(Cobro)
            .where(Cobro.id.in_(liq.cobros_ids))
            .values(liquidacion_id=None)
        )

    liq.estado = "anulado"
    if motivo:
        liq.notas = f"{liq.notas or ''}\n[Anulación]: {motivo}".strip()

    db.add(
        AuditoriaLog(
            empresa_id=current_user.empresa_id,
            usuario_id=current_user.id,
            accion="ANULAR_LIQUIDACION_HONORARIOS",
            modulo="honorarios",
            detalles={
                "liquidacion_id": liq.id,
                "codigo": liq.codigo_liquidacion,
                "motivo": motivo,
            },
        )
    )

    await db.commit()
    return {
        "success": True,
        "message": f"Liquidación {liq.codigo_liquidacion} anulada exitosamente. Los recibos han sido liberados.",
    }


@router.put("/medicos/{medico_id}/configuracion", response_model=Dict[str, Any])
async def actualizar_configuracion_comision_medico(
    medico_id: int,
    payload: ConfiguracionComisionMedicoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Actualiza la modalidad de comisión (% o monto fijo) y datos bancarios del especialista médico.
    """
    q = select(Medico).where(Medico.id == medico_id)
    if not current_user.es_superadmin:
        q = q.where(Medico.empresa_id == current_user.empresa_id)

    res = await db.execute(q)
    medico = res.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    medico.tipo_comision = payload.tipo_comision
    medico.porcentaje_honorario = Decimal(str(payload.porcentaje_honorario))
    medico.monto_fijo_honorario = Decimal(str(payload.monto_fijo_honorario))
    if payload.datos_bancarios is not None:
        medico.datos_bancarios = payload.datos_bancarios

    db.add(
        AuditoriaLog(
            empresa_id=current_user.empresa_id,
            usuario_id=current_user.id,
            accion="ACTUALIZAR_CONFIGURACION_COMISION_MEDICO",
            modulo="honorarios",
            detalles={
                "medico_id": medico.id,
                "tipo_comision": payload.tipo_comision,
                "porcentaje": payload.porcentaje_honorario,
                "monto_fijo": payload.monto_fijo_honorario,
            },
        )
    )

    await db.commit()
    return {
        "success": True,
        "message": f"Configuración de comisiones para el Dr(a). {medico.nombres} {medico.apellidos} actualizada con éxito.",
    }

