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

    # Relaciones
    empresa = relationship("Empresa", back_populates="sucursales", lazy="selectin")
    pais = relationship("Pais", foreign_keys=[pais_id], lazy="selectin")
    pais_telefono = relationship("Pais", foreign_keys=[pais_telefono_id], lazy="selectin")
    usuarios_asignados = relationship("UsuarioSucursal", back_populates="sucursal", cascade="all, delete-orphan", lazy="selectin")
