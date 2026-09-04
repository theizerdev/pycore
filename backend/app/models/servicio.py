from sqlalchemy import Column, String, Boolean, Text, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Servicio(Base, TimestampMixin):
    __tablename__ = "servicios"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="CASCADE"), nullable=False, index=True)

    codigo = Column(String(50), nullable=True, index=True)
    nombre = Column(String(200), nullable=False, index=True)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String(80), nullable=False, default="Consulta")  # Consulta, Procedimiento, Estudio, Cirugía, Terapia, Laboratorio, Otro
    precio_base = Column(Numeric(12, 2), nullable=False, default=0.00)
    duracion_estimada_minutos = Column(Integer, nullable=False, default=30)
    preparacion_requerida = Column(Text, nullable=True)
    requiere_medico = Column(Boolean, default=True, nullable=False)
    color = Column(String(30), nullable=True, default="#0ea5e9")
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", foreign_keys=[sucursal_id], lazy="selectin")
    especialidad = relationship("Especialidad", foreign_keys=[especialidad_id], lazy="selectin")
