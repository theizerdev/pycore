from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class TurnoLlamado(Base, TimestampMixin):
    __tablename__ = "turnos_llamados"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    cita_id = Column(Integer, ForeignKey("citas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="SET NULL"), nullable=True, index=True)

    numero_turno = Column(String(30), nullable=True, index=True)
    paciente_nombre = Column(String(150), nullable=False)
    medico_nombre = Column(String(150), nullable=False)
    consultorio = Column(String(60), nullable=False) # ej: "Consultorio 1", "Odontología 2"
    especialidad = Column(String(100), nullable=True)
    
    # Estados: 'llamando', 'atendido', 'cancelado'
    estado = Column(String(30), default="llamando", nullable=False, index=True)
    llamado_at = Column(DateTime, default=datetime.now, nullable=False, index=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    cita = relationship("CitaMedica", lazy="selectin")
    paciente = relationship("Paciente", lazy="selectin")
