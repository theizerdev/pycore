from datetime import datetime
from sqlalchemy import Column, String, Boolean, Text, Integer, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class Caja(Base, TimestampMixin):
    """Representa una caja física o punto de venta en una sucursal."""
    __tablename__ = "cajas"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)

    nombre = Column(String(100), nullable=False)  # Ej: "Caja Principal", "Caja Odontología"
    descripcion = Column(Text, nullable=True)
    activa = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    turnos = relationship("TurnoCaja", back_populates="caja", cascade="all, delete-orphan")


class TurnoCaja(Base, TimestampMixin):
    """Sesión de caja abierta por un cajero/recepcionista para registrar ingresos y egresos."""
    __tablename__ = "turnos_caja"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    caja_id = Column(Integer, ForeignKey("cajas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)

    apertura_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    cierre_at = Column(DateTime, nullable=True)
    estado = Column(String(20), default="abierta", nullable=False, index=True)  # "abierta", "cerrada"

    # Fondos iniciales para cambio/vuelto
    fondo_inicial_usd = Column(Numeric(12, 2), default=0.00, nullable=False)
    fondo_inicial_ves = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Totales acumulados de ingresos
    total_ingresos_usd = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_ingresos_ves = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_ingresos_eur = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Totales acumulados de egresos/gastos menores
    total_egresos_usd = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_egresos_ves = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Arqueo físico al cierre (declarado por el cajero)
    arqueo_declarado_usd = Column(Numeric(12, 2), nullable=True)
    arqueo_declarado_ves = Column(Numeric(12, 2), nullable=True)
    diferencia_usd = Column(Numeric(12, 2), nullable=True)
    diferencia_ves = Column(Numeric(12, 2), nullable=True)

    notas_apertura = Column(Text, nullable=True)
    notas_cierre = Column(Text, nullable=True)

    # Relaciones
    caja = relationship("Caja", back_populates="turnos", lazy="selectin")
    usuario = relationship("Usuario", lazy="selectin")
    cobros = relationship("Cobro", back_populates="turno", cascade="all, delete-orphan")
    movimientos = relationship("MovimientoCaja", back_populates="turno", cascade="all, delete-orphan")


class Cobro(Base, TimestampMixin):
    """Comprobante/Recibo de cobro por servicios clínicos, consultas o tratamientos."""
    __tablename__ = "cobros"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    turno_caja_id = Column(Integer, ForeignKey("turnos_caja.id", ondelete="RESTRICT"), nullable=False, index=True)
    cajero_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="RESTRICT"), nullable=False, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="SET NULL"), nullable=True, index=True)
    cita_id = Column(Integer, ForeignKey("citas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)
    consulta_id = Column(Integer, ForeignKey("consultas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)

    numero_recibo = Column(String(50), nullable=False, index=True)  # Ej. "REC-2026-00001"
    fecha_emision = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Snapshot inmutable de la tasa aplicada en este cobro
    moneda_referencia = Column(String(10), default="USD", nullable=False)  # "USD" o "EUR"
    tasa_bcv_aplicada = Column(Numeric(12, 4), nullable=False)  # Valor en VES por unidad de divisa
    fuente_tasa = Column(String(100), default="BCV Oficial", nullable=True)

    # Importes
    subtotal_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    descuento_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_ves = Column(Numeric(12, 2), default=0.00, nullable=False)

    monto_pagado_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    monto_vuelto_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    monto_vuelto_ves = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Estado del cobro
    estado = Column(String(30), default="completado", nullable=False, index=True)  # "completado", "anulado"
    motivo_anulacion = Column(String(255), nullable=True)
    anulado_at = Column(DateTime, nullable=True)
    anulado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    notas = Column(Text, nullable=True)

    # Relaciones
    turno = relationship("TurnoCaja", back_populates="cobros", lazy="selectin")
    cajero = relationship("Usuario", foreign_keys=[cajero_id], lazy="selectin")
    paciente = relationship("Paciente", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    cita = relationship("CitaMedica", lazy="selectin")
    consulta = relationship("ConsultaMedica", lazy="selectin")
    detalles = relationship("CobroDetalle", back_populates="cobro", cascade="all, delete-orphan", lazy="selectin")
    pagos = relationship("CobroPago", back_populates="cobro", cascade="all, delete-orphan", lazy="selectin")

    # Propiedades calculadas para serialización
    @property
    def cajero_nombre(self):
        if self.cajero:
            nom = f"{self.cajero.nombre or ''} {self.cajero.apellido or ''}".strip()
            return nom or self.cajero.email
        return None

    @property
    def paciente_nombre(self):
        if self.paciente:
            return f"{self.paciente.nombres or ''} {self.paciente.apellidos or ''}".strip()
        return None

    @property
    def paciente_documento(self):
        if self.paciente:
            td = self.paciente.tipo_documento or ""
            doc = self.paciente.documento_identidad or ""
            return f"{td}-{doc}" if td and doc else doc
        return None

    @property
    def paciente_telefono(self):
        if self.paciente:
            return self.paciente.telefono
        return None

    @property
    def medico_nombre(self):
        if self.medico:
            return f"{self.medico.nombres or ''} {self.medico.apellidos or ''}".strip()
        return None


class CobroDetalle(Base, TimestampMixin):
    """Conceptos individuales incluidos en el recibo de cobro."""
    __tablename__ = "cobro_detalles"

    cobro_id = Column(Integer, ForeignKey("cobros.id", ondelete="CASCADE"), nullable=False, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="SET NULL"), nullable=True, index=True)

    tipo_concepto = Column(String(50), default="servicio", nullable=False)  # "consulta", "servicio", "odontologia", "estudio", "insumo", "otro"
    descripcion = Column(String(255), nullable=False)
    cantidad = Column(Integer, default=1, nullable=False)

    precio_unitario_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    subtotal_divisa = Column(Numeric(12, 2), default=0.00, nullable=False)
    subtotal_ves = Column(Numeric(12, 2), default=0.00, nullable=False)

    # Soporte odontológico específico
    diente_fdi = Column(Integer, nullable=True)  # Número de pieza dental FDI (ej. 16, 21, 48)

    # Relaciones
    cobro = relationship("Cobro", back_populates="detalles")
    servicio = relationship("Servicio", lazy="selectin")


class CobroPago(Base, TimestampMixin):
    """Desglose de medios de pago para cobros simples y pagos mixtos multimoneda."""
    __tablename__ = "cobro_pagos"

    cobro_id = Column(Integer, ForeignKey("cobros.id", ondelete="CASCADE"), nullable=False, index=True)

    metodo = Column(String(50), nullable=False)  # "efectivo_usd", "efectivo_ves", "efectivo_eur", "pago_movil", "punto_venta", "transferencia", "zelle", "pasarela"
    moneda = Column(String(10), nullable=False)  # "USD", "VES", "EUR"
    monto_moneda_origen = Column(Numeric(12, 2), nullable=False)
    tasa_cambio = Column(Numeric(12, 4), default=1.0000, nullable=False)
    monto_equivalente_divisa = Column(Numeric(12, 2), nullable=False)  # Normalizado a la moneda de cobro de la clínica

    # Datos bancarios y trazabilidad
    banco_origen = Column(String(100), nullable=True)
    banco_destino = Column(String(100), nullable=True)
    referencia = Column(String(100), nullable=True)  # Nro de operación / Pago Móvil / Voucher
    lote_punto = Column(String(50), nullable=True)
    ultimos_digitos_tarjeta = Column(String(4), nullable=True)
    notas = Column(String(255), nullable=True)

    # Relaciones
    cobro = relationship("Cobro", back_populates="pagos")


class MovimientoCaja(Base, TimestampMixin):
    """Ingresos y egresos extraordinarios de efectivo en la caja durante el turno."""
    __tablename__ = "movimientos_caja"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    turno_caja_id = Column(Integer, ForeignKey("turnos_caja.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False, index=True)

    tipo = Column(String(20), nullable=False)  # "ingreso", "egreso"
    concepto = Column(String(255), nullable=False)  # Ej. "Insumos de limpieza", "Aporte sencillo"
    moneda = Column(String(10), default="USD", nullable=False)  # "USD" o "VES"
    monto = Column(Numeric(12, 2), nullable=False)
    comprobante_adjunto = Column(String(255), nullable=True)

    # Relaciones
    turno = relationship("TurnoCaja", back_populates="movimientos")
    usuario = relationship("Usuario", lazy="selectin")
