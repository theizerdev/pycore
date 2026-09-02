from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, require_superadmin, registrar_auditoria
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.plan import Plan
from app.models.suscripcion import Suscripcion
from app.models.integracion import WhatsAppMessage
from app.services.exchange_rate_service import ExchangeRateService
from app.schemas.plan import (
    PlanCreate,
    PlanUpdate,
    PlanResponse,
    SuscripcionEmpresaResponse,
    MetodosPagoMasterResponse,
    SuscripcionMetricas,
    CambiarPlanRequest,
    AdminUpdateSuscripcionRequest
)

router = APIRouter(prefix="/planes", tags=["Planes & Suscripciones SaaS"])

@router.get("", response_model=List[PlanResponse])
async def list_planes(
    db: AsyncSession = Depends(get_db)
):
    """Lista todos los niveles de planes SaaS disponibles."""
    stmt = select(Plan).where(Plan.activo == True).order_by(Plan.precio_mensual.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    req: PlanCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Crea un nuevo nivel de plan SaaS (solo SuperAdmin)."""
    stmt = select(Plan).where(Plan.codigo == req.codigo)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Ya existe un plan con este código")

    plan = Plan(**req.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="CREAR_PLAN_SAAS",
        modulo="planes_billing",
        request=request,
        detalles={"plan_id": plan.id, "nombre": plan.nombre}
    )

    return plan

@router.put("/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: int,
    req: PlanUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Actualiza límites o características de un plan (solo SuperAdmin)."""
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(plan, field, val)

    await db.commit()
    await db.refresh(plan)
    return plan

@router.get("/mi-suscripcion", response_model=SuscripcionEmpresaResponse)
async def get_mi_suscripcion(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtiene el estado de la suscripción de la empresa activa y métricas de consumo de límites."""
    empresa_id_target = current_user.empresa_id
    if not empresa_id_target:
        stmt_first = select(Empresa.id).order_by(Empresa.id.asc()).limit(1)
        res_first = await db.execute(stmt_first)
        empresa_id_target = res_first.scalar()

    if not empresa_id_target:
        raise HTTPException(status_code=404, detail="No existe ninguna empresa configurada en el sistema")

    stmt = select(Empresa).where(Empresa.id == empresa_id_target)
    res = await db.execute(stmt)
    empresa = res.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # Contar consumo real de la empresa
    # 1. Usuarios activos
    stmt_usr = select(func.count(Usuario.id)).where(Usuario.empresa_id == empresa.id, Usuario.activo == True)
    res_usr = await db.execute(stmt_usr)
    usuarios_usados = res_usr.scalar() or 0

    # 2. Sucursales activas
    stmt_suc = select(func.count(Sucursal.id)).where(Sucursal.empresa_id == empresa.id, Sucursal.activo == True)
    res_suc = await db.execute(stmt_suc)
    sucursales_usadas = res_suc.scalar() or 0

    # 3. Mensajes de WhatsApp del mes actual
    now = datetime.now()
    first_day_month = datetime(now.year, now.month, 1)
    stmt_wa = select(func.count(WhatsAppMessage.id)).where(
        WhatsAppMessage.empresa_id == empresa.id,
        WhatsAppMessage.created_at >= first_day_month
    )
    res_wa = await db.execute(stmt_wa)
    mensajes_wa_mes = res_wa.scalar() or 0

    # Plan de la empresa
    plan = empresa.plan
    max_usr = plan.max_usuarios if plan else 3
    max_suc = plan.max_sucursales if plan else 1
    max_wa = plan.max_mensajes_whatsapp if plan else 100

    usr_pct = min(100.0, round((usuarios_usados / max_usr) * 100, 1)) if max_usr > 0 else 0.0
    suc_pct = min(100.0, round((sucursales_usadas / max_suc) * 100, 1)) if max_suc > 0 else 0.0
    wa_pct = min(100.0, round((mensajes_wa_mes / max_wa) * 100, 1)) if max_wa > 0 else 0.0

    metricas = SuscripcionMetricas(
        usuarios_usados=usuarios_usados,
        max_usuarios=max_usr,
        usuarios_porcentaje=usr_pct,
        sucursales_usadas=sucursales_usadas,
        max_sucursales=max_suc,
        sucursales_porcentaje=suc_pct,
        mensajes_whatsapp_mes=mensajes_wa_mes,
        max_mensajes_whatsapp=max_wa,
        whatsapp_porcentaje=wa_pct
    )

    modulos_permitidos = plan.modulos_permitidos if (plan and plan.modulos_permitidos) else [
        "dashboard", "pacientes", "citas", "recetas", "whatsapp", "tasas"
    ]

    # Obtener fecha_inicio real de la última suscripción
    stmt_sub = select(Suscripcion.fecha_inicio).where(Suscripcion.empresa_id == empresa.id).order_by(Suscripcion.id.desc()).limit(1)
    res_sub = await db.execute(stmt_sub)
    fecha_inicio = res_sub.scalar_one_or_none() or empresa.created_at

    # Obtener datos bancarios de Empresa 1 (Master SaaS Owner)
    stmt_emp1 = select(Empresa).where(Empresa.id == 1)
    res_emp1 = await db.execute(stmt_emp1)
    emp1 = res_emp1.scalar_one_or_none()

    metodos_master = MetodosPagoMasterResponse(
        banco_nombre=getattr(emp1, 'banco_nombre', None),
        banco_tipo_cuenta=getattr(emp1, 'banco_tipo_cuenta', None),
        banco_numero_cuenta=getattr(emp1, 'banco_numero_cuenta', None),
        banco_titular=getattr(emp1, 'banco_titular', None),
        banco_doc_identidad=getattr(emp1, 'banco_doc_identidad', None),
        pagomovil_banco=getattr(emp1, 'pagomovil_banco', None),
        pagomovil_telefono=getattr(emp1, 'pagomovil_telefono', None),
        pagomovil_doc_identidad=getattr(emp1, 'pagomovil_doc_identidad', None),
    ) if emp1 else None

    # Tasa del BCV Euro
    tasa_eur_data = await ExchangeRateService.fetch_eur_bcv()
    tasa_bcv_eur = tasa_eur_data.get("tasa") if (tasa_eur_data and tasa_eur_data.get("tasa")) else 926.553

    return SuscripcionEmpresaResponse(
        empresa_id=empresa.id,
        empresa_nombre=empresa.nombre,
        plan_activo=PlanResponse.model_validate(plan) if plan else None,
        plan_estado=empresa.plan_estado or "activo",
        fecha_inicio=fecha_inicio,
        plan_vencimiento=empresa.plan_vencimiento,
        metricas=metricas,
        modulos_permitidos=modulos_permitidos,
        metodos_pago_master=metodos_master,
        tasa_bcv_eur=tasa_bcv_eur
    )

@router.post("/cambiar-plan", response_model=SuscripcionEmpresaResponse)
async def cambiar_plan_empresa(
    req: CambiarPlanRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("empresas.editar"))
):
    """Actualiza o cambia el plan de suscripción de la empresa del usuario."""
    empresa_id_target = current_user.empresa_id
    if not empresa_id_target:
        stmt_first = select(Empresa.id).order_by(Empresa.id.asc()).limit(1)
        res_first = await db.execute(stmt_first)
        empresa_id_target = res_first.scalar()

    if not empresa_id_target:
        raise HTTPException(status_code=404, detail="No existe ninguna empresa configurada en el sistema")

    stmt_emp = select(Empresa).where(Empresa.id == empresa_id_target)
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    stmt_plan = select(Plan).where(Plan.id == req.plan_id, Plan.activo == True)
    res_plan = await db.execute(stmt_plan)
    nuevo_plan = res_plan.scalar_one_or_none()
    if not nuevo_plan:
        raise HTTPException(status_code=404, detail="Plan seleccionado no existe o no está activo")

    empresa.plan_id = nuevo_plan.id
    empresa.plan_estado = "activo"
    days_to_add = 365 if req.ciclo == "anual" else 30
    empresa.plan_vencimiento = datetime.now() + timedelta(days=days_to_add)

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CAMBIAR_PLAN_SAAS",
        modulo="planes_billing",
        request=request,
        detalles={"nuevo_plan_id": nuevo_plan.id, "nombre": nuevo_plan.nombre, "ciclo": req.ciclo}
    )

    return await get_mi_suscripcion(db=db, current_user=current_user)

@router.get("/todas-suscripciones", response_model=List[SuscripcionEmpresaResponse])
async def list_todas_suscripciones(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Obtiene el listado global de suscripciones de TODAS las empresas del sistema con sus métricas (solo SuperAdmin)."""
    stmt = select(Empresa).order_by(Empresa.id.asc())
    res = await db.execute(stmt)
    empresas = res.scalars().all()

    now = datetime.now()
    first_day_month = datetime(now.year, now.month, 1)

    suscripciones_list = []
    for emp in empresas:
        # 1. Usuarios activos
        stmt_usr = select(func.count(Usuario.id)).where(Usuario.empresa_id == emp.id, Usuario.activo == True)
        res_usr = await db.execute(stmt_usr)
        usuarios_usados = res_usr.scalar() or 0

        # 2. Sucursales activas
        stmt_suc = select(func.count(Sucursal.id)).where(Sucursal.empresa_id == emp.id, Sucursal.activo == True)
        res_suc = await db.execute(stmt_suc)
        sucursales_usadas = res_suc.scalar() or 0

        # 3. Mensajes de WhatsApp del mes
        stmt_wa = select(func.count(WhatsAppMessage.id)).where(
            WhatsAppMessage.empresa_id == emp.id,
            WhatsAppMessage.created_at >= first_day_month
        )
        res_wa = await db.execute(stmt_wa)
        mensajes_wa_mes = res_wa.scalar() or 0

        plan = emp.plan
        max_usr = plan.max_usuarios if plan else 3
        max_suc = plan.max_sucursales if plan else 1
        max_wa = plan.max_mensajes_whatsapp if plan else 100

        usr_pct = min(100.0, round((usuarios_usados / max_usr) * 100, 1)) if max_usr > 0 else 0.0
        suc_pct = min(100.0, round((sucursales_usadas / max_suc) * 100, 1)) if max_suc > 0 else 0.0
        wa_pct = min(100.0, round((mensajes_wa_mes / max_wa) * 100, 1)) if max_wa > 0 else 0.0

        metricas = SuscripcionMetricas(
            usuarios_usados=usuarios_usados,
            max_usuarios=max_usr,
            usuarios_porcentaje=usr_pct,
            sucursales_usadas=sucursales_usadas,
            max_sucursales=max_suc,
            sucursales_porcentaje=suc_pct,
            mensajes_whatsapp_mes=mensajes_wa_mes,
            max_mensajes_whatsapp=max_wa,
            whatsapp_porcentaje=wa_pct
        )

        modulos = plan.modulos_permitidos if (plan and plan.modulos_permitidos) else [
            "dashboard", "pacientes", "citas", "recetas", "whatsapp", "tasas"
        ]

        suscripciones_list.append(
            SuscripcionEmpresaResponse(
                empresa_id=emp.id,
                empresa_nombre=emp.nombre,
                plan_activo=PlanResponse.model_validate(plan) if plan else None,
                plan_estado=emp.plan_estado or "activo",
                plan_vencimiento=emp.plan_vencimiento,
                metricas=metricas,
                modulos_permitidos=modulos
            )
        )

    return suscripciones_list

@router.put("/empresas/{empresa_id}/suscripcion", response_model=SuscripcionEmpresaResponse)
async def admin_update_empresa_suscripcion(
    empresa_id: int,
    req: AdminUpdateSuscripcionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    """Permite al SuperAdmin modificar manualmente el plan, estatus o fecha de vencimiento de cualquier empresa."""
    stmt_emp = select(Empresa).where(Empresa.id == empresa_id)
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if req.plan_id is not None:
        stmt_plan = select(Plan).where(Plan.id == req.plan_id)
        res_plan = await db.execute(stmt_plan)
        nuevo_plan = res_plan.scalar_one_or_none()
        if not nuevo_plan:
            raise HTTPException(status_code=404, detail="Plan no encontrado")
        empresa.plan_id = nuevo_plan.id

    if req.plan_estado is not None:
        empresa.plan_estado = req.plan_estado

    if req.plan_vencimiento is not None:
        empresa.plan_vencimiento = req.plan_vencimiento

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="ADMIN_EDITAR_SUSCRIPCION",
        modulo="planes_billing",
        request=request,
        detalles={"empresa_id": empresa.id, "plan_id": empresa.plan_id, "estado": empresa.plan_estado}
    )

    # Retornar suscripción armada
    dummy_user = Usuario(id=current_user.id, empresa_id=empresa.id, es_superadmin=True)
    return await get_mi_suscripcion(db=db, current_user=dummy_user)

@router.patch("/{plan_id}/toggle-status", response_model=PlanResponse)
async def toggle_plan_status(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    plan.activo = not plan.activo
    await db.commit()
    await db.refresh(plan)
    return plan

@router.patch("/{plan_id}/toggle-promo", response_model=PlanResponse)
async def toggle_plan_promo(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    plan.tiene_promocion = not plan.tiene_promocion
    await db.commit()
    await db.refresh(plan)
    return plan

@router.patch("/{plan_id}/toggle-destacado", response_model=PlanResponse)
async def toggle_plan_destacado(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    plan.destacado = not plan.destacado
    await db.commit()
    await db.refresh(plan)
    return plan

@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_superadmin)
):
    stmt = select(Plan).where(Plan.id == plan_id)
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    stmt_emp = select(func.count(Empresa.id)).where(Empresa.plan_id == plan_id)
    res_emp = await db.execute(stmt_emp)
    emp_count = res_emp.scalar() or 0

    if emp_count > 0:
        plan.activo = False
        await db.commit()
        return {"detail": "El plan tiene empresas asociadas y ha sido desactivado en lugar de eliminarse."}

    await db.delete(plan)
    await db.commit()
    return {"detail": "Plan eliminado correctamente."}

