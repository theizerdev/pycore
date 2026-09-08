from sqlalchemy import Column, String, Integer, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class BloqueoAgenda(Base, TimestampMixin):
    __tablename__ = "bloqueos_agenda"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="CASCADE"), nullable=False, index=True)

    fecha = Column(Date, nullable=False, index=True)
    hora_inicio = Column(String(10), nullable=False)   # Ej. "10:00"
    hora_fin = Column(String(10), nullable=False)      # Ej. "12:00"
    tipo = Column(String(30), default="personal", nullable=False)  # almuerzo, cirugia, reunion, personal, vacaciones
    motivo = Column(String(255), nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
