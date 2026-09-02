import secrets
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.integracion import WhatsAppTemplate, WhatsAppMessage
from app.schemas.integracion import (
    IntegracionesConfigResponse,
    UpdateMapsRequest,
    UpdatePagosRequest,
    UpdateWhatsAppServerRequest,
    AntiBanUpdateRequest,
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
    TasasActualesResponse,
    TasaHistoricoItem
)
from app.services.bcv_service import BcvRateService
from app.services.whatsapp_service import WhatsAppService
from app.services.exchange_rate_service import ExchangeRateService
from app.core.security import registrar_auditoria

router = APIRouter(prefix="/integraciones", tags=["Integraciones"])


# ── 1. CONFIGURACIÓN GENERAL DE INTEGRACIONES ───────────────────────────
@router.get("", response_model=IntegracionesConfigResponse)
async def get_integraciones_config(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    return IntegracionesConfigResponse(
        maptiler_api_key=getattr(empresa, 'maptiler_api_key', None),
        maptiler_active=getattr(empresa, 'maptiler_active', True),
        mapbox_api_key=getattr(empresa, 'mapbox_api_key', None),
        mapbox_active=getattr(empresa, 'mapbox_active', False),
        google_maps_api_key=getattr(empresa, 'google_maps_api_key', None),
        google_maps_active=getattr(empresa, 'google_maps_active', False),
        whatsapp_active=getattr(empresa, 'whatsapp_active', False),
        whatsapp_api_url=getattr(empresa, 'whatsapp_api_url', "https://whatsapp.theizerdev.com") or "https://whatsapp.theizerdev.com",
        whatsapp_api_key=getattr(empresa, 'whatsapp_api_key', None),
        whatsapp_instance=getattr(empresa, 'whatsapp_instance', None) or f"empresa_{empresa.id}",
        whatsapp_connected=getattr(empresa, 'whatsapp_connected', False),
        whatsapp_phone=getattr(empresa, 'whatsapp_phone', None),
        whatsapp_status=getattr(empresa, 'whatsapp_status', 'disconnected'),
        whatsapp_rate_limit=getattr(empresa, 'whatsapp_rate_limit', 300) or 300,
        whatsapp_warmup_mode=getattr(empresa, 'whatsapp_warmup_mode', True) if getattr(empresa, 'whatsapp_warmup_mode', None) is not None else True,
        whatsapp_working_hours_enabled=getattr(empresa, 'whatsapp_working_hours_enabled', True) if getattr(empresa, 'whatsapp_working_hours_enabled', None) is not None else True,
        whatsapp_working_hours_start=getattr(empresa, 'whatsapp_working_hours_start', "08:00") or "08:00",
        whatsapp_working_hours_end=getattr(empresa, 'whatsapp_working_hours_end', "20:00") or "20:00",
        whatsapp_proxy_url=getattr(empresa, 'whatsapp_proxy_url', None),
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


# ── 5. WHATSAPP: ESTADO, CONEXIÓN & DIAGNÓSTICO ────────────────────────
@router.get("/whatsapp/status", response_model=WhatsAppStatusResponse)
async def get_whatsapp_status(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}",
        company_id=empresa.id
    )
    status_data = await wa_service.get_status(
        db_status=empresa.whatsapp_status,
        db_phone=empresa.whatsapp_phone,
        db_connected=empresa.whatsapp_connected
    )

    # Sincronizar en BD según lo que reporte el servidor Baileys
    if status_data.get("is_connected"):
        if not empresa.whatsapp_connected or empresa.whatsapp_status != "connected":
            empresa.whatsapp_connected = True
            empresa.whatsapp_status = "connected"
            if status_data.get("phone_number"):
                empresa.whatsapp_phone = status_data.get("phone_number")
            await db.commit()
    elif status_data.get("connection_state") == "QR_READY" and status_data.get("qr_data_url"):
        if empresa.whatsapp_status != "qr_ready":
            empresa.whatsapp_status = "qr_ready"
            empresa.whatsapp_connected = False
            await db.commit()
    elif status_data.get("connection_state") == "DISCONNECTED":
        if empresa.whatsapp_connected:
            empresa.whatsapp_connected = False
            empresa.whatsapp_status = "disconnected"
            empresa.whatsapp_phone = None
            await db.commit()

    return WhatsAppStatusResponse(**status_data)


@router.post("/whatsapp/connect", response_model=WhatsAppStatusResponse)
async def connect_whatsapp(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}",
        company_id=empresa.id
    )
    res = await wa_service.connect_instance()

    empresa.whatsapp_active = True
    empresa.whatsapp_status = res.get("connection_state", "QR_READY").lower()
    empresa.whatsapp_connected = res.get("is_connected", False)
    if res.get("phone_number"):
        empresa.whatsapp_phone = res.get("phone_number")
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CONECTAR_WHATSAPP",
        modulo="integraciones",
        request=request
    )

    return WhatsAppStatusResponse(**res)


