from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class AuditoriaResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    empresa_id: Optional[int] = None
    accion: str
    modulo: str
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    detalles: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True
