from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ConfiguracionComisionMedicoUpdate(BaseModel):
    tipo_comision: str = Field("porcentaje", description="'porcentaje' o 'fijo'")
    porcentaje_honorario: float = Field(70.00, ge=0.0, le=100.0)
    monto_fijo_honorario: float = Field(0.00, ge=0.0)
    datos_bancarios: Optional[Dict[str, Any]] = None


class ItemCalculoCobro(BaseModel):
    cobro_id: int
    numero_recibo: str
    fecha: str
    paciente_nombre: str
    paciente_documento: Optional[str] = None
    concepto: str
    monto_total_usd: float
    tipo_comision: str
    porcentaje_aplicado: float
    honorario_medico_usd: float
    retencion_clinica_usd: float


class MedicoMiniHonorario(BaseModel):
    id: int
    nombres: str
    apellidos: str
    nombre_completo: str
    especialidad: Optional[str] = None
    documento: Optional[str] = None
    tipo_comision: str
    porcentaje_honorario: float
    monto_fijo_honorario: float
    datos_bancarios: Optional[Dict[str, Any]] = None


class ResumenCalculoHonorariosResponse(BaseModel):
    medico: MedicoMiniHonorario
    periodo_desde: str
    periodo_hasta: str
    total_cobros: int
    monto_total_recaudado_usd: float
    monto_honorarios_usd: float
    monto_retencion_clinica_usd: float
    tasa_bcv: float
    monto_honorarios_ves: float
    # Estimaciones fiscales (Decreto 1.808 ISLR)
    porcentaje_islr_sugerido: float = 3.00
    monto_retencion_islr_estimado_usd: float = 0.00
    monto_retencion_islr_estimado_ves: float = 0.00
    monto_neto_estimado_usd: float = 0.00
    monto_neto_estimado_ves: float = 0.00
    cobros_pendientes: List[ItemCalculoCobro]


class LiquidarHonorariosRequest(BaseModel):
    medico_id: int
    sucursal_id: Optional[int] = None
    periodo_desde: str
    periodo_hasta: str
    cobros_ids: List[int]
    # Retención de ISLR (Decreto 1.808)
    aplicar_retencion_islr: bool = True
    porcentaje_retencion_islr: float = 3.00
    monto_deducciones_usd: float = 0.00
    motivo_deduccion: Optional[str] = None
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    banco_origen: Optional[str] = None
    banco_destino: Optional[str] = None
    marcar_como_pagado: bool = False
    notas: Optional[str] = None


class PagarLiquidacionRequest(BaseModel):
    metodo_pago: str
    referencia_pago: Optional[str] = None
    banco_origen: Optional[str] = None
    banco_destino: Optional[str] = None
    notas: Optional[str] = None


class LiquidacionHonorarioResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: Optional[int] = None
    medico_id: int
    codigo_liquidacion: str
    fecha_emision: datetime
    periodo_desde: datetime
    periodo_hasta: datetime
    total_cobros: int
    monto_total_recaudado_usd: float
    tipo_comision_aplicado: str
    porcentaje_aplicado: float
    monto_fijo_aplicado: float
    monto_honorarios_usd: float
    monto_retencion_clinica_usd: float
    monto_deducciones_usd: float
    motivo_deduccion: Optional[str] = None
    # Retención de ISLR
    porcentaje_retencion_islr: float = 0.00
    monto_retencion_islr_usd: float = 0.00
    monto_retencion_islr_ves: float = 0.00
    numero_comprobante_islr: Optional[str] = None
    monto_neto_pagar_usd: float
    monto_neto_pagar_ves: float
    tasa_bcv_aplicada: float
    estado: str
    fecha_pago: Optional[datetime] = None
    metodo_pago: Optional[str] = None
    referencia_pago: Optional[str] = None
    banco_origen: Optional[str] = None
    banco_destino: Optional[str] = None
    cobros_ids: List[int] = []
    desglose_cobros: List[Dict[str, Any]] = []
    datos_bancarios_medico: Dict[str, Any] = {}
    notas: Optional[str] = None
    medico_nombre_completo: Optional[str] = None
    medico_documento: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class LiquidacionesListResponse(BaseModel):
    items: List[LiquidacionHonorarioResponse]
    total: int
    page: int
    page_size: int
    stats: Dict[str, Any]



class ComprobanteRetencionISLRResponse(BaseModel):
    numero_comprobante: str
    codigo_liquidacion: str
    fecha_emision: str
    periodo_fiscal: str  # Ej. '2026-11'
    ejercicio_fiscal_ano: int
    ejercicio_fiscal_mes: int
    agente_retencion: Dict[str, Any]
    sujeto_retenido: Dict[str, Any]
    concepto: str
    exencion_iva: str = 'Exento según Art. 18 Numeral 3 de la Ley de IVA'
    base_imponible_usd: float
    tasa_bcv: float
    base_imponible_ves: float
    porcentaje_retencion: float
    monto_retenido_usd: float
    monto_retenido_ves: float
    monto_neto_usd: float
    monto_neto_ves: float
    fundamento_legal: str = 'Decreto N° 1.808 en materia de Retenciones de ISLR (Art. 9, Numeral 1)'
