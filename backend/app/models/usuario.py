from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class UsuarioSucursal(Base, TimestampMixin):
    __tablename__ = "usuario_sucursales"

    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)

    usuario = relationship("Usuario", back_populates="sucursales_asignadas")
    sucursal = relationship("Sucursal", back_populates="usuarios_asignados", lazy="selectin")

class Usuario(Base, TimestampMixin):
    __tablename__ = "usuarios"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True, index=True)
    sucursal_defecto_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    rol_id = Column(Integer, ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    pais_telefono_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)

    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    telefono = Column(String(50), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)
    es_superadmin = Column(Boolean, default=False, nullable=False)
    whatsapp_otp_code = Column(String(10), nullable=True)
    whatsapp_otp_expires_at = Column(DateTime, nullable=True)
    whatsapp_verified = Column(Boolean, default=False, nullable=False)
    ultimo_acceso = Column(DateTime, nullable=True)

    # Relaciones
    empresa = relationship("Empresa", back_populates="usuarios", lazy="selectin")
    rol = relationship("Rol", back_populates="usuarios", lazy="selectin")
    sucursal_defecto = relationship("Sucursal", foreign_keys=[sucursal_defecto_id], lazy="selectin")
    pais_telefono = relationship("Pais", foreign_keys=[pais_telefono_id], lazy="selectin")
    sucursales_asignadas = relationship("UsuarioSucursal", back_populates="usuario", cascade="all, delete-orphan", lazy="selectin")
