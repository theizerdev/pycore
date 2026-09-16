from sqlalchemy import Column, String, Boolean, Text, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Sucursal(Base, TimestampMixin):
    __tablename__ = "sucursales"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    pais_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)
    pais_telefono_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)
    nombre = Column(String(150), nullable=False, index=True)
    codigo = Column(String(50), nullable=True, index=True)
    telefono = Column(String(50), nullable=True)
    direccion = Column(Text, nullable=True)
    ciudad = Column(String(100), nullable=True)
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    # Integración: WhatsApp por Sucursal (Baileys)
    whatsapp_active = Column(Boolean, default=False, nullable=False)
    whatsapp_api_url = Column(String(255), default="https://whatsapp.theizerdev.com", nullable=True)
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

    # Relaciones
    empresa = relationship("Empresa", back_populates="sucursales", lazy="selectin")
    pais = relationship("Pais", foreign_keys=[pais_id], lazy="selectin")
    pais_telefono = relationship("Pais", foreign_keys=[pais_telefono_id], lazy="selectin")
    usuarios_asignados = relationship("UsuarioSucursal", back_populates="sucursal", cascade="all, delete-orphan", lazy="selectin")
