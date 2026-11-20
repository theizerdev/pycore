from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ── Configuraciones Generales ───────────────────────────────────────────
class IntegracionesConfigResponse(BaseModel):
    # Mapas & MapTiler
    maptiler_api_key: Optional[str] = None
    maptiler_active: bool = True
    mapbox_api_key: Optional[str] = None
    mapbox_active: bool = False
    google_maps_api_key: Optional[str] = None
    google_maps_active: bool = False

    # WhatsApp (Motor Nativo Python Neonize)
    whatsapp_active: bool = False
    whatsapp_api_url: Optional[str] = "python://local"
    whatsapp_api_key: Optional[str] = None
    whatsapp_instance: Optional[str] = None
    whatsapp_connected: bool = False
    whatsapp_status: Optional[str] = "disconnected"
    whatsapp_phone: Optional[str] = None
    whatsapp_rate_limit: int = 200
    whatsapp_hourly_limit: int = 25
    whatsapp_warmup_mode: bool = True
    whatsapp_working_hours_enabled: bool = True
    whatsapp_working_hours_start: str = "08:00"
    whatsapp_working_hours_end: str = "20:00"
    whatsapp_simulate_typing: bool = True
    whatsapp_typing_min_sec: float = 2.0
    whatsapp_typing_max_sec: float = 6.0
    whatsapp_delay_min_sec: int = 8
    whatsapp_delay_max_sec: int = 20
    whatsapp_batch_size: int = 10
    whatsapp_batch_pause_sec: int = 60
    whatsapp_verify_number: bool = True
    whatsapp_queue_paused: bool = False
    whatsapp_proxy_url: Optional[str] = None
    is_sucursal: bool = False
    sucursal_id: Optional[int] = None
    sucursal_nombre: Optional[str] = None
    using_fallback: bool = False

    # Pasarelas
    paypal_active: bool = False
    paypal_mode: str = "sandbox"
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None

    stripe_active: bool = False
    stripe_mode: str = "test"
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None

    mercadopago_active: bool = False
    mercadopago_mode: str = "sandbox"
    mercadopago_public_key: Optional[str] = None
    mercadopago_access_token: Optional[str] = None

    # Jitsi Meet — Motor Principal WorkSpace & Telemedicina
    jitsi_active: bool = True
    jitsi_provider: str = "public" # "public", "self_hosted", "jaas"
    jitsi_domain: str = "meet.jit.si"
    jitsi_app_id: Optional[str] = None
    jitsi_jwt_secret: Optional[str] = None
    jitsi_key_id: Optional[str] = None
    jitsi_room_prefix: str = "medisoft"
    jitsi_lobby_enabled: bool = True
    jitsi_recording_enabled: bool = False
    jitsi_e2ee_enabled: bool = False
    telemedicina_requiere_pago: bool = True
    telemedicina_consentimiento_texto: Optional[str] = None

    # Tasa BCV
    bcv_rate_cached: Optional[float] = None
    bcv_rate_updated_at: Optional[datetime] = None


class UpdateMapsRequest(BaseModel):
    maptiler_api_key: Optional[str] = None
    maptiler_active: bool = True
    mapbox_api_key: Optional[str] = None
    mapbox_active: bool = False
    google_maps_api_key: Optional[str] = None
    google_maps_active: bool = False


class UpdatePagosRequest(BaseModel):
    paypal_active: bool = False
    paypal_mode: str = "sandbox"
    paypal_client_id: Optional[str] = None
    paypal_client_secret: Optional[str] = None

    stripe_active: bool = False
    stripe_mode: str = "test"
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None

    mercadopago_active: bool = False
    mercadopago_mode: str = "sandbox"
    mercadopago_public_key: Optional[str] = None
    mercadopago_access_token: Optional[str] = None


class UpdateWhatsAppServerRequest(BaseModel):
    whatsapp_api_url: str = Field(default="python://local")
    whatsapp_instance: str = Field(...)
    whatsapp_api_key: Optional[str] = None
    whatsapp_active: bool = True


# ── WhatsApp Anti-Baneo, Instancias & Diagnóstico (Python Nativo) ──────
class AntiBanUpdateRequest(BaseModel):
    dailyLimit: int = Field(default=200, ge=10, le=2000)
    hourlyLimit: int = Field(default=25, ge=5, le=200)
    warmupMode: bool = True
    workingHoursEnabled: bool = True
    workingHoursStart: str = "08:00"
    workingHoursEnd: str = "20:00"
    simulateTyping: bool = True
    typingMinSec: float = Field(default=2.0, ge=1.0, le=15.0)
    typingMaxSec: float = Field(default=6.0, ge=1.5, le=25.0)
    delayMinSec: int = Field(default=8, ge=3, le=120)
    delayMaxSec: int = Field(default=20, ge=5, le=240)
    batchSize: int = Field(default=10, ge=3, le=100)
    batchPauseSec: int = Field(default=60, ge=15, le=600)
    verifyNumber: bool = True
    proxyUrl: Optional[str] = None


