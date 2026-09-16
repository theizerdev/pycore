from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ChatMensajeCreate(BaseModel):
    contenido: Optional[str] = None
    tipo: str = "texto"  # 'texto' | 'audio' | 'imagen' | 'documento'
    archivo_url: Optional[str] = None
    archivo_nombre: Optional[str] = None
    archivo_tamano: Optional[int] = None
    archivo_tipo: Optional[str] = None
    duracion_audio: Optional[float] = None


class ChatMensajeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    canal_id: int
    empresa_id: int
    sucursal_id: int
    remitente_id: int
    remitente_nombre: str
    remitente_rol: str
    remitente_rol_slug: str
    remitente_avatar: Optional[str] = None
    tipo: str
    contenido: Optional[str] = None
    archivo_url: Optional[str] = None
    archivo_nombre: Optional[str] = None
    archivo_tamano: Optional[int] = None
    archivo_tipo: Optional[str] = None
    duracion_audio: Optional[float] = None
    created_at: datetime


class ChatParticipanteSimple(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    usuario_id: int
    nombre: str
    apellido: str
    rol: str
    rol_slug: str
    avatar_url: Optional[str] = None
    ultimo_leido_at: Optional[datetime] = None


class ChatCanalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    empresa_id: int
    sucursal_id: int
    sucursal_nombre: str
    tipo: str  # 'canal_sucursal' | 'directo'
    nombre: str
    descripcion: Optional[str] = None
    activo: bool
    ultimo_mensaje: Optional[ChatMensajeResponse] = None
    no_leidos: int = 0
    participantes: List[ChatParticipanteSimple] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class ChatPersonalItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    apellido: str
    email: str
    rol: str
    rol_slug: str  # 'medico' | 'enfermeria' | 'recepcion' | 'admin-clinica'
    avatar_url: Optional[str] = None
    sucursal_id: int
    sucursal_nombre: str
    activo: bool
    canal_directo_id: Optional[int] = None


class ChatUnreadSummary(BaseModel):
    total_no_leidos: int
    canales: Dict[int, int] = {}
