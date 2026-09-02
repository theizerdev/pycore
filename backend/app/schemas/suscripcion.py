from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.plan import PlanResponse

class PagoSuscripcionBase(BaseModel):
    suscripcion_id: Optional[int] = None
    plan_id: Optional[int] = None
    monto: float
    ciclo_meses: int = 1
    sucursales_contratadas: int = 1
    metodo_pago: str # "transferencia", "pago_movil", "paypal", "stripe", "mercadopago"
    referencia_pago: Optional[str] = None
    comprobante_path: Optional[str] = None
    notas: Optional[str] = None

class ReportarPagoRequest(BaseModel):
    plan_id: Optional[int] = None
    ciclo_meses: int = 1
    sucursales_contratadas: int = 1
    metodo_pago: str
    referencia_pago: Optional[str] = None
    comprobante_base64: Optional[str] = None
    notas: Optional[str] = None

class PagoSuscripcionResponse(PagoSuscripcionBase):
    id: int
    empresa_id: int
    usuario_id: Optional[int] = None
    estado: str # "pending", "approved", "rejected"
    aprobado_por_id: Optional[int] = None
    aprobado_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    plan: Optional[PlanResponse] = None

    class Config:
        from_attributes = True

class SuscripcionDetalleResponse(BaseModel):
    id: int
    empresa_id: int
    plan_id: Optional[int] = None
    nombre_plan: str
    ciclo_meses: int
    max_sucursales: int
    monto_total: float
    fecha_inicio: datetime
    fecha_vencimiento: datetime
    estado: str # "active", "trial", "expired", "cancelled"
    dias_restantes: int
    estado_legible: str
    plan: Optional[PlanResponse] = None

    class Config:
        from_attributes = True

class AprobarPagoRequest(BaseModel):
    notas: Optional[str] = None

class RechazarPagoRequest(BaseModel):
    notas: str

