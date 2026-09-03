from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field

class SubespecialidadItem(BaseModel):
    id: Optional[str] = None
    nombre: str
    nivel_experiencia: str = "Especialista Titular (4-8 años)"
    anos_servicio: int = 1
    certificado_folio: Optional[str] = None

class MedicoBase(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    tipo_documento: str = Field("V", max_length=20)
    documento_identidad: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    pais_telefono_id: Optional[int] = None
    telefono: Optional[str] = None
    licencia_medica: Optional[str] = None
    especialidad_id: int
    subespecialidades: List[SubespecialidadItem] = []
    color: str = "#0d9488"
    sucursal_defecto_id: Optional[int] = None
    sucursales_ids: List[int] = []
    biografia: Optional[str] = None
    activo: bool = True

class MedicoCreate(MedicoBase):
    crear_usuario: bool = True
    password: Optional[str] = None
    rol_id: Optional[int] = None
    empresa_id: Optional[int] = None

class MedicoUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    tipo_documento: Optional[str] = None
    documento_identidad: Optional[str] = None
    email: Optional[EmailStr] = None
    pais_telefono_id: Optional[int] = None
    telefono: Optional[str] = None
    licencia_medica: Optional[str] = None
    especialidad_id: Optional[int] = None
    subespecialidades: Optional[List[SubespecialidadItem]] = None
    color: Optional[str] = None
    sucursal_defecto_id: Optional[int] = None
    sucursales_ids: Optional[List[int]] = None
    biografia: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None  # Para actualizar contraseña del usuario vinculado

class MedicoResponse(MedicoBase):
    id: int
    empresa_id: int
    usuario_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Campos enriquecidos para la UI
    especialidad_nombre: Optional[str] = None
    especialidad_codigo: Optional[str] = None
    especialidad_color: Optional[str] = None
    especialidad_icono: Optional[str] = None
    pais_nombre: Optional[str] = None
    pais_codigo_iso2: Optional[str] = None
    pais_codigo_telefonico: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    usuario_activo: Optional[bool] = None

    class Config:
        from_attributes = True
