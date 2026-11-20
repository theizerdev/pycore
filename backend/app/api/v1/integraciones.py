import secrets
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.paciente import Paciente
from app.models.medico import Medico
from app.models.integracion import WhatsAppTemplate, WhatsAppMessage
from app.schemas.integracion import (
    IntegracionesConfigResponse,
    UpdateMapsRequest,
    UpdatePagosRequest,
    UpdateWhatsAppServerRequest,
    AntiBanUpdateRequest,
    WhatsAppPairPhoneRequest,
    WhatsAppQueueToggleRequest,
    WhatsAppInstanceSummary,
    CheckNumberRequest,
    CheckNumberResponse,
    PreviewSpintaxRequest,
    PreviewSpintaxResponse,
    WhatsAppQueueStatsResponse,
    WhatsAppDiagnosticResponse,
    BroadcastRecipientItem,
    BroadcastDispatchRequest,
    WhatsAppStatusResponse,
    WhatsAppSendTestRequest,
    WhatsAppTemplateCreate,
    WhatsAppTemplateUpdate,
    WhatsAppTemplateResponse,
    WhatsAppMessageResponse,
    BcvRateResponse,
    TasaCambioManualRequest,
    SetMonedaCobroRequest,
    TasasActualesResponse,
    TasaHistoricoItem,
    UpdateJitsiRequest,
    JitsiDiagnosticResponse,
    JitsiSessionRequest,
    JitsiSessionResponse,
    JitsiGenerateSecretResponse,
)
from app.services.bcv_service import BcvRateService
from app.services.whatsapp_service import WhatsAppService
from app.services.whatsapp_python_engine import (
    whatsapp_engine,
    compute_warmup_limit,
    is_within_working_hours,
    calculate_safety_score,
    format_phone_number,
)
from app.services.whatsapp_resolver import (
    get_whatsapp_target,
    resolve_whatsapp_service,
    get_empresa_codigo_pais_resolver,
    build_service_from_entity,
)
from app.services.exchange_rate_service import ExchangeRateService
from app.services.jitsi_service import JitsiService
from app.services.plan_quota_service import PlanQuotaService
from app.core.security import registrar_auditoria

router = APIRouter(prefix="/integraciones", tags=["Integraciones"])


