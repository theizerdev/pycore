from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.pais import PaisResponse

class SucursalBase(BaseModel):
    empresa_id: int
    pais_id: Optional[int] = None
    pais_telefono_id: Optional[int] = None
    nombre: str
    codigo: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    activo: bool = True
    
    # WhatsApp
    whatsapp_active: bool = False
    whatsapp_api_url: Optional[str] = "https://whatsapp.theizerdev.com"
    whatsapp_api_key: Optional[str] = None
    whatsapp_instance: Optional[str] = None
    whatsapp_connected: bool = False
    whatsapp_status: Optional[str] = "disconnected"
    whatsapp_phone: Optional[str] = None
    whatsapp_rate_limit: int = 300
    whatsapp_warmup_mode: bool = True
    whatsapp_working_hours_enabled: bool = True
    whatsapp_working_hours_start: str = "08:00"
    whatsapp_working_hours_end: str = "20:00"
    whatsapp_proxy_url: Optional[str] = None

class SucursalCreate(SucursalBase):
    pass

class SucursalUpdate(BaseModel):
    empresa_id: Optional[int] = None
    pais_id: Optional[int] = None
    pais_telefono_id: Optional[int] = None
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    activo: Optional[bool] = None

    whatsapp_active: Optional[bool] = None
    whatsapp_api_url: Optional[str] = None
    whatsapp_api_key: Optional[str] = None
    whatsapp_instance: Optional[str] = None
    whatsapp_connected: Optional[bool] = None
    whatsapp_status: Optional[str] = None
    whatsapp_phone: Optional[str] = None
    whatsapp_rate_limit: Optional[int] = None
    whatsapp_warmup_mode: Optional[bool] = None
    whatsapp_working_hours_enabled: Optional[bool] = None
    whatsapp_working_hours_start: Optional[str] = None
    whatsapp_working_hours_end: Optional[str] = None
    whatsapp_proxy_url: Optional[str] = None

class SucursalResponse(SucursalBase):
    id: int
    pais: Optional[PaisResponse] = None
    pais_telefono: Optional[PaisResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
