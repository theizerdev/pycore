from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

class EspecialidadMiniServicio(BaseModel):
    id: int
    nombre: str
    codigo: Optional[str] = None
    color: Optional[str] = None
    icono: Optional[str] = None

    class Config:
        from_attributes = True

class SucursalMiniServicio(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True

class ServicioBase(BaseModel):
    especialidad_id: int
    sucursal_id: Optional[int] = None
    codigo: Optional[str] = Field(None, max_length=50)
    nombre: str = Field(..., min_length=2, max_length=200)
    descripcion: Optional[str] = None
    categoria: str = Field(default="Consulta", max_length=80)
    precio_base: Decimal = Field(default=Decimal("0.00"), ge=0)
    duracion_estimada_minutos: int = Field(default=30, ge=5, le=480)
    preparacion_requerida: Optional[str] = None
    requiere_medico: bool = True
    color: Optional[str] = Field(default="#0ea5e9", max_length=30)
    activo: bool = True

class ServicioCreate(ServicioBase):
    pass

class ServicioUpdate(BaseModel):
    especialidad_id: Optional[int] = None
    sucursal_id: Optional[int] = None
    codigo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    precio_base: Optional[Decimal] = None
    duracion_estimada_minutos: Optional[int] = None
    preparacion_requerida: Optional[str] = None
    requiere_medico: Optional[bool] = None
    color: Optional[str] = None
    activo: Optional[bool] = None

class ServicioResponse(ServicioBase):
    id: int
    empresa_id: int
    especialidad: Optional[EspecialidadMiniServicio] = None
    sucursal: Optional[SucursalMiniServicio] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