class WhatsAppPairPhoneRequest(BaseModel):
    phone: str = Field(..., description="Número de WhatsApp a vincular con código de 8 dígitos")


class WhatsAppQueueToggleRequest(BaseModel):
    paused: bool
    reason: Optional[str] = None


class WhatsAppInstanceSummary(BaseModel):
    instance_name: str
    label: str
    is_sucursal: bool = False
    sucursal_id: Optional[int] = None
    connection_state: str = "DISCONNECTED"
    is_connected: bool = False
    phone_number: Optional[str] = None
    push_name: Optional[str] = None
    sent_today: int = 0
    effective_daily_limit: int = 20
    daily_limit: int = 200
    sent_this_hour: int = 0
    hourly_limit: int = 25
    queued: int = 0
    warmup_mode: bool = True
    warmup_day: int = 1
    queue_paused: bool = False
    pause_reason: Optional[str] = None
    currently_typing_to: Optional[str] = None
    safety_score: int = 100
    has_saved_session: bool = False


class CheckNumberRequest(BaseModel):
    phone: str = Field(...)


class CheckNumberResponse(BaseModel):
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PreviewSpintaxRequest(BaseModel):
    text: str = Field(...)
    count: int = 4
    variables: Optional[Dict[str, Any]] = None


class PreviewSpintaxResponse(BaseModel):
    success: bool
    variations: List[str]


class WhatsAppQueueStatsResponse(BaseModel):
    sentToday: int = 0
    dailyLimit: int = 200
    effectiveDailyLimit: int = 20
    sentThisHour: int = 0
    hourlyLimit: int = 25
    queued: int = 0
    totalQueued: int = 0
    warmupMode: bool = True
    warmupDay: int = 1
    workingHoursEnabled: bool = True
    workingHoursStart: str = "08:00"
    workingHoursEnd: str = "20:00"
    withinWorkingHours: bool = True
    simulateTyping: bool = True
    typingMinSec: float = 2.0
    typingMaxSec: float = 6.0
    delayMinSec: int = 8
    delayMaxSec: int = 20
    batchSize: int = 10
    batchPauseSec: int = 60
    verifyNumber: bool = True
    queuePaused: bool = False
    pauseReason: Optional[str] = None
    currentlyTypingTo: Optional[str] = None
    safetyScore: int = 100
    safetyTips: List[str] = []
    proxyUrl: Optional[str] = None


class WhatsAppDiagnosticResponse(BaseModel):
    service_online: bool
    latency_ms: float
    memory_usage: str
    api_url: str
    instance: str
    socket_state: str
    thread_alive: bool = False
    phone_number: Optional[str] = None
    session_size_kb: float = 0.0
    queue_paused: bool = False
    active_instances_count: int = 0
    timestamp: str


# ── WhatsApp Difusión Masiva ──────────────────────────────────────────
class BroadcastRecipientItem(BaseModel):
    id: int
    name: str
    phone: str
    formatted_phone: str
    is_valid_phone: bool
    role: str
    type: str # 'paciente' | 'usuario' | 'medico'


class BroadcastDispatchRequest(BaseModel):
    recipient_ids: List[int]
    target_type: str = "pacientes"
    message: str
    delay_seconds: int = Field(default=15, ge=3, le=120)
    variables: Optional[Dict[str, Any]] = None


# ── WhatsApp Básico & Plantillas ────────────────────────────────────────
class WhatsAppStatusResponse(BaseModel):
    is_connected: bool = False
    connection_state: str = "DISCONNECTED" # CONNECTED, QR_READY, CONNECTING, DISCONNECTED, BANNED_COOLDOWN
    qr_code: Optional[str] = None
    qr_data_url: Optional[str] = None
    qr_expires_in: Optional[int] = None
    instance_name: str
    phone_number: Optional[str] = None
    push_name: Optional[str] = None
    currently_typing_to: Optional[str] = None
    queue_paused: bool = False
    pause_reason: Optional[str] = None
    last_error: Optional[str] = None
    engine: str = "python-neonize"
    has_saved_session: bool = False
    last_sync: Optional[datetime] = None
    is_sucursal: bool = False
    sucursal_id: Optional[int] = None
    sucursal_nombre: Optional[str] = None
    using_fallback: bool = False


