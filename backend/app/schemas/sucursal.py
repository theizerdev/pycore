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

class SucursalResponse(SucursalBase):
    id: int
    pais: Optional[PaisResponse] = None
    pais_telefono: Optional[PaisResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
