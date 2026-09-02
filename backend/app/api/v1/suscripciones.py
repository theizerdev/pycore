from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, require_superadmin, registrar_auditoria
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.plan import Plan
from app.models.suscripcion import Suscripcion, PagoSuscripcion
from app.schemas.suscripcion import (
    ReportarPagoRequest,
    PagoSuscripcionResponse,
    SuscripcionDetalleResponse,
    AprobarPagoRequest,
    RechazarPagoRequest
)

router = APIRouter(prefix="/suscripciones", tags=["Gestión de Suscripciones & Pagos SaaS"])

@router.post("/reportar-pago", response_model=PagoSuscripcionResponse, status_code=status.HTTP_201_CREATED)
async def reportar_pago(
    req: ReportarPagoRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Permite a una empresa registrar y reportar un pago (Transferencia, Pago Móvil, Comprobante)."""
    if not current_user.empresa_id:
        raise HTTPException(status_code=400, detail="El usuario no tiene una empresa asignada")

    stmt_emp = select(Empresa).where(Empresa.id == current_user.empresa_id)
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    plan = None
    if req.plan_id:
        stmt_plan = select(Plan).where(Plan.id == req.plan_id)
        res_plan = await db.execute(stmt_plan)
        plan = res_plan.scalar_one_or_none()

    if not plan:
        stmt_plan = select(Plan).where(Plan.activo == True).order_by(Plan.orden.asc()).limit(1)
        res_plan = await db.execute(stmt_plan)
        plan = res_plan.scalar_one_or_none()

    # Obtener última suscripción activa
    stmt_sub = select(Suscripcion).where(Suscripcion.empresa_id == empresa.id).order_by(Suscripcion.id.desc()).limit(1)
    res_sub = await db.execute(stmt_sub)
    sub = res_sub.scalar_one_or_none()

    # Calcular monto total según plan, meses y sucursales
    monto_calculado = plan.calcular_precio(req.ciclo_meses, req.sucursales_contratadas) if plan else 29.0

    pago = PagoSuscripcion(
        suscripcion_id=sub.id if sub else None,
        plan_id=plan.id if plan else None,
        empresa_id=empresa.id,
        usuario_id=current_user.id,
        monto=monto_calculado,
        ciclo_meses=req.ciclo_meses,
        sucursales_contratadas=req.sucursales_contratadas,
        metodo_pago=req.metodo_pago,
        referencia_pago=req.referencia_pago,
        comprobante_path=req.comprobante_base64,
        notas=req.notas,
        estado="pending"
    )

    db.add(pago)
    await db.commit()
    await db.refresh(pago)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="REPORTAR_PAGO_SUSCRIPCION",
        modulo="planes_billing",
        request=request,
        detalles={"pago_id": pago.id, "monto": monto_calculado, "metodo": req.metodo_pago}
    )

    return pago

@router.get("/mis-pagos", response_model=List[PagoSuscripcionResponse])
async def get_mis_pagos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Lista todos los pagos reportados por la empresa activa."""
    if not current_user.empresa_id:
        return []

    stmt = select(PagoSuscripcion).where(PagoSuscripcion.empresa_id == current_user.empresa_id).order_by(PagoSuscripcion.id.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/pagos-pendientes", response_model=List[PagoSuscripcionResponse])
async def list_pagos_pendientes(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Lista todos los pagos pendientes de revisión y aprobación por el SuperAdmin."""
    stmt = select(PagoSuscripcion).where(PagoSuscripcion.estado == "pending").order_by(PagoSuscripcion.id.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/pagos/{pago_id}/aprobar", response_model=PagoSuscripcionResponse)
async def aprobar_pago_suscripcion(
    pago_id: int,
    req: Optional[AprobarPagoRequest] = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Transacción de aprobación de pago: calcula la extensión de la fecha de vencimiento, activa el plan y eleva las sucursales."""
    stmt = select(PagoSuscripcion).where(PagoSuscripcion.id == pago_id)
    res = await db.execute(stmt)
    pago = res.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Registro de pago no encontrado")

    if pago.estado == "approved":
        raise HTTPException(status_code=400, detail="Este pago ya fue aprobado previamente")

    stmt_emp = select(Empresa).where(Empresa.id == pago.empresa_id)
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    plan = pago.plan
    if not plan and pago.plan_id:
        stmt_plan = select(Plan).where(Plan.id == pago.plan_id)
        res_plan = await db.execute(stmt_plan)
        plan = res_plan.scalar_one_or_none()

    # Calcular nueva fecha de vencimiento
    now = datetime.now()
    stmt_sub = select(Suscripcion).where(Suscripcion.empresa_id == empresa.id).order_by(Suscripcion.id.desc()).limit(1)
    res_sub = await db.execute(stmt_sub)
    latest_sub = res_sub.scalar_one_or_none()

    base_date = now
    if latest_sub and latest_sub.fecha_vencimiento and latest_sub.fecha_vencimiento > now and latest_sub.estado == "active":
        base_date = latest_sub.fecha_vencimiento

    meses = max(1, pago.ciclo_meses)
    nueva_fecha_vencimiento = base_date + timedelta(days=30 * meses)

    # Actualizar o Crear registro en la tabla Suscripcion
    if latest_sub:
        latest_sub.plan_id = plan.id if plan else latest_sub.plan_id
        latest_sub.nombre_plan = plan.nombre if plan else latest_sub.nombre_plan
        latest_sub.ciclo_meses = meses
        latest_sub.max_sucursales = max(empresa.max_sucursales or 1, pago.sucursales_contratadas)
        latest_sub.monto_total = pago.monto
        latest_sub.fecha_vencimiento = nueva_fecha_vencimiento
        latest_sub.estado = "active"
        sub_activa = latest_sub
    else:
        sub_activa = Suscripcion(
            empresa_id=empresa.id,
            plan_id=plan.id if plan else None,
            nombre_plan=plan.nombre if plan else "Plan Profesional",
            ciclo_meses=meses,
            max_sucursales=pago.sucursales_contratadas,
            monto_total=pago.monto,
            fecha_inicio=now,
            fecha_vencimiento=nueva_fecha_vencimiento,
            estado="active"
        )
        db.add(sub_activa)
        await db.flush()

    # Actualizar Empresa
    empresa.plan_id = plan.id if plan else empresa.plan_id
    empresa.plan_vencimiento = nueva_fecha_vencimiento
    empresa.plan_estado = "activo"
    empresa.max_sucursales = max(empresa.max_sucursales or 1, pago.sucursales_contratadas)

    # Marcar pago como Aprobado
    pago.suscripcion_id = sub_activa.id
    pago.estado = "approved"
    pago.aprobado_por_id = current_user.id
    pago.aprobado_at = now
    if req and req.notas:
        pago.notas = f"{pago.notas or ''} | Aprobado: {req.notas}"

    await db.commit()
    await db.refresh(pago)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="APROBAR_PAGO_SUSCRIPCION",
        modulo="planes_billing",
        request=request,
        detalles={"pago_id": pago.id, "empresa_id": empresa.id, "vencimiento": nueva_fecha_vencimiento.isoformat()}
    )

    return pago

@router.post("/pagos/{pago_id}/rechazar", response_model=PagoSuscripcionResponse)
async def rechazar_pago_suscripcion(
    pago_id: int,
    req: RechazarPagoRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Marca un pago reportado como rechazado por el SuperAdmin."""
    stmt = select(PagoSuscripcion).where(PagoSuscripcion.id == pago_id)
    res = await db.execute(stmt)
    pago = res.scalar_one_or_none()
    if not pago:
        raise HTTPException(status_code=404, detail="Registro de pago no encontrado")

    pago.estado = "rejected"
    pago.aprobado_por_id = current_user.id
    pago.aprobado_at = datetime.now()
    pago.notas = f"RECHAZADO: {req.notas}"

    await db.commit()
    await db.refresh(pago)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=pago.empresa_id,
        accion="RECHAZAR_PAGO_SUSCRIPCION",
        modulo="planes_billing",
        request=request,
        detalles={"pago_id": pago.id, "motivo": req.notas}
    )

    return pago


@router.get("/pendientes-count")
async def get_pagos_pendientes_count(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Retorna el conteo de pagos pendientes para alertar al SuperAdmin en la cabecera en tiempo real."""
    stmt = select(func.count(PagoSuscripcion.id)).where(PagoSuscripcion.estado == "pending")
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return {"pendientes_count": count, "hay_pendientes": count > 0}


@router.post("/notificar-vencimientos-proximos")
async def notificar_vencimientos_proximos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Busca empresas cuyo plan/prueba vence en exactamente 3 días y genera recordatorio automático de WhatsApp."""
    now = datetime.now()
    target_date_start = now + timedelta(days=2)
    target_date_end = now + timedelta(days=4)

    stmt = select(Empresa).where(
        Empresa.id != 1,
        Empresa.plan_vencimiento >= target_date_start,
        Empresa.plan_vencimiento <= target_date_end,
        Empresa.activo == True
    )
    res = await db.execute(stmt)
    empresas = res.scalars().all()

    notificados = []
    for emp in empresas:
        fecha_fmt = emp.plan_vencimiento.strftime("%d/%m/%Y") if emp.plan_vencimiento else "3 días"
        mensaje = (
            f"⚠️ *Recordatorio de Suscripción PyCore*\n\n"
            f"Estimado equipo de *{emp.nombre}*,\n\n"
            f"Le recordamos que su Plan de Suscripción / Período de Prueba vencerá en *3 días* (el *{fecha_fmt}*).\n\n"
            f"Para renovar su servicio y evitar interrupciones, ingrese a: /saas/suscripciones\n\n"
            f"¡Gracias por su confianza!"
        )

        phone = emp.telefono or getattr(emp, 'whatsapp_phone', None)
        if phone:
            from app.models.whatsapp import WhatsAppMessage
            msg_obj = WhatsAppMessage(
                empresa_id=emp.id,
                telefono_destino=phone,
                mensaje=mensaje,
                estado="sent",
                tipo="recordatorio_suscripcion"
            )
            db.add(msg_obj)
            notificados.append({"empresa_id": emp.id, "nombre": emp.nombre, "telefono": phone})

    await db.commit()
    return {
        "mensaje": f"Se procesaron {len(notificados)} recordatorio(s) de vencimiento a 3 días.",
        "notificados": notificados
    }


