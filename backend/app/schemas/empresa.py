from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.schemas.pais import PaisResponse
from app.schemas.plan import PlanResponse

class EmpresaBase(BaseModel):
    nombre: str
    identificacion_fiscal: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    logo_url: Optional[str] = None
    logo_mini_url: Optional[str] = None
    logo_mini_dark_url: Optional[str] = None
    pais_id: Optional[int] = None
    pais_telefono_id: Optional[int] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    plan_id: Optional[int] = None
    plan_vencimiento: Optional[datetime] = None
    plan_estado: Optional[str] = "activo"
    activo: bool = True
    # Métodos de Pago
    banco_nombre: Optional[str] = None
    banco_tipo_cuenta: Optional[str] = None
    banco_numero_cuenta: Optional[str] = None
    banco_titular: Optional[str] = None
    banco_doc_identidad: Optional[str] = None
    pagomovil_banco: Optional[str] = None
    pagomovil_telefono: Optional[str] = None
    pagomovil_doc_identidad: Optional[str] = None

class EmpresaCreate(EmpresaBase):
    pass

class EmpresaUpdate(BaseModel):
    nombre: Optional[str] = None
    identificacion_fiscal: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    logo_url: Optional[str] = None
    logo_mini_url: Optional[str] = None
    logo_mini_dark_url: Optional[str] = None
    pais_id: Optional[int] = None
    pais_telefono_id: Optional[int] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    plan_id: Optional[int] = None
    plan_vencimiento: Optional[datetime] = None
    plan_estado: Optional[str] = None
    activo: Optional[bool] = None
    # Métodos de Pago
    banco_nombre: Optional[str] = None
    banco_tipo_cuenta: Optional[str] = None
    banco_numero_cuenta: Optional[str] = None
    banco_titular: Optional[str] = None
    banco_doc_identidad: Optional[str] = None
    pagomovil_banco: Optional[str] = None
    pagomovil_telefono: Optional[str] = None
    pagomovil_doc_identidad: Optional[str] = None

class EmpresaResponse(EmpresaBase):
    id: int
    pais: Optional[PaisResponse] = None
    pais_telefono: Optional[PaisResponse] = None
    plan: Optional[PlanResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
