from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.schemas.rol import RolResponse
from app.schemas.empresa import EmpresaResponse
from app.schemas.sucursal import SucursalResponse

class UsuarioBase(BaseModel):
    nombre: str
    apellido: str
    email: EmailStr
    telefono: Optional[str] = None
    avatar_url: Optional[str] = None
    activo: bool = True
    empresa_id: Optional[int] = None
    sucursal_defecto_id: Optional[int] = None
    rol_id: int

class UsuarioCreate(UsuarioBase):
    password: str
    sucursales_ids: Optional[List[int]] = []

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    avatar_url: Optional[str] = None
    activo: Optional[bool] = None
    empresa_id: Optional[int] = None
    sucursal_defecto_id: Optional[int] = None
    rol_id: Optional[int] = None
    password: Optional[str] = None
    sucursales_ids: Optional[List[int]] = None

class UsuarioSucursalItem(BaseModel):
    sucursal: SucursalResponse

    class Config:
        from_attributes = True

class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: EmailStr
    telefono: Optional[str] = None
    avatar_url: Optional[str] = None
    activo: bool
    es_superadmin: bool
    empresa_id: Optional[int] = None
    sucursal_defecto_id: Optional[int] = None
    rol_id: int
    whatsapp_verified: Optional[bool] = False
    whatsapp_otp_code: Optional[str] = None
    ultimo_acceso: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    rol: Optional[RolResponse] = None
    empresa: Optional[EmpresaResponse] = None
    sucursal_defecto: Optional[SucursalResponse] = None
    sucursales_asignadas: List[UsuarioSucursalItem] = []

    class Config:
        from_attributes = True
