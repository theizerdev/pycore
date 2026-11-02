from datetime import datetime
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class LiquidacionHonorario(Base, TimestampMixin):
    """
    Liquidación formal de honorarios médicos y comisiones clínicas por servicios y consultas prestados.
    Inspirado en la arquitectura probada de FixSalePOS para liquidación a especialistas.
    """
    __tablename__ = "liquidaciones_honorarios"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="RESTRICT"), nullable=False, index=True)

    codigo_liquidacion = Column(String(50), nullable=False, index=True)  # Ej: "LIQ-2026-00001"
    fecha_emision = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    periodo_desde = Column(DateTime, nullable=False)
    periodo_hasta = Column(DateTime, nullable=False)

    total_cobros = Column(Integer, default=0, nullable=False)
    monto_total_recaudado_usd = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Configuración de comisión aplicada al momento de liquidar
    tipo_comision_aplicado = Column(String(20), default="porcentaje", nullable=False)  # "porcentaje" o "fijo"
    porcentaje_aplicado = Column(Numeric(5, 2), default=70.00, nullable=False)
    monto_fijo_aplicado = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Importes
    monto_honorarios_usd = Column(Numeric(12, 2), default=0.00, nullable=False)  # Honorarios brutos médico
    monto_retencion_clinica_usd = Column(Numeric(12, 2), default=0.00, nullable=False)  # Participación clínica
    monto_deducciones_usd = Column(Numeric(12, 2), default=0.00, nullable=False)  # Insumos / retenciones / adelantos
    motivo_deduccion = Column(String(255), nullable=True)

    # Retención de ISLR según normativa venezolana (Decreto N° 1.808)
    porcentaje_retencion_islr = Column(Numeric(5, 2), default=3.00, nullable=False)  # 3% Persona Natural, 5% Persona Jurídica
    monto_retencion_islr_usd = Column(Numeric(12, 2), default=0.00, nullable=False)
    monto_retencion_islr_ves = Column(Numeric(12, 2), default=0.00, nullable=False)
    numero_comprobante_islr = Column(String(50), nullable=True)  # Ej: '20261100000001'

    monto_neto_pagar_usd = Column(Numeric(12, 2), default=0.00, nullable=False)
    monto_neto_pagar_ves = Column(Numeric(12, 2), default=0.00, nullable=False)
    tasa_bcv_aplicada = Column(Numeric(12, 4), default=1.0000, nullable=False)

    # Estado
    estado = Column(String(20), default="pendiente", nullable=False, index=True)  # "pendiente", "pagado", "anulado"
    fecha_pago = Column(DateTime, nullable=True)
    metodo_pago = Column(String(50), nullable=True)  # "transferencia", "pago_movil", "zelle", "efectivo_usd", etc.
    referencia_pago = Column(String(100), nullable=True)
    banco_origen = Column(String(100), nullable=True)
    banco_destino = Column(String(100), nullable=True)
    comprobante_url = Column(String(255), nullable=True)

    # Relación de recibos liquidados y snapshot de desglose
    cobros_ids = Column(JSON, default=list, nullable=False)
    desglose_cobros = Column(JSON, default=list, nullable=False)
    datos_bancarios_medico = Column(JSON, default=dict, nullable=False)

    notas = Column(Text, nullable=True)

    creado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    pagado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    creado_por = relationship("Usuario", foreign_keys=[creado_por_id], lazy="selectin")
    pagado_por = relationship("Usuario", foreign_keys=[pagado_por_id], lazy="selectin")

    @property
    def medico_nombre_completo(self):
        if self.medico:
            return f"Dr(a). {self.medico.nombres} {self.medico.apellidos}"
        return "Médico no asignado"

    @property
    def medico_documento(self):
        if self.medico:
            return f"{self.medico.tipo_documento}-{self.medico.documento_identidad}"
        return ""

