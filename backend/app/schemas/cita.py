from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field

class CitaBase(BaseModel):
    sucursal_id: int
    medico_id: int
    especialidad_id: int
    servicio_id: Optional[int] = None
    paciente_id: int
    fecha: date
    hora_inicio: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # Ej. "09:00"
    hora_fin: str = Field(..., pattern=r"^\d{2}:\d{2}$")     # Ej. "09:30"
    duracion_minutos: int = 30
    motivo: str = Field(..., min_length=2, max_length=255)
    notas: Optional[str] = None

    # Servicio, precio y pagos
    precio_estimado: Optional[float] = 0.0
    estado_pago: Optional[str] = "pendiente"  # pendiente, pagado, aseguradora, exonerado
    metodo_pago: Optional[str] = None

    # Sobreturnos
    es_sobreturno: bool = False
    motivo_sobreturno: Optional[str] = None

class CitaCreate(CitaBase):
    notificar_whatsapp: bool = False

class CitaUpdate(BaseModel):
    sucursal_id: Optional[int] = None
    medico_id: Optional[int] = None
    especialidad_id: Optional[int] = None
    servicio_id: Optional[int] = None
    paciente_id: Optional[int] = None
    fecha: Optional[date] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    duracion_minutos: Optional[int] = None
    motivo: Optional[str] = None
    notas: Optional[str] = None
    precio_estimado: Optional[float] = None
    estado_pago: Optional[str] = None
    metodo_pago: Optional[str] = None
    es_sobreturno: Optional[bool] = None
    motivo_sobreturno: Optional[str] = None

class CitaCambiarEstado(BaseModel):
    estado: str = Field(..., description="programada, confirmada, sala_espera, en_consulta, atendida, cancelada, no_asistio")
    motivo_cancelacion: Optional[str] = None

class CitaCambiarPago(BaseModel):
    estado_pago: str = Field(..., description="pendiente, pagado, aseguradora, exonerado")
    metodo_pago: Optional[str] = None

class CitaResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: int
    medico_id: int
    especialidad_id: int
    servicio_id: Optional[int] = None
    paciente_id: int
    fecha: date
    hora_inicio: str
    hora_fin: str
    duracion_minutos: int
    motivo: str
    notas: Optional[str] = None
    estado: str
    motivo_cancelacion: Optional[str] = None

    # Datos comerciales y de pago
    servicio_nombre: Optional[str] = None
    precio_estimado: Optional[float] = 0.0
    estado_pago: str = "pendiente"
    metodo_pago: Optional[str] = None

    # Sobreturnos
    es_sobreturno: bool = False
    motivo_sobreturno: Optional[str] = None

    # Notificaciones WhatsApp
    whatsapp_notificado: bool = False
    whatsapp_notificado_at: Optional[datetime] = None
    recordatorio_enviado: bool = False
    recordatorio_enviado_at: Optional[datetime] = None

    # Información desnormalizada para FullCalendar
    paciente_nombre: str
    paciente_documento: str
    paciente_telefono: Optional[str] = None
    medico_nombre: str
    medico_color: str
    especialidad_nombre: str
    especialidad_color: str = "#8b5cf6"
    sucursal_nombre: str

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CitaNotificarWhatsAppResponse(BaseModel):
    success: bool
    mensaje_enviado: str
    destinatario: str
    whatsapp_direct_url: Optional[str] = None
    detalle: str

# ── Schemas de Bloqueo de Agenda ──
class BloqueoAgendaBase(BaseModel):
    medico_id: int
    sucursal_id: Optional[int] = None
    fecha: date
    hora_inicio: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    hora_fin: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    tipo: str = "personal"  # almuerzo, cirugia, reunion, personal, vacaciones
    motivo: str = Field(..., min_length=2, max_length=255)

class BloqueoAgendaCreate(BloqueoAgendaBase):
    pass

class BloqueoAgendaResponse(BloqueoAgendaBase):
    id: int
    empresa_id: int
    medico_nombre: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