class WhatsAppSendTestRequest(BaseModel):
    phone: str = Field(..., description="Número de teléfono con código de país (ej. +584121234567)")
    message: str = Field(..., description="Texto del mensaje a enviar")
    sync: bool = True
    simulate_typing: bool = True
    verify_number: Optional[bool] = None
    variables: Optional[Dict[str, Any]] = None


class WhatsAppTemplateCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    categoria: str = Field(default="general")
    contenido: str
    variables: Optional[List[str]] = None
    activo: bool = True


class WhatsAppTemplateUpdate(BaseModel):
    nombre: Optional[str] = None
    categoria: Optional[str] = None
    contenido: Optional[str] = None
    variables: Optional[List[str]] = None
    activo: Optional[bool] = None


class WhatsAppTemplateResponse(BaseModel):
    id: int
    empresa_id: int
    nombre: str
    categoria: str
    contenido: str
    variables: Optional[List[str]] = None
    activo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WhatsAppMessageResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: Optional[int] = None
    instance_name: Optional[str] = None
    external_message_id: Optional[str] = None
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_content: str
    variables: Optional[Dict[str, Any]] = None
    status: str
    direction: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ── Tasa BCV & Multidivisa (USD, EUR, USDT) ──────────────────────────
class BcvRateResponse(BaseModel):
    rate: float
    fuente: str
    fecha_actualizacion: str
    moneda_base: str = "USD"
    moneda_destino: str = "VES"
    exitoso: bool = True


class TasaCambioManualRequest(BaseModel):
    moneda: str = Field(..., description="USD, EUR o USDT")
    tasa: float = Field(..., gt=0, description="Monto en Bolívares (VES)")


class TasaItemDetail(BaseModel):
    id: Optional[int] = None
    moneda: str
    destino: str = "VES"
    tasa: float
    fuente: str
    variacion_24h: Optional[float] = 0.0
    variacion_mes: Optional[float] = 0.0
    fecha_tasa: Optional[str] = None
    created_at: Optional[str] = None
    es_oficial: bool = True


class SetMonedaCobroRequest(BaseModel):
    moneda: str = Field(..., description="Moneda a usar como tasa de cobro en el sistema: USD o EUR")


class TasasActualesResponse(BaseModel):
    tasas: Dict[str, Optional[TasaItemDetail]]
    sincronizado_at: str
    moneda_cobro_activa: str = "USD"
    tasa_cobro_activa: Optional[float] = None


class TasaHistoricoItem(BaseModel):
    id: int
    moneda: str
    destino: str = "VES"
    tasa: float
    fuente: str
    variacion_24h: Optional[float] = 0.0
    variacion_mes: Optional[float] = 0.0
    es_oficial: bool = True
    fecha_tasa: Optional[str] = None
    created_at: Optional[str] = None
    usuario: Optional[str] = "Sistema"


# ── Jitsi Meet — WorkSpace & Telemedicina ───────────────────────────────
class UpdateJitsiRequest(BaseModel):
    jitsi_active: bool = True
    jitsi_provider: str = Field(default="public", description="public | self_hosted | jaas")
    jitsi_domain: str = Field(default="meet.jit.si")
    jitsi_app_id: Optional[str] = None
    jitsi_jwt_secret: Optional[str] = None
    jitsi_key_id: Optional[str] = None
    jitsi_room_prefix: str = Field(default="medisoft")
    jitsi_lobby_enabled: bool = True
    jitsi_recording_enabled: bool = False
    jitsi_e2ee_enabled: bool = False
    telemedicina_requiere_pago: bool = True
    telemedicina_consentimiento_texto: Optional[str] = None


class JitsiDiagnosticResponse(BaseModel):
    healthy: bool
    service_online: bool
    provider: str
    domain: str
    external_api_url: str
    http_status: Optional[int] = None
    latency_ms: float
    jwt_configured: bool
    jwt_status_message: str
    error: Optional[str] = None
    checked_at: str


class JitsiSessionRequest(BaseModel):
    context_type: str = Field(default="workspace", description="test | workspace | teleconsulta | interconsulta")
    reference_id: Optional[int] = None
    custom_room: Optional[str] = None
    subject: Optional[str] = None
    as_moderator: bool = True


class JitsiSessionResponse(BaseModel):
    active: bool
    provider: str
    domain: str
    external_api_url: str
    room_name: str
    room_slug: str
    meeting_url: str
    jwt: Optional[str] = None
    is_moderator: bool
    subject: str
    user_info: Dict[str, Any]
    config_overwrite: Dict[str, Any]
    interface_config_overwrite: Dict[str, Any]
    warnings: List[str] = []


class JitsiGenerateSecretResponse(BaseModel):
    jitsi_app_id: str
    jitsi_jwt_secret: str