# ── 1. CONFIGURACIÓN GENERAL DE INTEGRACIONES ───────────────────────────
@router.get("", response_model=IntegracionesConfigResponse)
async def get_integraciones_config(
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal para consultar su configuración de WhatsApp"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)

    # Determinar si la sucursal está usando fallback de la empresa
    using_fallback = False
    if es_sucursal:
        if not getattr(target, 'whatsapp_connected', False) and getattr(empresa, 'whatsapp_connected', False):
            using_fallback = True

    wa_active = getattr(target, 'whatsapp_active', False)
    wa_api_url = "python://local"
    wa_api_key = getattr(target, 'whatsapp_api_key', None) or getattr(empresa, 'whatsapp_api_key', None)
    wa_instance = getattr(target, 'whatsapp_instance', None) or (f"sucursal_{empresa.id}_{target.id}" if es_sucursal else f"empresa_{empresa.id}")
    live_st = whatsapp_engine.get_status(wa_instance)
    wa_connected = bool(live_st.get("is_connected"))
    wa_status = str(live_st.get("connection_state", "DISCONNECTED")).lower()
    wa_phone = live_st.get("phone_number") or getattr(target, 'whatsapp_phone', None)
    wa_rate_limit = getattr(target, 'whatsapp_rate_limit', 200) or 200
    wa_hourly_limit = getattr(target, 'whatsapp_hourly_limit', 25) or 25
    wa_warmup = getattr(target, 'whatsapp_warmup_mode', True)
    wa_wh_enabled = getattr(target, 'whatsapp_working_hours_enabled', True)
    wa_wh_start = getattr(target, 'whatsapp_working_hours_start', "08:00") or "08:00"
    wa_wh_end = getattr(target, 'whatsapp_working_hours_end', "20:00") or "20:00"
    wa_sim_typing = getattr(target, 'whatsapp_simulate_typing', True)
    wa_typing_min = getattr(target, 'whatsapp_typing_min_sec', 2.0) or 2.0
    wa_typing_max = getattr(target, 'whatsapp_typing_max_sec', 6.0) or 6.0
    wa_delay_min = getattr(target, 'whatsapp_delay_min_sec', 8) or 8
    wa_delay_max = getattr(target, 'whatsapp_delay_max_sec', 20) or 20
    wa_batch_size = getattr(target, 'whatsapp_batch_size', 10) or 10
    wa_batch_pause = getattr(target, 'whatsapp_batch_pause_sec', 60) or 60
    wa_verify_num = getattr(target, 'whatsapp_verify_number', True)
    wa_queue_paused = bool(live_st.get("queue_paused")) or bool(getattr(target, 'whatsapp_queue_paused', False))
    wa_proxy = getattr(target, 'whatsapp_proxy_url', None)

    return IntegracionesConfigResponse(
        maptiler_api_key=getattr(empresa, 'maptiler_api_key', None),
        maptiler_active=getattr(empresa, 'maptiler_active', True),
        mapbox_api_key=getattr(empresa, 'mapbox_api_key', None),
        mapbox_active=getattr(empresa, 'mapbox_active', False),
        google_maps_api_key=getattr(empresa, 'google_maps_api_key', None),
        google_maps_active=getattr(empresa, 'google_maps_active', False),
        whatsapp_active=wa_active,
        whatsapp_api_url=wa_api_url,
        whatsapp_api_key=wa_api_key,
        whatsapp_instance=wa_instance,
        whatsapp_connected=wa_connected,
        whatsapp_phone=wa_phone,
        whatsapp_status=wa_status,
        whatsapp_rate_limit=wa_rate_limit,
        whatsapp_hourly_limit=wa_hourly_limit,
        whatsapp_warmup_mode=wa_warmup if wa_warmup is not None else True,
        whatsapp_working_hours_enabled=wa_wh_enabled if wa_wh_enabled is not None else True,
        whatsapp_working_hours_start=wa_wh_start,
        whatsapp_working_hours_end=wa_wh_end,
        whatsapp_simulate_typing=wa_sim_typing if wa_sim_typing is not None else True,
        whatsapp_typing_min_sec=float(wa_typing_min),
        whatsapp_typing_max_sec=float(wa_typing_max),
        whatsapp_delay_min_sec=int(wa_delay_min),
        whatsapp_delay_max_sec=int(wa_delay_max),
        whatsapp_batch_size=int(wa_batch_size),
        whatsapp_batch_pause_sec=int(wa_batch_pause),
        whatsapp_verify_number=wa_verify_num if wa_verify_num is not None else True,
        whatsapp_queue_paused=wa_queue_paused,
        whatsapp_proxy_url=wa_proxy,
        is_sucursal=es_sucursal,
        sucursal_id=target.id if es_sucursal else None,
        sucursal_nombre=target.nombre if es_sucursal else None,
        using_fallback=using_fallback,
        paypal_active=getattr(empresa, 'paypal_active', False),
        paypal_mode=getattr(empresa, 'paypal_mode', "sandbox") or "sandbox",
        paypal_client_id=getattr(empresa, 'paypal_client_id', None),
        paypal_client_secret=getattr(empresa, 'paypal_client_secret', None),
        stripe_active=getattr(empresa, 'stripe_active', False),
        stripe_mode=getattr(empresa, 'stripe_mode', "test") or "test",
        stripe_publishable_key=getattr(empresa, 'stripe_publishable_key', None),
        stripe_secret_key=getattr(empresa, 'stripe_secret_key', None),
        stripe_webhook_secret=getattr(empresa, 'stripe_webhook_secret', None),
        mercadopago_active=getattr(empresa, 'mercadopago_active', False),
        mercadopago_mode=getattr(empresa, 'mercadopago_mode', "sandbox") or "sandbox",
        mercadopago_public_key=getattr(empresa, 'mercadopago_public_key', None),
        mercadopago_access_token=getattr(empresa, 'mercadopago_access_token', None),
        jitsi_active=getattr(empresa, 'jitsi_active', True) if getattr(empresa, 'jitsi_active', None) is not None else True,
        jitsi_provider=getattr(empresa, 'jitsi_provider', "public") or "public",
        jitsi_domain=getattr(empresa, 'jitsi_domain', "meet.jit.si") or "meet.jit.si",
        jitsi_app_id=getattr(empresa, 'jitsi_app_id', None),
        jitsi_jwt_secret=getattr(empresa, 'jitsi_jwt_secret', None),
        jitsi_key_id=getattr(empresa, 'jitsi_key_id', None),
        jitsi_room_prefix=getattr(empresa, 'jitsi_room_prefix', "medisoft") or "medisoft",
        jitsi_lobby_enabled=getattr(empresa, 'jitsi_lobby_enabled', True) if getattr(empresa, 'jitsi_lobby_enabled', None) is not None else True,
        jitsi_recording_enabled=bool(getattr(empresa, 'jitsi_recording_enabled', False)),
        jitsi_e2ee_enabled=bool(getattr(empresa, 'jitsi_e2ee_enabled', False)),
        telemedicina_requiere_pago=getattr(empresa, 'telemedicina_requiere_pago', True) if getattr(empresa, 'telemedicina_requiere_pago', None) is not None else True,
        telemedicina_consentimiento_texto=getattr(empresa, 'telemedicina_consentimiento_texto', None),
    )


# ── 2. ACTUALIZAR PROVEEDOR DE MAPAS ───────────────────────────────────
@router.put("/maps", response_model=IntegracionesConfigResponse)
async def update_maps_config(
    req: UpdateMapsRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    empresa.maptiler_api_key = req.maptiler_api_key
    empresa.maptiler_active = req.maptiler_active
    empresa.mapbox_api_key = req.mapbox_api_key
    empresa.mapbox_active = req.mapbox_active
    empresa.google_maps_api_key = req.google_maps_api_key
    empresa.google_maps_active = req.google_maps_active

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CONFIGURAR_MAPAS",
        modulo="integraciones",
        request=request,
        detalles={"mapbox_active": req.mapbox_active, "google_maps_active": req.google_maps_active}
    )

    return await get_integraciones_config(current_user=current_user, db=db)


# ── 3. ACTUALIZAR PASARELAS DE PAGO ────────────────────────────────────
@router.put("/pagos", response_model=IntegracionesConfigResponse)
async def update_pagos_config(
    req: UpdatePagosRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    empresa.paypal_active = req.paypal_active
    empresa.paypal_mode = req.paypal_mode
    empresa.paypal_client_id = req.paypal_client_id
    empresa.paypal_client_secret = req.paypal_client_secret

    empresa.stripe_active = req.stripe_active
    empresa.stripe_mode = req.stripe_mode
    empresa.stripe_publishable_key = req.stripe_publishable_key
    empresa.stripe_secret_key = req.stripe_secret_key
    empresa.stripe_webhook_secret = req.stripe_webhook_secret

    empresa.mercadopago_active = req.mercadopago_active
    empresa.mercadopago_mode = req.mercadopago_mode
    empresa.mercadopago_public_key = req.mercadopago_public_key
    empresa.mercadopago_access_token = req.mercadopago_access_token

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CONFIGURAR_PAGOS",
        modulo="integraciones",
        request=request,
        detalles={"stripe_active": req.stripe_active, "paypal_active": req.paypal_active, "mercadopago_active": req.mercadopago_active}
    )

    return await get_integraciones_config(current_user=current_user, db=db)


# ── 4. TASA OFICIAL BCV ────────────────────────────────────────────────
@router.get("/bcv", response_model=BcvRateResponse)
async def get_bcv_rate(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    bcv_service = BcvRateService(db=db)
    empresa_id = current_user.empresa_id or 1
    return await bcv_service.fetch_official_rate(empresa_id=empresa_id)


# ── 5. WHATSAPP NATIVO PYTHON (NEONIZE): INSTANCIAS, QR & ANTI-BANEO ────
def _extract_antiban_params(target: Any) -> Dict[str, Any]:
    return {
        "dailyLimit": int(getattr(target, "whatsapp_rate_limit", None) or 200),
        "hourlyLimit": int(getattr(target, "whatsapp_hourly_limit", None) or 25),
        "warmupMode": (
            bool(getattr(target, "whatsapp_warmup_mode", True))
            if getattr(target, "whatsapp_warmup_mode", None) is not None
            else True
        ),
        "workingHoursEnabled": (
            bool(getattr(target, "whatsapp_working_hours_enabled", True))
            if getattr(target, "whatsapp_working_hours_enabled", None) is not None
            else True
        ),
        "workingHoursStart": getattr(target, "whatsapp_working_hours_start", None) or "08:00",
        "workingHoursEnd": getattr(target, "whatsapp_working_hours_end", None) or "20:00",
        "simulateTyping": (
            bool(getattr(target, "whatsapp_simulate_typing", True))
            if getattr(target, "whatsapp_simulate_typing", None) is not None
            else True
        ),
        "typingMinSec": float(getattr(target, "whatsapp_typing_min_sec", None) or 2.0),
        "typingMaxSec": float(getattr(target, "whatsapp_typing_max_sec", None) or 6.0),
        "delayMinSec": int(getattr(target, "whatsapp_delay_min_sec", None) or 8),
        "delayMaxSec": int(getattr(target, "whatsapp_delay_max_sec", None) or 20),
        "batchSize": int(getattr(target, "whatsapp_batch_size", None) or 10),
        "batchPauseSec": int(getattr(target, "whatsapp_batch_pause_sec", None) or 60),
        "verifyNumber": (
            bool(getattr(target, "whatsapp_verify_number", True))
            if getattr(target, "whatsapp_verify_number", None) is not None
            else True
        ),
        "proxyUrl": getattr(target, "whatsapp_proxy_url", None),
    }


async def _get_instance_counts(
    db: AsyncSession, empresa_id: int, sucursal_id: Optional[int]
) -> tuple[int, int, int]:
    """Retorna (sent_today, sent_last_hour, queued_count) para la instancia."""
    today_start = datetime.combine(date.today(), datetime.min.time())
    hour_ago = datetime.now() - timedelta(hours=1)

    def _scope(q):
        if sucursal_id is not None:
            return q.where(WhatsAppMessage.sucursal_id == sucursal_id)
        return q.where(WhatsAppMessage.sucursal_id.is_(None))

    q_today = _scope(
        select(func.count(WhatsAppMessage.id)).where(
            WhatsAppMessage.empresa_id == empresa_id,
            WhatsAppMessage.direction == "outbound",
            WhatsAppMessage.status.in_(["sent", "delivered", "read"]),
            WhatsAppMessage.sent_at >= today_start,
        )
    )
    q_hour = _scope(
        select(func.count(WhatsAppMessage.id)).where(
            WhatsAppMessage.empresa_id == empresa_id,
            WhatsAppMessage.direction == "outbound",
            WhatsAppMessage.status.in_(["sent", "delivered", "read"]),
            WhatsAppMessage.sent_at >= hour_ago,
        )
    )
    q_queued = _scope(
        select(func.count(WhatsAppMessage.id)).where(
            WhatsAppMessage.empresa_id == empresa_id,
            WhatsAppMessage.direction == "outbound",
            WhatsAppMessage.status.in_(["pending", "queued", "sending"]),
        )
    )
    sent_today = int((await db.execute(q_today)).scalar() or 0)
    sent_hour = int((await db.execute(q_hour)).scalar() or 0)
    queued = int((await db.execute(q_queued)).scalar() or 0)
    return sent_today, sent_hour, queued


@router.get("/whatsapp/instances", response_model=List[WhatsAppInstanceSummary])
async def list_whatsapp_instances(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas las instancias de WhatsApp de la empresa (Principal + Sucursales) con telemetría en vivo."""
    empresa_id = current_user.empresa_id or 1
    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    sucursales = (
        await db.execute(
            select(Sucursal)
            .where(Sucursal.empresa_id == empresa_id, Sucursal.activo == True)
            .order_by(Sucursal.id.asc())
        )
    ).scalars().all()

    items: List[WhatsAppInstanceSummary] = []

    async def _build_summary(entity: Any, is_suc: bool) -> WhatsAppInstanceSummary:
        inst_name = entity.whatsapp_instance or (
            f"sucursal_{empresa_id}_{entity.id}" if is_suc else f"empresa_{entity.id}"
        )
        live = whatsapp_engine.get_status(inst_name)
        params = _extract_antiban_params(entity)
        sent_today, sent_hour, queued = await _get_instance_counts(
            db, empresa_id, entity.id if is_suc else None
        )
        sent_hour = max(sent_hour, whatsapp_engine.get_hourly_count(inst_name))
        connected_at = getattr(entity, "whatsapp_connected_at", None)
        eff_daily, warmup_day = compute_warmup_limit(
            connected_at, params["dailyLimit"], params["warmupMode"]
        )
        score, _ = calculate_safety_score(
            simulate_typing=params["simulateTyping"],
            warmup_mode=params["warmupMode"],
            working_hours_enabled=params["workingHoursEnabled"],
            verify_number=params["verifyNumber"],
            delay_min_sec=params["delayMinSec"],
            delay_max_sec=params["delayMaxSec"],
            daily_limit=params["dailyLimit"],
            hourly_limit=params["hourlyLimit"],
            batch_size=params["batchSize"],
            batch_pause_sec=params["batchPauseSec"],
        )
        paused = bool(live.get("queue_paused")) or bool(getattr(entity, "whatsapp_queue_paused", False))
        return WhatsAppInstanceSummary(
            instance_name=inst_name,
            label=entity.nombre if is_suc else f"{entity.nombre} (Principal)",
            is_sucursal=is_suc,
            sucursal_id=entity.id if is_suc else None,
            connection_state=live.get("connection_state", "DISCONNECTED"),
            is_connected=bool(live.get("is_connected")),
            phone_number=live.get("phone_number") or getattr(entity, "whatsapp_phone", None),
            push_name=live.get("push_name"),
            sent_today=sent_today,
            effective_daily_limit=eff_daily,
            daily_limit=params["dailyLimit"],
            sent_this_hour=sent_hour,
            hourly_limit=params["hourlyLimit"],
            queued=queued,
            warmup_mode=params["warmupMode"],
            warmup_day=warmup_day,
            queue_paused=paused,
            pause_reason=live.get("pause_reason"),
            currently_typing_to=live.get("currently_typing_to"),
            safety_score=score,
            has_saved_session=bool(live.get("has_saved_session")),
        )

    items.append(await _build_summary(empresa, False))
    for suc in sucursales:
        items.append(await _build_summary(suc, True))

    return items


@router.get("/whatsapp/status", response_model=WhatsAppStatusResponse)
async def get_whatsapp_status(
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )

    wa_service = build_service_from_entity(target, instance_name, empresa_id, cod_pais)
    status_data = await wa_service.get_status(
        db_status=target.whatsapp_status,
        db_phone=target.whatsapp_phone,
        db_connected=target.whatsapp_connected,
    )

    # Sincronizar estado real del motor Python en BD
    if status_data.get("is_connected"):
        if not target.whatsapp_connected or target.whatsapp_status != "connected":
            target.whatsapp_connected = True
            target.whatsapp_status = "connected"
            if status_data.get("phone_number"):
                target.whatsapp_phone = status_data.get("phone_number")
            if not getattr(target, "whatsapp_connected_at", None):
                target.whatsapp_connected_at = datetime.now()
            await db.commit()
    elif status_data.get("connection_state") == "QR_READY":
        if target.whatsapp_status != "qr_ready":
            target.whatsapp_status = "qr_ready"
            target.whatsapp_connected = False
            await db.commit()
    elif status_data.get("connection_state") == "DISCONNECTED":
        if target.whatsapp_connected:
            target.whatsapp_connected = False
            target.whatsapp_status = "disconnected"
            await db.commit()

    emp_live = whatsapp_engine.get_status(
        (empresa.whatsapp_instance or f"empresa_{empresa.id}") if empresa else f"empresa_{empresa_id}"
    )
    using_fallback = bool(
        es_sucursal and not status_data.get("is_connected") and emp_live.get("is_connected")
    )

    return WhatsAppStatusResponse(
        **status_data,
        is_sucursal=es_sucursal,
        sucursal_id=target.id if es_sucursal else None,
        sucursal_nombre=target.nombre if es_sucursal else None,
        using_fallback=using_fallback,
    )


@router.post("/whatsapp/connect", response_model=WhatsAppStatusResponse)
async def connect_whatsapp(
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )
    target.whatsapp_instance = instance_name
    target.whatsapp_api_url = "python://local"

    wa_service = build_service_from_entity(target, instance_name, empresa_id, cod_pais)
    res = await wa_service.connect_instance()

    target.whatsapp_active = True
    target.whatsapp_status = res.get("connection_state", "QR_READY").lower()
    target.whatsapp_connected = bool(res.get("is_connected", False))
    if res.get("phone_number"):
        target.whatsapp_phone = res.get("phone_number")
    if target.whatsapp_connected and not getattr(target, "whatsapp_connected_at", None):
        target.whatsapp_connected_at = datetime.now()
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="CONECTAR_WHATSAPP_PYTHON",
        modulo="integraciones",
        request=request,
        detalles={
            "instance_name": instance_name,
            "sucursal_id": target.id if es_sucursal else None,
            "connection_state": res.get("connection_state"),
        },
    )

    return WhatsAppStatusResponse(
        **res,
        is_sucursal=es_sucursal,
        sucursal_id=target.id if es_sucursal else None,
        sucursal_nombre=target.nombre if es_sucursal else None,
        using_fallback=False,
    )


@router.post("/whatsapp/pair-phone")
async def pair_whatsapp_by_phone(
    req: WhatsAppPairPhoneRequest,
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Genera un código numérico de 8 dígitos para vincular WhatsApp sin usar cámara."""
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )
    target.whatsapp_instance = instance_name
    target.whatsapp_active = True
    await db.commit()

    wa_service = build_service_from_entity(target, instance_name, empresa_id, cod_pais)
    res = await wa_service.pair_phone(req.phone)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error") or "No se pudo generar el código de emparejamiento")
    return res


@router.post("/whatsapp/reconnect", response_model=WhatsAppStatusResponse)
async def reconnect_whatsapp(
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )

    wa_service = build_service_from_entity(target, instance_name, empresa_id, cod_pais)
    await wa_service.disconnect_instance(clear_session=True)
    res = await wa_service.connect_instance()

    target.whatsapp_status = res.get("connection_state", "QR_READY").lower()
    target.whatsapp_connected = bool(res.get("is_connected", False))
    await db.commit()

    return WhatsAppStatusResponse(
        **res,
        is_sucursal=es_sucursal,
        sucursal_id=target.id if es_sucursal else None,
        sucursal_nombre=target.nombre if es_sucursal else None,
        using_fallback=False,
    )


@router.post("/whatsapp/disconnect", response_model=WhatsAppStatusResponse)
async def disconnect_whatsapp(
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )

    wa_service = build_service_from_entity(target, instance_name, empresa_id, cod_pais)
    res = await wa_service.disconnect_instance(clear_session=True)

    target.whatsapp_connected = False
    target.whatsapp_status = "disconnected"
    target.whatsapp_phone = None
    target.whatsapp_connected_at = None
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="DESCONECTAR_WHATSAPP_PYTHON",
        modulo="integraciones",
        request=request,
        detalles={"instance_name": instance_name, "sucursal_id": target.id if es_sucursal else None},
    )

    return WhatsAppStatusResponse(
        **res,
        is_sucursal=es_sucursal,
        sucursal_id=target.id if es_sucursal else None,
        sucursal_nombre=target.nombre if es_sucursal else None,
        using_fallback=False,
    )


@router.get("/whatsapp/diagnostic", response_model=WhatsAppDiagnosticResponse)
async def run_whatsapp_diagnostic(
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )
    diag = await whatsapp_engine.diagnostic(instance_name)
    return WhatsAppDiagnosticResponse(**diag)


@router.get("/whatsapp/queue-stats", response_model=WhatsAppQueueStatsResponse)
async def get_queue_stats(
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )
    params = _extract_antiban_params(target)
    sent_today, sent_hour, queued_count = await _get_instance_counts(
        db, empresa_id, target.id if es_sucursal else None
    )
    sent_hour = max(sent_hour, whatsapp_engine.get_hourly_count(instance_name))
    live = whatsapp_engine.get_status(instance_name)

    connected_at = getattr(target, "whatsapp_connected_at", None)
    effective_daily, warmup_day = compute_warmup_limit(
        connected_at, params["dailyLimit"], params["warmupMode"]
    )
    in_hours, _ = is_within_working_hours(
        params["workingHoursEnabled"],
        params["workingHoursStart"],
        params["workingHoursEnd"],
    )
    score, tips = calculate_safety_score(
        simulate_typing=params["simulateTyping"],
        warmup_mode=params["warmupMode"],
        working_hours_enabled=params["workingHoursEnabled"],
        verify_number=params["verifyNumber"],
        delay_min_sec=params["delayMinSec"],
        delay_max_sec=params["delayMaxSec"],
        daily_limit=params["dailyLimit"],
        hourly_limit=params["hourlyLimit"],
        batch_size=params["batchSize"],
        batch_pause_sec=params["batchPauseSec"],
    )
    paused = bool(live.get("queue_paused")) or bool(getattr(target, "whatsapp_queue_paused", False))

    return WhatsAppQueueStatsResponse(
        sentToday=sent_today,
        dailyLimit=params["dailyLimit"],
        effectiveDailyLimit=effective_daily,
        sentThisHour=sent_hour,
        hourlyLimit=params["hourlyLimit"],
        queued=queued_count,
        totalQueued=queued_count,
        warmupMode=params["warmupMode"],
        warmupDay=warmup_day,
        workingHoursEnabled=params["workingHoursEnabled"],
        workingHoursStart=params["workingHoursStart"],
        workingHoursEnd=params["workingHoursEnd"],
        withinWorkingHours=in_hours,
        simulateTyping=params["simulateTyping"],
        typingMinSec=params["typingMinSec"],
        typingMaxSec=params["typingMaxSec"],
        delayMinSec=params["delayMinSec"],
        delayMaxSec=params["delayMaxSec"],
        batchSize=params["batchSize"],
        batchPauseSec=params["batchPauseSec"],
        verifyNumber=params["verifyNumber"],
        queuePaused=paused,
        pauseReason=live.get("pause_reason"),
        currentlyTypingTo=live.get("currently_typing_to"),
        safetyScore=score,
        safetyTips=tips,
        proxyUrl=params["proxyUrl"],
    )


@router.post("/whatsapp/antiban")
async def update_antiban_settings(
    req: AntiBanUpdateRequest,
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    # Normalizar rangos min <= max
    t_min = min(req.typingMinSec, req.typingMaxSec)
    t_max = max(req.typingMinSec, req.typingMaxSec)
    d_min = min(req.delayMinSec, req.delayMaxSec)
    d_max = max(req.delayMinSec, req.delayMaxSec)

    target.whatsapp_rate_limit = req.dailyLimit
    target.whatsapp_hourly_limit = req.hourlyLimit
    target.whatsapp_warmup_mode = req.warmupMode
    target.whatsapp_working_hours_enabled = req.workingHoursEnabled
    target.whatsapp_working_hours_start = req.workingHoursStart
    target.whatsapp_working_hours_end = req.workingHoursEnd
    target.whatsapp_simulate_typing = req.simulateTyping
    target.whatsapp_typing_min_sec = t_min
    target.whatsapp_typing_max_sec = t_max
    target.whatsapp_delay_min_sec = d_min
    target.whatsapp_delay_max_sec = d_max
    target.whatsapp_batch_size = req.batchSize
    target.whatsapp_batch_pause_sec = req.batchPauseSec
    target.whatsapp_verify_number = req.verifyNumber
    target.whatsapp_proxy_url = (req.proxyUrl or "").strip() or None

    await db.commit()
    await db.refresh(target)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="ACTUALIZAR_ANTIBAN_WHATSAPP",
        modulo="integraciones",
        request=request,
        detalles={"sucursal_id": target.id if es_sucursal else None, **req.model_dump()},
    )

    return {"success": True, "mensaje": "Políticas Anti-Baneo y control de envíos actualizadas."}


@router.post("/whatsapp/queue/toggle-pause")
async def toggle_whatsapp_queue_pause(
    req: WhatsAppQueueToggleRequest,
    sucursal_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Pausa o reanuda el motor de cola de una instancia (también reinicia el Circuit Breaker)."""
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )
    target.whatsapp_queue_paused = req.paused
    await db.commit()

    whatsapp_engine.set_queue_paused(
        instance_name,
        req.paused,
        reason=req.reason or ("Pausado manualmente por el operador." if req.paused else None),
    )

    return {
        "success": True,
        "paused": req.paused,
        "mensaje": "Cola de envíos pausada." if req.paused else "Cola de envíos reanudada.",
    }


@router.post("/whatsapp/queue/clear")
async def clear_whatsapp_queue(
    sucursal_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancela todos los mensajes pendientes/en cola para esta instancia."""
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    q = select(WhatsAppMessage).where(
        WhatsAppMessage.empresa_id == empresa_id,
        WhatsAppMessage.status.in_(["queued", "pending"]),
    )
    if es_sucursal:
        q = q.where(WhatsAppMessage.sucursal_id == target.id)
    else:
        q = q.where(WhatsAppMessage.sucursal_id.is_(None))

    msgs = (await db.execute(q)).scalars().all()
    for m in msgs:
        m.status = "cancelled"
        m.error_message = "Cancelado manualmente desde la cola."
    await db.commit()

    return {
        "success": True,
        "cancelled_count": len(msgs),
        "mensaje": f"{len(msgs)} mensaje(s) retirado(s) de la cola.",
    }


# ── 7. VERIFICADOR DE NÚMEROS & SPINTAX ────────────────────────────────
@router.post("/whatsapp/check-number", response_model=CheckNumberResponse)
async def check_whatsapp_number(
    req: CheckNumberRequest,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    instance_name = target.whatsapp_instance or (
        f"sucursal_{empresa_id}_{target.id}" if es_sucursal else f"empresa_{target.id}"
    )
    wa_service = build_service_from_entity(target, instance_name, empresa_id, cod_pais)
    res = await wa_service.check_number(req.phone)
    return CheckNumberResponse(success=True, result=res)


@router.post("/whatsapp/preview-spintax", response_model=PreviewSpintaxResponse)
async def preview_spintax(
    req: PreviewSpintaxRequest,
    current_user: Usuario = Depends(get_current_active_user),
):
    wa_service = WhatsAppService()
    variations = wa_service.preview_spintax(
        text=req.text,
        count=req.count,
        variables=req.variables
        or {"paciente": "Carlos Rodríguez", "medico": "Dra. Elena Silva", "sede": "Sede Central", "empresa": "Clínica Central"},
    )
    return PreviewSpintaxResponse(success=True, variations=variations)


@router.post("/whatsapp/generate-token")
async def generate_whatsapp_token(
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    new_token = f"mf_wa_{secrets.token_hex(16)}"
    target.whatsapp_api_key = new_token
    await db.commit()
    await db.refresh(target)

    return {"success": True, "token": new_token, "whatsapp_api_key": new_token}


@router.put("/whatsapp/update")
async def update_whatsapp_server(
    req: UpdateWhatsAppServerRequest,
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    target, es_sucursal = await get_whatsapp_target(db, empresa_id, sucursal_id)
    if not target:
        raise HTTPException(status_code=404, detail="Entidad no encontrada")

    target.whatsapp_api_url = "python://local"
    target.whatsapp_instance = req.whatsapp_instance.strip()
    target.whatsapp_active = req.whatsapp_active
    if req.whatsapp_api_key:
        target.whatsapp_api_key = req.whatsapp_api_key

    await db.commit()
    await db.refresh(target)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="CONFIGURAR_INSTANCIA_WHATSAPP_PYTHON",
        modulo="integraciones",
        request=request,
        detalles={"instance": target.whatsapp_instance, "sucursal_id": target.id if es_sucursal else None},
    )

    return {"success": True, "mensaje": "Identificador de instancia WhatsApp actualizado."}


# ── 8. WHATSAPP: PROBADOR DE ENVÍOS & BITÁCORA ─────────────────────────
@router.post("/whatsapp/send-test")
async def send_whatsapp_test(
    req: WhatsAppSendTestRequest,
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="ID de sucursal específica (opcional)"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    await PlanQuotaService.check_whatsapp_limit(db, empresa_id, count=1)

    wa_service, target_used, es_suc, using_fallback = await resolve_whatsapp_service(
        db, empresa_id, sucursal_id
    )
    if not wa_service:
        raise HTTPException(status_code=400, detail="No hay una instancia de WhatsApp configurada")

    if not req.sync:
        # Encolar en el motor Python Anti-Ban
        msg_log = WhatsAppMessage(
            empresa_id=empresa_id,
            sucursal_id=target_used.id if es_suc else None,
            instance_name=wa_service.instance_name,
            recipient_phone=req.phone,
            recipient_name="Prueba Encolada",
            message_content=req.message,
            variables=req.variables,
            status="queued",
            direction="outbound",
        )
        db.add(msg_log)
        await db.commit()
        return {
            "success": True,
            "queued": True,
            "mensaje": "Mensaje agregado a la cola segura Anti-Baneo.",
            "resultado": {"message_id": msg_log.id, "status": "queued"},
        }

    res = await wa_service.send_message(
        to=req.phone,
        message=req.message,
        variables=req.variables,
        sync=True,
        simulate_typing=req.simulate_typing,
        verify_number=req.verify_number,
    )

    msg_log = WhatsAppMessage(
        empresa_id=empresa_id,
        sucursal_id=target_used.id if es_suc else None,
        instance_name=wa_service.instance_name,
        external_message_id=res.get("message_id"),
        recipient_phone=res.get("formatted_phone", req.phone),
        recipient_name="Prueba Manual",
        message_content=res.get("final_message", req.message),
        variables=req.variables,
        status="sent" if res.get("success") else "failed",
        error_message=res.get("error") if not res.get("success") else None,
        direction="outbound",
        sent_at=datetime.now() if res.get("success") else None,
    )
    db.add(msg_log)
    await db.commit()

    if not res.get("success"):
        raise HTTPException(
            status_code=400,
            detail=res.get("error")
            or "Fallo al enviar mensaje. Verifica que la instancia esté conectada escaneando el QR.",
        )

    typing_info = (
        f" (simuló 'escribiendo...' {res.get('typing_seconds')}s)"
        if res.get("typing_seconds")
        else ""
    )
    return {
        "success": True,
        "mensaje": f"Mensaje enviado directamente por Python{typing_info}.",
        "resultado": res,
    }


@router.post("/whatsapp/messages/{msg_id}/retry")
async def retry_whatsapp_message(
    msg_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(WhatsAppMessage).where(
        WhatsAppMessage.id == msg_id, WhatsAppMessage.empresa_id == empresa_id
    )
    msg = (await db.execute(stmt)).scalar_one_or_none()

    if not msg:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    wa_service, _, _, _ = await resolve_whatsapp_service(db, empresa_id, msg.sucursal_id)
    if not wa_service:
        raise HTTPException(status_code=400, detail="Instancia de WhatsApp no disponible")

    dispatch_res = await wa_service.send_message(
        to=msg.recipient_phone,
        message=msg.message_content,
        variables=msg.variables,
        sync=True,
        simulate_typing=True,
    )
    if dispatch_res.get("success"):
        msg.status = "sent"
        msg.sent_at = datetime.now()
        msg.external_message_id = dispatch_res.get("message_id")
        msg.error_message = None
        await db.commit()
        return {"success": True, "mensaje": "Mensaje reenviado con éxito (motor Python)"}
    else:
        msg.retry_count = (msg.retry_count or 0) + 1
        msg.error_message = dispatch_res.get("error")
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail=dispatch_res.get("error") or "Fallo al reenviar mensaje",
        )


# ── 9. PLANTILLAS DE WHATSAPP (CRUD) ───────────────────────────────────
@router.get("/whatsapp/templates", response_model=List[WhatsAppTemplateResponse])
async def get_whatsapp_templates(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(WhatsAppTemplate).where(WhatsAppTemplate.empresa_id == empresa_id).order_by(WhatsAppTemplate.id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/whatsapp/templates", response_model=WhatsAppTemplateResponse)
async def create_whatsapp_template(
    req: WhatsAppTemplateCreate,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    tpl = WhatsAppTemplate(
        empresa_id=empresa_id,
        nombre=req.nombre,
        categoria=req.categoria,
        contenido=req.contenido,
        variables=req.variables or [],
        activo=req.activo
    )
    db.add(tpl)
    await db.commit()
    await db.refresh(tpl)
    return tpl


@router.put("/whatsapp/templates/{tpl_id}", response_model=WhatsAppTemplateResponse)
async def update_whatsapp_template(
    tpl_id: int,
    req: WhatsAppTemplateUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WhatsAppTemplate).where(WhatsAppTemplate.id == tpl_id)
    result = await db.execute(stmt)
    tpl = result.scalar_one_or_none()

    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    if req.nombre is not None:
        tpl.nombre = req.nombre
    if req.categoria is not None:
        tpl.categoria = req.categoria
    if req.contenido is not None:
        tpl.contenido = req.contenido
    if req.variables is not None:
        tpl.variables = req.variables
    if req.activo is not None:
        tpl.activo = req.activo

    await db.commit()
    await db.refresh(tpl)
    return tpl


@router.delete("/whatsapp/templates/{tpl_id}")
async def delete_whatsapp_template(
    tpl_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WhatsAppTemplate).where(WhatsAppTemplate.id == tpl_id)
    result = await db.execute(stmt)
    tpl = result.scalar_one_or_none()

    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    await db.delete(tpl)
    await db.commit()
    return {"success": True, "mensaje": "Plantilla eliminada exitosamente"}


# ── 10. DIFUSIÓN MASIVA SEGURA (COLA ANTI-BANEO PYTHON) ────────────────
@router.get("/whatsapp/broadcast/recipients", response_model=List[BroadcastRecipientItem])
async def get_broadcast_recipients(
    target: str = "pacientes",
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    recipients: List[BroadcastRecipientItem] = []

    if target == "pacientes":
        stmt = select(Paciente).where(Paciente.empresa_id == empresa_id, Paciente.activo == True).order_by(Paciente.id.desc())
        rows = (await db.execute(stmt)).scalars().all()
        for p in rows:
            raw_phone = (p.telefono or "").strip()
            formatted = format_phone_number(raw_phone, cod_pais) if raw_phone else ""
            valid = 10 <= len(formatted) <= 15
            recipients.append(
                BroadcastRecipientItem(
                    id=p.id,
                    name=f"{p.nombres} {p.apellidos}".strip(),
                    phone=raw_phone or "Sin teléfono",
                    formatted_phone=f"+{formatted}" if formatted else "",
                    is_valid_phone=valid,
                    role="Paciente",
                    type="paciente",
                )
            )
    elif target == "medicos":
        stmt = select(Medico).where(Medico.empresa_id == empresa_id, Medico.activo == True).order_by(Medico.id.desc())
        rows = (await db.execute(stmt)).scalars().all()
        for m in rows:
            raw_phone = (m.telefono or "").strip()
            formatted = format_phone_number(raw_phone, cod_pais) if raw_phone else ""
            valid = 10 <= len(formatted) <= 15
            recipients.append(
                BroadcastRecipientItem(
                    id=m.id,
                    name=f"Dr(a). {m.nombres} {m.apellidos}".strip(),
                    phone=raw_phone or "Sin teléfono",
                    formatted_phone=f"+{formatted}" if formatted else "",
                    is_valid_phone=valid,
                    role="Médico Especialista",
                    type="medico",
                )
            )
    else:
        stmt = select(Usuario).where(Usuario.empresa_id == empresa_id, Usuario.activo == True).order_by(Usuario.id.desc())
        rows = (await db.execute(stmt)).scalars().all()
        for u in rows:
            raw_phone = (u.telefono or "").strip()
            formatted = format_phone_number(raw_phone, cod_pais) if raw_phone else ""
            valid = 10 <= len(formatted) <= 15
            recipients.append(
                BroadcastRecipientItem(
                    id=u.id,
                    name=f"{u.nombre} {u.apellido}".strip(),
                    phone=raw_phone or "Sin teléfono",
                    formatted_phone=f"+{formatted}" if formatted else "",
                    is_valid_phone=valid,
                    role="Personal Clínico",
                    type="usuario",
                )
            )

    return recipients


@router.post("/whatsapp/broadcast/dispatch")
async def dispatch_broadcast(
    req: BroadcastDispatchRequest,
    request: Request,
    sucursal_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Encola los destinatarios en el Worker Anti-Baneo de Python (con Spintax,
    simulación de escritura, retardo humano gaussiano y pausas por lote).
    """
    if not req.recipient_ids:
        raise HTTPException(status_code=400, detail="Selecciona al menos un destinatario")

    empresa_id = current_user.empresa_id or 1
    wa_service, resolved_target, is_sucursal, using_fallback = await resolve_whatsapp_service(
        db, empresa_id, sucursal_id
    )
    if not wa_service:
        raise HTTPException(status_code=400, detail="No hay instancia de WhatsApp configurada")

    empresa = (await db.execute(select(Empresa).where(Empresa.id == empresa_id))).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    target_empresa_nombre = resolved_target.nombre if resolved_target else "Clínica"

    # Cargar contactos según target_type
    contacts: List[tuple[str, str]] = []
    if req.target_type == "pacientes":
        rows = (
            await db.execute(
                select(Paciente).where(Paciente.empresa_id == empresa_id, Paciente.id.in_(req.recipient_ids))
            )
        ).scalars().all()
        for p in rows:
            if p.telefono:
                contacts.append((f"{p.nombres} {p.apellidos}".strip(), p.telefono))
    elif req.target_type == "medicos":
        rows = (
            await db.execute(
                select(Medico).where(Medico.empresa_id == empresa_id, Medico.id.in_(req.recipient_ids))
            )
        ).scalars().all()
        for m in rows:
            if m.telefono:
                contacts.append((f"Dr(a). {m.nombres} {m.apellidos}".strip(), m.telefono))
    else:
        rows = (
            await db.execute(
                select(Usuario).where(Usuario.empresa_id == empresa_id, Usuario.id.in_(req.recipient_ids))
            )
        ).scalars().all()
        for u in rows:
            if u.telefono:
                contacts.append((f"{u.nombre} {u.apellido}".strip(), u.telefono))

    if not contacts:
        raise HTTPException(status_code=400, detail="Ninguno de los destinatarios seleccionados tiene teléfono válido")

    await PlanQuotaService.check_whatsapp_limit(db, empresa_id, count=len(contacts))

    count_queued = 0
    for full_name, raw_phone in contacts:
        formatted = format_phone_number(raw_phone, cod_pais)
        if not formatted or len(formatted) < 10:
            continue
        vars_dict = {
            **(req.variables or {}),
            "nombre": full_name,
            "paciente": full_name,
            "empresa": target_empresa_nombre,
            "sede": target_empresa_nombre,
        }
        msg_log = WhatsAppMessage(
            empresa_id=empresa_id,
            sucursal_id=resolved_target.id if is_sucursal else None,
            instance_name=wa_service.instance_name,
            recipient_phone=formatted,
            recipient_name=full_name,
            message_content=req.message,
            variables=vars_dict,
            status="queued",
            direction="outbound",
            scheduled_at=datetime.now(),
        )
        db.add(msg_log)
        count_queued += 1

    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="ENCOLAR_DIFUSION_WHATSAPP",
        modulo="integraciones",
        request=request,
        detalles={"instance": wa_service.instance_name, "queued": count_queued, "target_type": req.target_type},
    )

    return {
        "success": True,
        "dispatched_count": count_queued,
        "message": f"{count_queued} mensaje(s) encolados en el motor Anti-Baneo de Python. Se enviarán progresivamente con simulación de escritura y retardos humanos.",
    }


# ── 11. BITÁCORA Y HISTORIAL ───────────────────────────────────────────
@router.get("/whatsapp/mensajes")
async def get_whatsapp_messages(
    page: int = Query(default=1, ge=1),
    search: str = Query(default=""),
    status: str = Query(default="all"),
    limit: int = Query(default=15, ge=1, le=100),
    sucursal_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    empresa_id = current_user.empresa_id or 1
    query = select(WhatsAppMessage).where(WhatsAppMessage.empresa_id == empresa_id)

    if sucursal_id is not None:
        query = query.where(WhatsAppMessage.sucursal_id == sucursal_id)

    if search:
        query = query.where(
            (WhatsAppMessage.recipient_phone.ilike(f"%{search}%"))
            | (WhatsAppMessage.recipient_name.ilike(f"%{search}%"))
            | (WhatsAppMessage.message_content.ilike(f"%{search}%"))
        )

    if status and status != "all":
        if status == "queued":
            query = query.where(WhatsAppMessage.status.in_(["queued", "pending", "sending"]))
        else:
            query = query.where(WhatsAppMessage.status == status)

    count_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (page - 1) * limit
    paginated_query = query.order_by(WhatsAppMessage.id.desc()).offset(offset).limit(limit)
    messages = (await db.execute(paginated_query)).scalars().all()

    def _scope(q):
        if sucursal_id is not None:
            return q.where(WhatsAppMessage.sucursal_id == sucursal_id)
        return q

    total_sent = (await db.execute(_scope(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status.in_(["sent", "delivered", "read"]))))).scalar() or 0
    total_deliv = (await db.execute(_scope(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status.in_(["delivered", "read"]))))).scalar() or 0
    total_read = (await db.execute(_scope(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status == "read")))).scalar() or 0
    total_fail = (await db.execute(_scope(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status == "failed")))).scalar() or 0
    total_queued = (await db.execute(_scope(select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status.in_(["queued", "pending", "sending"]))))).scalar() or 0

    delivery_rate = round((total_deliv / max(total_sent, 1)) * 100, 1) if total_sent else 0.0
    read_rate = round((total_read / max(total_sent, 1)) * 100, 1) if total_sent else 0.0

    return {
        "success": True,
        "messages": {
            "data": [WhatsAppMessageResponse.model_validate(m) for m in messages],
            "current_page": page,
            "last_page": max(1, (total + limit - 1) // limit),
            "total": total,
            "per_page": limit,
        },
        "stats": {
            "totalSent": total_sent,
            "totalDelivered": total_deliv,
            "totalRead": total_read,
            "totalFailed": total_fail,
            "totalQueued": total_queued,
            "deliveryRate": delivery_rate,
            "readRate": read_rate,
        },
    }


# ── 7. MÓDULO DE TASAS DE CAMBIO & HISTÓRICO (USD, EUR, USDT) ───────────

@router.get("/tasas/actuales", response_model=TasasActualesResponse)
async def get_current_rates(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene las tasas activas más recientes de Dólar BCV, Euro BCV y Binance USDT."""
    empresa_id = current_user.empresa_id or 1
    return await ExchangeRateService.get_current_rates(empresa_id, db)


@router.post("/tasas/sincronizar")
async def sync_exchange_rates(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Sincroniza en tiempo real las 3 divisas contra las APIs de BCV y Binance y guarda en el histórico."""
    empresa_id = current_user.empresa_id or 1
    result = await ExchangeRateService.sync_all_rates(empresa_id, db, usuario_id=current_user.id)
    
    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="SINCRONIZAR",
        modulo="tasas_cambio",
        request=request,
        detalles=result.get("tasas", {})
    )
    
    return result


@router.post("/tasas/manual")
async def set_manual_rate(
    payload: TasaCambioManualRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Registra manualmente un valor de tasa personalizada para USD, EUR o USDT."""
    empresa_id = current_user.empresa_id or 1
    result = await ExchangeRateService.record_manual_rate(
        empresa_id=empresa_id,
        moneda=payload.moneda,
        tasa_valor=payload.tasa,
        db=db,
        usuario_id=current_user.id
    )

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="MODIFICAR",
        modulo="tasas_cambio",
        request=request,
        detalles={"moneda": payload.moneda, "tasa": payload.tasa}
    )

    return {"success": True, "message": f"Tasa de {payload.moneda.upper()} actualizada exitosamente", "data": result}


@router.put("/tasas/moneda-cobro")
async def set_active_billing_currency(
    payload: SetMonedaCobroRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Configura la tasa de cambio de referencia a usar en el sistema para cobros (USD o EUR)."""
    empresa_id = current_user.empresa_id or 1
    moneda_norm = (payload.moneda or "").strip().upper()
    if moneda_norm not in ["USD", "EUR"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La tasa de cobro sólo puede ser 'USD' (Dólar BCV) o 'EUR' (Euro BCV)"
        )

    try:
        result = await ExchangeRateService.set_active_billing_rate(
            empresa_id=empresa_id,
            moneda=moneda_norm,
            db=db
        )
        await registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            empresa_id=empresa_id,
            accion="CONFIGURAR_TASA_COBRO",
            modulo="tasas_cambio",
            request=request,
            detalles={"moneda_cobro_activa": moneda_norm, "tasa": result.get("tasa_cobro_activa")}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/tasas/historico", response_model=List[TasaHistoricoItem])
async def get_rates_history(
    moneda: Optional[str] = Query(None, description="USD, EUR, USDT o TODOS"),
    limit: int = Query(50, ge=1, le=500),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el historial de cambios de tasas de cambio con fechas, variaciones y usuario."""
    empresa_id = current_user.empresa_id or 1
    return await ExchangeRateService.get_history(empresa_id, db, moneda=moneda, limit=limit)


@router.get("/bcv-rate", response_model=BcvRateResponse)
async def get_bcv_rate_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Endpoint simplificado para compatibilidad hacia atrás del Dólar BCV."""
    empresa_id = current_user.empresa_id or 1
    usd_data = await ExchangeRateService.fetch_usd_bcv()
    
    if usd_data:
        rate = usd_data["tasa"]
        fuente = usd_data["fuente"]
        fecha_act = usd_data.get("fecha_oficial") or datetime.now().isoformat()
    else:
        rate = 798.32
        fuente = "Caché de Respaldo"
        fecha_act = datetime.now().isoformat()

    return BcvRateResponse(
        rate=rate,
        fuente=fuente,
        fecha_actualizacion=str(fecha_act),
        moneda_base="USD",
        moneda_destino="VES",
        exitoso=True
    )


# ── 10. JITSI MEET — MOTOR PRINCIPAL WORKSPACE & TELEMEDICINA ───────────
@router.put("/jitsi", response_model=IntegracionesConfigResponse)
async def update_jitsi_config(
    req: UpdateJitsiRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Guarda la configuración de Jitsi Meet y políticas clínicas de MediSoft WorkSpace."""
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    provider_norm = (req.jitsi_provider or "public").strip().lower()
    if provider_norm not in ("public", "self_hosted", "jaas"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El proveedor Jitsi debe ser 'public', 'self_hosted' o 'jaas'."
        )

    default_domain = "8x8.vc" if provider_norm == "jaas" else "meet.jit.si"
    normalized_domain = JitsiService.normalize_domain(req.jitsi_domain or default_domain)
    normalized_prefix = JitsiService.sanitize_slug(req.jitsi_room_prefix or "medisoft") or "medisoft"

    empresa.jitsi_active = req.jitsi_active
    empresa.jitsi_provider = provider_norm
    empresa.jitsi_domain = normalized_domain
    empresa.jitsi_app_id = (req.jitsi_app_id or "").strip() or None
    empresa.jitsi_jwt_secret = (req.jitsi_jwt_secret or "").strip() or None
    empresa.jitsi_key_id = (req.jitsi_key_id or "").strip() or None
    empresa.jitsi_room_prefix = normalized_prefix
    empresa.jitsi_lobby_enabled = req.jitsi_lobby_enabled
    empresa.jitsi_recording_enabled = req.jitsi_recording_enabled
    empresa.jitsi_e2ee_enabled = req.jitsi_e2ee_enabled
    empresa.telemedicina_requiere_pago = req.telemedicina_requiere_pago
    empresa.telemedicina_consentimiento_texto = (req.telemedicina_consentimiento_texto or "").strip() or None

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CONFIGURAR_JITSI_WORKSPACE",
        modulo="integraciones",
        request=request,
        detalles={
            "jitsi_active": req.jitsi_active,
            "jitsi_provider": provider_norm,
            "jitsi_domain": normalized_domain,
            "jitsi_lobby_enabled": req.jitsi_lobby_enabled,
            "telemedicina_requiere_pago": req.telemedicina_requiere_pago,
        }
    )

    return await get_integraciones_config(current_user=current_user, db=db)


@router.get("/jitsi/diagnostic", response_model=JitsiDiagnosticResponse)
async def run_jitsi_diagnostic(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Verifica conectividad HTTPS, script External IFrame API, latencia y firma JWT de Jitsi."""
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    jitsi_svc = JitsiService.from_empresa(empresa)
    diag = await jitsi_svc.diagnose()
    return JitsiDiagnosticResponse(**diag)


@router.post("/jitsi/generate-secret", response_model=JitsiGenerateSecretResponse)
async def generate_jitsi_secret(
    current_user: Usuario = Depends(get_current_active_user),
):
    """Genera credenciales sugeridas (App ID + JWT Secret HS256 de 256-bit) para nodo propio Docker Jitsi."""
    empresa_id = current_user.empresa_id or 1
    app_id = f"medisoft_workspace_emp{empresa_id}"
    secret = f"ms_jitsi_{secrets.token_hex(28)}"
    return JitsiGenerateSecretResponse(
        jitsi_app_id=app_id,
        jitsi_jwt_secret=secret,
    )


@router.post("/jitsi/session", response_model=JitsiSessionResponse)
async def create_jitsi_session(
    req: JitsiSessionRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Genera una sesión segura de Jitsi WorkSpace (con JWT firmado cuando aplica) para:
    - Cabina de prueba / diagnóstico desde Integraciones ('test')
    - Junta médica / videollamada interna ('workspace' | 'interconsulta')
    - Teleconsulta asistencial del médico ('teleconsulta')
    """
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    jitsi_svc = JitsiService.from_empresa(empresa)
    if not jitsi_svc.active and req.context_type != "test":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El motor Jitsi WorkSpace está desactivado en Integraciones."
        )

    if req.context_type != "test":
        await PlanQuotaService.check_telemedicina_access(db, empresa_id)

    full_name = f"{current_user.nombre or ''} {current_user.apellido or ''}".strip() or current_user.email
    if current_user.rol and current_user.rol.slug == "medico" and not full_name.lower().startswith(("dr.", "dra.")):
        full_name = f"Dr(a). {full_name}"

    session_data = jitsi_svc.build_session(
        user_id=str(current_user.id),
        display_name=full_name,
        email=current_user.email,
        avatar_url=getattr(current_user, "avatar_url", None),
        is_moderator=bool(req.as_moderator),
        context_type=req.context_type,
        reference_id=req.reference_id,
        custom_room=req.custom_room,
        subject=req.subject,
    )

    if req.context_type != "test":
        await registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            empresa_id=empresa.id,
            accion="INICIAR_SALA_JITSI_WORKSPACE",
            modulo="telemedicina",
            request=request,
            detalles={
                "context_type": req.context_type,
                "room_slug": session_data["room_slug"],
                "provider": session_data["provider"],
                "reference_id": req.reference_id,
            }
        )

    return JitsiSessionResponse(**session_data)


@router.get("/jitsi/stats")
async def get_jitsi_telemedicina_stats(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna las estadísticas del mes en curso de telemedicina para la empresa actual."""
    empresa_id = current_user.empresa_id or 1
    return await PlanQuotaService.get_telemedicina_stats(db, empresa_id)



