from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.permiso import PermisoResponse

class RolBase(BaseModel):
    nombre: str
    slug: str
    descripcion: Optional[str] = None
    activo: bool = True

class RolCreate(RolBase):
    permisos_ids: Optional[List[int]] = []

class RolUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    permisos_ids: Optional[List[int]] = None

class RolResponse(RolBase):
    id: int
    es_sistema: bool
    created_at: datetime
    updated_at: datetime
    permisos: List[PermisoResponse] = []

    class Config:
        from_attributes = True
