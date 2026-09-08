from sqlalchemy import Column, String, Boolean, Text, Float, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Empresa(Base, TimestampMixin):
    __tablename__ = "empresas"

    nombre = Column(String(150), nullable=False, index=True)
    identificacion_fiscal = Column(String(50), nullable=True, unique=True, index=True) # RIF / RUC / NIT
    email = Column(String(120), nullable=True)
    telefono = Column(String(50), nullable=True)
    direccion = Column(Text, nullable=True)
    logo_url = Column(Text, nullable=True) # Logo completo para reportes y facturas (soporta Base64)
    logo_mini_url = Column(Text, nullable=True) # Logo mini claro (soporta Base64)
    logo_mini_dark_url = Column(Text, nullable=True) # Logo mini oscuro (soporta Base64)
    activo = Column(Boolean, default=True, nullable=False)

    # Ubicación, País & Moneda Principal
    pais_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)
    pais_telefono_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)
    moneda_principal = Column(String(10), default="USD", nullable=False) # "USD" o "VES"
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)

    # Integraciones: Mapas & MapTiler
    maptiler_api_key = Column(String(255), nullable=True)
    maptiler_active = Column(Boolean, default=True, nullable=False)
    mapbox_api_key = Column(String(255), nullable=True)
    mapbox_active = Column(Boolean, default=False, nullable=False)
    google_maps_api_key = Column(String(255), nullable=True)
    google_maps_active = Column(Boolean, default=False, nullable=False)

    # Integraciones: WhatsApp Business & Anti-Ban
    whatsapp_active = Column(Boolean, default=False, nullable=False)
    whatsapp_api_url = Column(String(255), default="http://localhost:3000", nullable=True)
    whatsapp_api_key = Column(String(255), nullable=True)
    whatsapp_instance = Column(String(100), nullable=True)
    whatsapp_connected = Column(Boolean, default=False, nullable=False)
    whatsapp_status = Column(String(50), default="disconnected", nullable=True)
    whatsapp_phone = Column(String(50), nullable=True)
    whatsapp_rate_limit = Column(Integer, default=300, nullable=True)
    whatsapp_warmup_mode = Column(Boolean, default=True, nullable=True)
    whatsapp_working_hours_enabled = Column(Boolean, default=True, nullable=True)
    whatsapp_working_hours_start = Column(String(10), default="08:00", nullable=True)
    whatsapp_working_hours_end = Column(String(10), default="20:00", nullable=True)
    whatsapp_proxy_url = Column(String(255), nullable=True)

    # Integraciones: Pasarelas de Pago
    paypal_active = Column(Boolean, default=False, nullable=False)
    paypal_mode = Column(String(20), default="sandbox", nullable=True)
    paypal_client_id = Column(String(255), nullable=True)
    paypal_client_secret = Column(String(255), nullable=True)

    stripe_active = Column(Boolean, default=False, nullable=False)
    stripe_mode = Column(String(20), default="test", nullable=True)
    stripe_publishable_key = Column(String(255), nullable=True)
    stripe_secret_key = Column(String(255), nullable=True)
    stripe_webhook_secret = Column(String(255), nullable=True)

    mercadopago_active = Column(Boolean, default=False, nullable=False)
    mercadopago_mode = Column(String(20), default="sandbox", nullable=True)
    mercadopago_public_key = Column(String(255), nullable=True)
    mercadopago_access_token = Column(String(255), nullable=True)

    # Métodos de Pago Nacionales (Transferencia Bancaria & Pago Móvil)
    banco_nombre = Column(String(100), nullable=True)
    banco_tipo_cuenta = Column(String(50), nullable=True)
    banco_numero_cuenta = Column(String(50), nullable=True)
    banco_titular = Column(String(150), nullable=True)
    banco_doc_identidad = Column(String(50), nullable=True)

    pagomovil_banco = Column(String(100), nullable=True)
    pagomovil_telefono = Column(String(50), nullable=True)
    pagomovil_doc_identidad = Column(String(50), nullable=True)

    # Suscripción & Nivel SaaS (Billing Tier)
    plan_id = Column(Integer, ForeignKey("planes.id", ondelete="SET NULL"), nullable=True, index=True)
    plan_vencimiento = Column(DateTime, nullable=True)
    plan_estado = Column(String(30), default="activo", nullable=False) # "activo", "vencido", "prueba"

    # Relaciones
    plan = relationship("Plan", back_populates="empresas", lazy="selectin")
    pais = relationship("Pais", foreign_keys=[pais_id], lazy="selectin")
    pais_telefono = relationship("Pais", foreign_keys=[pais_telefono_id], lazy="selectin")
    sucursales = relationship("Sucursal", back_populates="empresa", cascade="all, delete-orphan", lazy="selectin")
    usuarios = relationship("Usuario", back_populates="empresa")
    whatsapp_templates = relationship("WhatsAppTemplate", back_populates="empresa", cascade="all, delete-orphan")
    whatsapp_messages = relationship("WhatsAppMessage", back_populates="empresa", cascade="all, delete-orphan")
    suscripciones = relationship("Suscripcion", back_populates="empresa", cascade="all, delete-orphan", lazy="selectin")
    pagos_suscripcion = relationship("PagoSuscripcion", back_populates="empresa", cascade="all, delete-orphan", lazy="selectin")

    def is_exempt_from_subscription(self) -> bool:
        """La Empresa ID 1 (Dueña del SaaS) está exenta de control de suscripción."""
        return self.id == 1
