from sqlalchemy import Column, String, Boolean, Text, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Suscripcion(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("planes.id", ondelete="SET NULL"), nullable=True, index=True)
    
    nombre_plan = Column(String(100), nullable=False, default="Plan Profesional")
    ciclo_meses = Column(Integer, default=1, nullable=False) # 0 para trial, 1, 3, 6, 12
    max_sucursales = Column(Integer, default=1, nullable=False)
    monto_total = Column(Float, default=0.0, nullable=False)
    
    es_tarifa_promocional = Column(Boolean, default=False, nullable=False)
    fecha_fin_promocion = Column(DateTime, nullable=True)
    monto_renovacion_regular = Column(Float, default=0.0, nullable=False)

    fecha_inicio = Column(DateTime, nullable=False)
    fecha_vencimiento = Column(DateTime, nullable=False)
    estado = Column(String(30), default="active", nullable=False) # "active", "trial", "expired", "cancelled"

    # Alertas por WhatsApp
    last_reminder_sent_at = Column(DateTime, nullable=True)
    reminder_sent_count = Column(Integer, default=0, nullable=False)

    # Relaciones
    # Relaciones
    empresa = relationship("Empresa", back_populates="suscripciones", lazy="selectin")
    plan = relationship("Plan", lazy="selectin")
    pagos = relationship("PagoSuscripcion", back_populates="suscripcion", cascade="all, delete-orphan", lazy="selectin")


class PagoSuscripcion(Base, TimestampMixin):
    __tablename__ = "subscription_payments"

    suscripcion_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    plan_id = Column(Integer, ForeignKey("planes.id", ondelete="SET NULL"), nullable=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)

    monto = Column(Float, nullable=False)
    ciclo_meses = Column(Integer, default=1, nullable=False)
    sucursales_contratadas = Column(Integer, default=1, nullable=False)
    
    metodo_pago = Column(String(50), nullable=False) # "transferencia", "pago_movil", "paypal", "stripe", "mercadopago"
    referencia_pago = Column(String(100), nullable=True)
    comprobante_path = Column(String(255), nullable=True)
    notas = Column(Text, nullable=True)

    estado = Column(String(30), default="pending", nullable=False) # "pending", "approved", "rejected"
    aprobado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    aprobado_at = Column(DateTime, nullable=True)

    # Relaciones
    suscripcion = relationship("Suscripcion", back_populates="pagos", lazy="selectin")
    plan = relationship("Plan", lazy="selectin")
    empresa = relationship("Empresa", back_populates="pagos_suscripcion", lazy="selectin")
    usuario = relationship("Usuario", foreign_keys=[usuario_id], lazy="selectin")
    aprobador = relationship("Usuario", foreign_keys=[aprobado_por_id], lazy="selectin")

