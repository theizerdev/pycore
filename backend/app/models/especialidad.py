from sqlalchemy import Column, String, Boolean, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Especialidad(Base, TimestampMixin):
    __tablename__ = "especialidades"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    
    nombre = Column(String(150), nullable=False, index=True)
    codigo = Column(String(50), nullable=True, index=True)
    descripcion = Column(Text, nullable=True)
    color = Column(String(30), nullable=True, default="#0ea5e9")
    icono = Column(String(50), nullable=True, default="Stethoscope")
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
