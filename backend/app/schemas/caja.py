from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ── CAJAS FÍSICAS O VIRTUALES ───────────────────────────────────────
class CajaBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre de la caja (ej. 'Caja Principal')")
    descripcion: Optional[str] = None
    activa: bool = True
    sucursal_id: int


class CajaCreate(CajaBase):
    pass


class CajaUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None
    sucursal_id: Optional[int] = None


class CajaResponse(CajaBase):
    id: int
    empresa_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── TURNOS DE CAJA & ARQUEO ──────────────────────────────────────────
class TurnoAperturaRequest(BaseModel):
    caja_id: int
    sucursal_id: int
    fondo_inicial_usd: float = Field(0.00, ge=0)
    fondo_inicial_ves: float = Field(0.00, ge=0)
    notas_apertura: Optional[str] = None


class TurnoCierreRequest(BaseModel):
    arqueo_declarado_usd: float = Field(..., ge=0, description="Efectivo físico USD contado en caja")
    arqueo_declarado_ves: float = Field(..., ge=0, description="Efectivo físico VES contado en caja")
    notas_cierre: Optional[str] = None


class TurnoCajaResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: int
    caja_id: int
    caja_nombre: Optional[str] = None
    usuario_id: int
    cajero_nombre: Optional[str] = None
    apertura_at: datetime
    cierre_at: Optional[datetime] = None
    estado: str
    fondo_inicial_usd: float
    fondo_inicial_ves: float
    total_ingresos_usd: float
    total_ingresos_ves: float
    total_ingresos_eur: float
    total_egresos_usd: float
    total_egresos_ves: float
    arqueo_declarado_usd: Optional[float] = None
    arqueo_declarado_ves: Optional[float] = None
    diferencia_usd: Optional[float] = None
    diferencia_ves: Optional[float] = None
    notas_apertura: Optional[str] = None
    notas_cierre: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── MOVIMIENTOS EXTRAORDINARIOS DE CAJA CHICA ─────────────────────────
class MovimientoCajaCreateRequest(BaseModel):
    turno_caja_id: int
    tipo: str = Field(..., description="'ingreso' o 'egreso'")
    concepto: str = Field(..., max_length=255)
    moneda: str = Field("USD", description="'USD' o 'VES'")
    monto: float = Field(..., gt=0)
    comprobante_adjunto: Optional[str] = None


class MovimientoCajaResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: int
    turno_caja_id: int
    usuario_id: int
    usuario_nombre: Optional[str] = None
    tipo: str
    concepto: str
    moneda: str
    monto: float
    comprobante_adjunto: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── COBROS & FACTURACIÓN ─────────────────────────────────────────────
class CobroDetalleItemRequest(BaseModel):
    servicio_id: Optional[int] = None
    tipo_concepto: str = "servicio"  # "consulta", "servicio", "odontologia", "estudio", "insumo", "otro"
    descripcion: str = Field(..., max_length=255)
    cantidad: int = Field(1, ge=1)
    precio_unitario_divisa: float = Field(..., ge=0)
    diente_fdi: Optional[int] = None


class CobroPagoItemRequest(BaseModel):
    metodo: str  # "efectivo_usd", "efectivo_ves", "efectivo_eur", "pago_movil", "punto_venta", "transferencia", "zelle", "pasarela"
    moneda: str  # "USD", "VES", "EUR"
    monto_moneda_origen: float = Field(..., gt=0)
    banco_origen: Optional[str] = None
    banco_destino: Optional[str] = None
    referencia: Optional[str] = None
    lote_punto: Optional[str] = None
    ultimos_digitos_tarjeta: Optional[str] = None
    notas: Optional[str] = None


class CobroCreateRequest(BaseModel):
    turno_caja_id: int
    sucursal_id: int
    paciente_id: int
    medico_id: Optional[int] = None
    cita_id: Optional[int] = None
    consulta_id: Optional[int] = None
    descuento_divisa: float = Field(0.00, ge=0)
    detalles: List[CobroDetalleItemRequest]
    pagos: List[CobroPagoItemRequest]
    notas: Optional[str] = None


class CobroDetalleResponse(BaseModel):
    id: int
    servicio_id: Optional[int] = None
    tipo_concepto: str
    descripcion: str
    cantidad: int
    precio_unitario_divisa: float
    subtotal_divisa: float
    subtotal_ves: float
    diente_fdi: Optional[int] = None

    class Config:
        from_attributes = True


class CobroPagoResponse(BaseModel):
    id: int
    metodo: str
    moneda: str
    monto_moneda_origen: float
    tasa_cambio: float
    monto_equivalente_divisa: float
    banco_origen: Optional[str] = None
    banco_destino: Optional[str] = None
    referencia: Optional[str] = None
    lote_punto: Optional[str] = None
    ultimos_digitos_tarjeta: Optional[str] = None
    notas: Optional[str] = None

    class Config:
        from_attributes = True


class CobroResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: int
    turno_caja_id: int
    cajero_id: int
    cajero_nombre: Optional[str] = None
    paciente_id: int
    paciente_nombre: Optional[str] = None
    paciente_documento: Optional[str] = None
    paciente_telefono: Optional[str] = None
    medico_id: Optional[int] = None
    medico_nombre: Optional[str] = None
    cita_id: Optional[int] = None
    consulta_id: Optional[int] = None
    numero_recibo: str
    fecha_emision: datetime
    moneda_referencia: str
    tasa_bcv_aplicada: float
    fuente_tasa: Optional[str] = None
    subtotal_divisa: float
    descuento_divisa: float
    total_divisa: float
    total_ves: float
    monto_pagado_divisa: float
    monto_vuelto_divisa: float
    monto_vuelto_ves: float
    estado: str
    motivo_anulacion: Optional[str] = None
    anulado_at: Optional[datetime] = None
    notas: Optional[str] = None
    detalles: List[CobroDetalleResponse] = []
    pagos: List[CobroPagoResponse] = []

    class Config:
        from_attributes = True
