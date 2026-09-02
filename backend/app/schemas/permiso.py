from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PermisoBase(BaseModel):
    sector: str = "seguridad"
    modulo: str
    accion: str
    slug: str
    descripcion: Optional[str] = None

class PermisoResponse(PermisoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class PermisosPorModulo(BaseModel):
    modulo: str
    permisos: List[PermisoResponse]

class PermisosPorSector(BaseModel):
    sector: str
    titulo: str
    descripcion: Optional[str] = None
    modulos: List[PermisosPorModulo]
