from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class SucursalSummary(BaseModel):
    id: int
    nombre: str
    codigo: Optional[str] = None

    class Config:
        from_attributes = True

class EspecialidadBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    codigo: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = None
    color: Optional[str] = Field("#0ea5e9", max_length=30)
    icono: Optional[str] = Field("Stethoscope", max_length=50)
    activo: bool = True
    sucursal_id: Optional[int] = None

class EspecialidadCreate(EspecialidadBase):
    empresa_id: Optional[int] = None

class EspecialidadUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    codigo: Optional[str] = Field(None, max_length=50)
    descripcion: Optional[str] = None
    color: Optional[str] = Field(None, max_length=30)
    icono: Optional[str] = Field(None, max_length=50)
    activo: Optional[bool] = None
    sucursal_id: Optional[int] = None

class EspecialidadResponse(EspecialidadBase):
    id: int
    empresa_id: int
    created_at: datetime
    updated_at: datetime
    sucursal: Optional[SucursalSummary] = None

    class Config:
        from_attributes = True
