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

    # WhatsApp
    whatsapp_active: bool = False
    whatsapp_api_url: Optional[str] = "https://whatsapp.theizerdev.com"
    whatsapp_api_key: Optional[str] = None
    whatsapp_instance: Optional[str] = None
    whatsapp_connected: bool = False
    whatsapp_rate_limit: int = 300
    whatsapp_warmup_mode: bool = True
    whatsapp_working_hours_enabled: bool = True
    whatsapp_working_hours_start: str = "08:00"
    whatsapp_working_hours_end: str = "20:00"
    whatsapp_proxy_url: Optional[str] = None

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
    whatsapp_api_url: str = Field(default="https://whatsapp.theizerdev.com")
    whatsapp_instance: str = Field(...)
    whatsapp_api_key: Optional[str] = None
    whatsapp_active: bool = True


# ── WhatsApp Anti-Baneo & Diagnóstico ──────────────────────────────────
class AntiBanUpdateRequest(BaseModel):
    dailyLimit: int = Field(default=300, ge=10, le=5000)
    warmupMode: bool = True
    workingHoursEnabled: bool = True
    workingHoursStart: str = "08:00"
    workingHoursEnd: str = "20:00"
    proxyUrl: Optional[str] = None


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
    dailyLimit: int = 300
    queued: int = 0
    totalQueued: int = 0
    warmupMode: bool = True
    workingHoursEnabled: bool = True
    workingHoursStart: str = "08:00"
    workingHoursEnd: str = "20:00"
    proxyUrl: Optional[str] = None


class WhatsAppDiagnosticResponse(BaseModel):
    service_online: bool
    latency_ms: float
    memory_usage: str
    api_url: str
    instance: str
    socket_state: str
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
    delay_seconds: int = Field(default=15, ge=2, le=120)
    variables: Optional[Dict[str, Any]] = None


# ── WhatsApp Básico & Plantillas ────────────────────────────────────────
class WhatsAppStatusResponse(BaseModel):
    is_connected: bool = False
    connection_state: str = "DISCONNECTED" # CONNECTED, QR_READY, CONNECTING, DISCONNECTED
    qr_code: Optional[str] = None
    qr_data_url: Optional[str] = None
    instance_name: str
    phone_number: Optional[str] = None
    last_sync: Optional[datetime] = None


class WhatsAppSendTestRequest(BaseModel):
    phone: str = Field(..., description="Número de teléfono con código de país (ej. +584121234567)")
    message: str = Field(..., description="Texto del mensaje a enviar")
    sync: bool = False
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
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_content: str
    variables: Optional[Dict[str, Any]] = None
    status: str
    direction: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None
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


class TasasActualesResponse(BaseModel):
    tasas: Dict[str, Optional[TasaItemDetail]]
    sincronizado_at: str


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

