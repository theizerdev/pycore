from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class GotaItem(BaseModel):
    numero: int
    tipo_gota: str  # "1ra Gota", "2da Gota", "3ra Gota", "Gota Refuerzo"
    hora: str  # HH:mm:ss
    timestamp: int  # epoch ms
    quien_instilo: str
    observaciones: Optional[str] = None

class InstilacionOftalmicaBase(BaseModel):
    sucursal_id: int
    paciente_id: Optional[int] = None
    paciente_nombre: str
    paciente_documento: Optional[str] = None
    paciente_edad: Optional[int] = None
    alergias: Optional[str] = None
    medico_id: Optional[int] = None
    medico_nombre: Optional[str] = None
    cita_id: Optional[int] = None
    consulta_id: Optional[int] = None
    tipo: str = "Midriática"
    farmaco: str = "Tropicamida 1%"
    ojo: str = "Ambos"
    es_pediatrico: bool = False
    quien_instilo: Optional[str] = None
    observaciones: Optional[str] = None
    tiempo_recomendado_min: int = 25

class InstilacionOftalmicaCreate(InstilacionOftalmicaBase):
    pass

class InstilacionGotaAdd(BaseModel):
    tipo_gota: str = "Gota Refuerzo"  # "2da Gota", "3ra Gota", "Gota Refuerzo"
    quien_instilo: Optional[str] = None
    observaciones: Optional[str] = None

class InstilacionEstadoUpdate(BaseModel):
    estado: str  # 'en_espera' | 'dilatado_listo' | 'en_consulta' | 'finalizado' | 'cancelado'

class InstilacionOftalmicaResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: int
    paciente_id: Optional[int] = None
    paciente_nombre: str
    paciente_documento: Optional[str] = None
    paciente_edad: Optional[int] = None
    alergias: Optional[str] = None
    medico_id: Optional[int] = None
    medico_nombre: Optional[str] = None
    cita_id: Optional[int] = None
    consulta_id: Optional[int] = None
    tipo: str
    farmaco: str
    ojo: str
    es_pediatrico: bool
    quien_instilo: str
    usuario_id_instilo: Optional[int] = None
    estado: str
    total_gotas: int
    hora_primera_gota: Optional[str] = None
    hora_ultima_gota: Optional[str] = None
    gotas: List[Any] = []
    observaciones: Optional[str] = None
    tiempo_recomendado_min: int
    notificado_chat: bool
    notificado_whatsapp: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
