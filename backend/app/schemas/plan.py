from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class PlanBase(BaseModel):
    nombre: str
    codigo: str
    descripcion: Optional[str] = None
    precio_regular_mensual: float = 0.0
    precio_promocional_mensual: float = 0.0
    precio_3_meses: float = 0.0
    precio_6_meses: float = 0.0
    precio_12_meses: float = 0.0
    precio_mensual: float = 0.0
    precio_anual: float = 0.0
    sucursales_incluidas: int = 1
    precio_sucursal_extra_mensual: float = 15.0
    max_usuarios: int = 3
    max_sucursales: int = 1
    max_mensajes_whatsapp: int = 100
    tiene_promocion: bool = False
    badge_promocion: Optional[str] = None
    destacado: bool = False
    orden: int = 1
    activo: bool = True
    modulos_permitidos: Optional[List[str]] = []

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    precio_regular_mensual: Optional[float] = None
    precio_promocional_mensual: Optional[float] = None
    precio_3_meses: Optional[float] = None
    precio_6_meses: Optional[float] = None
    precio_12_meses: Optional[float] = None
    precio_mensual: Optional[float] = None
    precio_anual: Optional[float] = None
    sucursales_incluidas: Optional[int] = None
    precio_sucursal_extra_mensual: Optional[float] = None
    max_usuarios: Optional[int] = None
    max_sucursales: Optional[int] = None
    max_mensajes_whatsapp: Optional[int] = None
    tiene_promocion: Optional[bool] = None
    badge_promocion: Optional[str] = None
    destacado: Optional[bool] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None
    modulos_permitidos: Optional[List[str]] = None

class PlanResponse(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SuscripcionMetricas(BaseModel):
    usuarios_usados: int
    max_usuarios: int
    usuarios_porcentaje: float
    
    sucursales_usadas: int
    max_sucursales: int
    sucursales_porcentaje: float
    
    mensajes_whatsapp_mes: int
    max_mensajes_whatsapp: int
    whatsapp_porcentaje: float

class MetodosPagoMasterResponse(BaseModel):
    banco_nombre: Optional[str] = None
    banco_tipo_cuenta: Optional[str] = None
    banco_numero_cuenta: Optional[str] = None
    banco_titular: Optional[str] = None
    banco_doc_identidad: Optional[str] = None
    pagomovil_banco: Optional[str] = None
    pagomovil_telefono: Optional[str] = None
    pagomovil_doc_identidad: Optional[str] = None

class SuscripcionEmpresaResponse(BaseModel):
    empresa_id: int
    empresa_nombre: str
    plan_activo: Optional[PlanResponse] = None
    plan_estado: str # "activo", "vencido", "prueba"
    fecha_inicio: Optional[datetime] = None
    plan_vencimiento: Optional[datetime] = None
    metricas: SuscripcionMetricas
    modulos_permitidos: List[str]
    metodos_pago_master: Optional[MetodosPagoMasterResponse] = None
    tasa_bcv_eur: Optional[float] = None

class CambiarPlanRequest(BaseModel):
    plan_id: int
    ciclo: Optional[str] = "mensual" # "mensual" o "anual"

class AdminUpdateSuscripcionRequest(BaseModel):
    plan_id: Optional[int] = None
    plan_estado: Optional[str] = None # "activo", "vencido", "prueba"
    plan_vencimiento: Optional[datetime] = None