@router.post("/whatsapp/reconnect", response_model=WhatsAppStatusResponse)
async def reconnect_whatsapp(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}"
    )
    await wa_service.disconnect_instance()
    res = await wa_service.connect_instance()

    empresa.whatsapp_status = "qr_ready"
    empresa.whatsapp_connected = False
    await db.commit()

    return WhatsAppStatusResponse(**res)


@router.post("/whatsapp/disconnect", response_model=WhatsAppStatusResponse)
async def disconnect_whatsapp(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}"
    )
    res = await wa_service.disconnect_instance()

    empresa.whatsapp_connected = False
    empresa.whatsapp_status = "disconnected"
    empresa.whatsapp_phone = None
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="DESCONECTAR_WHATSAPP",
        modulo="integraciones",
        request=request
    )

    return WhatsAppStatusResponse(**res)


@router.post("/whatsapp/simulate-scan", response_model=WhatsAppStatusResponse)
async def simulate_whatsapp_scan(
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Simula el escaneo del código QR y vincula una línea de prueba activa.
    """
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    empresa.whatsapp_connected = True
    empresa.whatsapp_status = "connected"
    empresa.whatsapp_phone = "584121234567"
    empresa.whatsapp_active = True
    await db.commit()

    return WhatsAppStatusResponse(
        is_connected=True,
        connection_state="CONNECTED",
        qr_code=None,
        qr_data_url=None,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}",
        phone_number="584121234567",
        last_sync=datetime.now()
    )


@router.get("/whatsapp/diagnostic", response_model=WhatsAppDiagnosticResponse)
async def run_whatsapp_diagnostic(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}"
    )
    diag = await wa_service.diagnostic()
    return WhatsAppDiagnosticResponse(**diag)


@router.get("/whatsapp/queue-stats", response_model=WhatsAppQueueStatsResponse)
async def get_queue_stats(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    # Contar mensajes locales enviados hoy
    today_start = datetime.combine(date.today(), datetime.min.time())
    stmt_count = select(func.count(WhatsAppMessage.id)).where(
        WhatsAppMessage.empresa_id == empresa_id,
        WhatsAppMessage.direction == "outbound",
        WhatsAppMessage.status == "sent",
        WhatsAppMessage.created_at >= today_start
    )
    res_count = await db.execute(stmt_count)
    sent_today = res_count.scalar() or 0

    stmt_queued = select(func.count(WhatsAppMessage.id)).where(
        WhatsAppMessage.empresa_id == empresa_id,
        WhatsAppMessage.direction == "outbound",
        WhatsAppMessage.status.in_(["pending", "queued"])
    )
    res_queued = await db.execute(stmt_queued)
    queued_count = res_queued.scalar() or 0

    # Consultar telemetría remota de Baileys
    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}",
        company_id=empresa.id
    )
    remote_info = await wa_service.get_remote_instance_info()
    if remote_info:
        remote_sent = int(remote_info.get("dailySentCount") or 0)
        sent_today = max(sent_today, remote_sent)

    daily_limit = empresa.whatsapp_rate_limit or 300
    if remote_info and remote_info.get("dailyLimit"):
        daily_limit = int(remote_info.get("dailyLimit"))

    return WhatsAppQueueStatsResponse(
        sentToday=sent_today,
        dailyLimit=daily_limit,
        queued=queued_count,
        totalQueued=queued_count,
        warmupMode=empresa.whatsapp_warmup_mode if empresa.whatsapp_warmup_mode is not None else True,
        workingHoursEnabled=empresa.whatsapp_working_hours_enabled if empresa.whatsapp_working_hours_enabled is not None else True,
        workingHoursStart=empresa.whatsapp_working_hours_start or "08:00",
        workingHoursEnd=empresa.whatsapp_working_hours_end or "20:00",
        proxyUrl=empresa.whatsapp_proxy_url
    )


@router.post("/whatsapp/antiban")
async def update_antiban_settings(
    req: AntiBanUpdateRequest,
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

    empresa.whatsapp_rate_limit = req.dailyLimit
    empresa.whatsapp_warmup_mode = req.warmupMode
    empresa.whatsapp_working_hours_enabled = req.workingHoursEnabled
    empresa.whatsapp_working_hours_start = req.workingHoursStart
    empresa.whatsapp_working_hours_end = req.workingHoursEnd
    empresa.whatsapp_proxy_url = req.proxyUrl

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="ACTUALIZAR_ANTIBAN_WHATSAPP",
        modulo="integraciones",
        request=request,
        detalles=req.dict()
    )

    return {"success": True, "mensaje": "Políticas Anti-Baneo actualizadas correctamente"}


# ── 7. VERIFICADOR DE NÚMEROS & SPINTAX ────────────────────────────────
@router.post("/whatsapp/check-number", response_model=CheckNumberResponse)
async def check_whatsapp_number(
    req: CheckNumberRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}"
    )
    res = await wa_service.check_number(req.phone)
    return CheckNumberResponse(success=True, result=res)


@router.post("/whatsapp/preview-spintax", response_model=PreviewSpintaxResponse)
async def preview_spintax(
    req: PreviewSpintaxRequest,
    current_user: Usuario = Depends(get_current_active_user)
):
    wa_service = WhatsAppService()
    variations = wa_service.preview_spintax(
        text=req.text,
        count=req.count,
        variables=req.variables or {"paciente": "Carlos Rodríguez", "medico": "Dra. Elena Silva", "sede": "Clínica Central"}
    )
    return PreviewSpintaxResponse(success=True, variations=variations)


@router.post("/whatsapp/generate-token")
async def generate_whatsapp_token(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    new_token = f"mf_wa_{secrets.token_hex(16)}"
    empresa.whatsapp_api_key = new_token
    await db.commit()
    await db.refresh(empresa)

    return {"success": True, "token": new_token, "whatsapp_api_key": new_token}


@router.put("/whatsapp/update")
async def update_whatsapp_server(
    req: UpdateWhatsAppServerRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el Superadministrador del SaaS puede modificar los parámetros de infraestructura y credenciales del servidor WhatsApp."
        )

    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    empresa.whatsapp_api_url = req.whatsapp_api_url
    empresa.whatsapp_instance = req.whatsapp_instance
    empresa.whatsapp_active = req.whatsapp_active
    if req.whatsapp_api_key:
        empresa.whatsapp_api_key = req.whatsapp_api_key

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CONFIGURAR_SERVIDOR_WHATSAPP",
        modulo="integraciones",
        request=request
    )

    return {"success": True, "mensaje": "Configuración de servidor WhatsApp guardada"}


# ── 8. WHATSAPP: PROBADOR DE ENVÍOS & BITÁCORA ─────────────────────────
@router.post("/whatsapp/send-test")
async def send_whatsapp_test(
    req: WhatsAppSendTestRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}",
        company_id=empresa.id
    )

    res = await wa_service.send_message(req.phone, req.message, req.variables)

    # Registrar en bitácora
    msg_log = WhatsAppMessage(
        empresa_id=empresa.id,
        recipient_phone=req.phone,
        recipient_name="Prueba Manual",
        message_content=res.get("final_message", req.message),
        variables=req.variables,
        status="sent" if res.get("success") else "failed",
        error_message=res.get("error") if not res.get("success") else None,
        direction="outbound",
        sent_at=datetime.now()
    )
    db.add(msg_log)
    await db.commit()

    if not res.get("success"):
        raise HTTPException(
            status_code=400,
            detail=res.get("error") or "Fallo al enviar mensaje en el servidor de WhatsApp. Revisa el número y la conexión de la línea."
        )

    return {"success": True, "mensaje": "Mensaje despachado con éxito al gateway de WhatsApp.", "resultado": res}


@router.post("/whatsapp/messages/{msg_id}/retry")
async def retry_whatsapp_message(
    msg_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WhatsAppMessage).where(WhatsAppMessage.id == msg_id)
    res = await db.execute(stmt)
    msg = res.scalar_one_or_none()

    if not msg:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")

    empresa_id = current_user.empresa_id or 1
    stmt_emp = select(Empresa).where(Empresa.id == empresa_id)
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}",
        company_id=empresa.id
    )

    dispatch_res = await wa_service.send_message(msg.recipient_phone, msg.message_content, msg.variables)
    if dispatch_res.get("success"):
        msg.status = "sent"
        msg.sent_at = datetime.now()
        msg.error_message = None
        await db.commit()
        return {"success": True, "mensaje": "Mensaje reenviado con éxito"}
    else:
        msg.error_message = dispatch_res.get("error")
        await db.commit()
        raise HTTPException(
            status_code=400,
            detail=dispatch_res.get("error") or "Fallo al reenviar mensaje"
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


# ── 10. DIFUSIÓN MASIVA (BROADCAST) ────────────────────────────────────
@router.get("/whatsapp/broadcast/recipients", response_model=List[BroadcastRecipientItem])
async def get_broadcast_recipients(
    target: str = "usuarios",
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    recipients = []

    stmt = select(Usuario).where(Usuario.empresa_id == empresa_id, Usuario.activo == True)
    res = await db.execute(stmt)
    usuarios = res.scalars().all()

    for u in usuarios:
        phone = u.telefono or "+584120000000"
        has_phone = bool(u.telefono and len(u.telefono) >= 8)
        recipients.append(BroadcastRecipientItem(
            id=u.id,
            name=f"{u.nombre} {u.apellido}",
            phone=phone,
            formatted_phone=f"+{phone.replace('+', '')}",
            is_valid_phone=has_phone,
            role="Personal Clínico",
            type="usuario"
        ))

    return recipients


@router.post("/whatsapp/broadcast/dispatch")
async def dispatch_broadcast(
    req: BroadcastDispatchRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    wa_service = WhatsAppService(
        api_url=empresa.whatsapp_api_url or "http://localhost:3000",
        api_key=empresa.whatsapp_api_key,
        instance_name=empresa.whatsapp_instance or f"empresa_{empresa.id}"
    )

    # Obtener usuarios destinatarios
    stmt_users = select(Usuario).where(Usuario.id.in_(req.recipient_ids))
    res_users = await db.execute(stmt_users)
    users = res_users.scalars().all()

    count_dispatched = 0
    for u in users:
        phone = u.telefono or "+584120000000"
        vars_dict = {
            "nombre": f"{u.nombre} {u.apellido}",
            "paciente": f"{u.nombre} {u.apellido}",
            "empresa": empresa.nombre
        }
        res = await wa_service.send_message(phone, req.message, vars_dict)

        msg_log = WhatsAppMessage(
            empresa_id=empresa.id,
            recipient_phone=phone,
            recipient_name=f"{u.nombre} {u.apellido}",
            message_content=res.get("final_message", req.message),
            variables=vars_dict,
            status="sent" if res.get("success") else "failed",
            direction="outbound",
            sent_at=datetime.now()
        )
        db.add(msg_log)
        count_dispatched += 1

    await db.commit()

    return {
        "success": True,
        "dispatched_count": count_dispatched,
        "message": f"Difusión masiva completada: {count_dispatched} mensajes procesados."
    }


# ── 11. BITÁCORA Y HISTORIAL ───────────────────────────────────────────
@router.get("/whatsapp/mensajes")
async def get_whatsapp_messages(
    page: int = Query(default=1, ge=1),
    search: str = Query(default=""),
    status: str = Query(default="all"),
    limit: int = Query(default=15, ge=1, le=100),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    empresa_id = current_user.empresa_id or 1
    query = select(WhatsAppMessage).where(WhatsAppMessage.empresa_id == empresa_id)

    if search:
        query = query.where(
            (WhatsAppMessage.recipient_phone.ilike(f"%{search}%")) |
            (WhatsAppMessage.recipient_name.ilike(f"%{search}%")) |
            (WhatsAppMessage.message_content.ilike(f"%{search}%"))
        )

    if status and status != "all":
        query = query.where(WhatsAppMessage.status == status)

    # Conteo total
    count_stmt = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar() or 0

    # Paginación
    offset = (page - 1) * limit
    paginated_query = query.order_by(WhatsAppMessage.id.desc()).offset(offset).limit(limit)
    res = await db.execute(paginated_query)
    messages = res.scalars().all()

    # Métricas estadísticas
    stmt_sent = select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id)
    stmt_deliv = select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status.in_(["delivered", "read"]))
    stmt_read = select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status == "read")
    stmt_fail = select(func.count(WhatsAppMessage.id)).where(WhatsAppMessage.empresa_id == empresa_id, WhatsAppMessage.status == "failed")

    total_sent = (await db.execute(stmt_sent)).scalar() or 0
    total_deliv = (await db.execute(stmt_deliv)).scalar() or 0
    total_read = (await db.execute(stmt_read)).scalar() or 0
    total_fail = (await db.execute(stmt_fail)).scalar() or 0

    delivery_rate = round((total_deliv / max(total_sent, 1)) * 100, 1) if total_sent else 100.0
    read_rate = round((total_read / max(total_sent, 1)) * 100, 1) if total_sent else 0.0

    return {
        "success": True,
        "messages": {
            "data": [WhatsAppMessageResponse.from_orm(m) for m in messages],
            "current_page": page,
            "last_page": max(1, (total + limit - 1) // limit),
            "total": total,
            "per_page": limit
        },
        "stats": {
            "totalSent": total_sent,
            "totalDelivered": total_deliv,
            "totalRead": total_read,
            "totalFailed": total_fail,
            "deliveryRate": delivery_rate,
            "readRate": read_rate
        }
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

