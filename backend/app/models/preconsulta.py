import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, DateTime, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Preconsulta(Base, TimestampMixin):
    __tablename__ = "preconsultas"

    token = Column(String(64), unique=True, nullable=False, index=True, default=lambda: uuid.uuid4().hex)

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="RESTRICT"), nullable=False, index=True)
    cita_id = Column(Integer, ForeignKey("citas_medicas.id", ondelete="CASCADE"), nullable=False, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="RESTRICT"), nullable=False, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Respuestas enviadas por el paciente desde el formulario web
    respuestas = Column(JSON, default=dict, nullable=False)

    # Estado de la preconsulta: 'pendiente', 'completada', 'vencida'
    estado = Column(String(30), default="pendiente", nullable=False, index=True)
    completada_at = Column(DateTime, nullable=True)

    # Control de envío WhatsApp
    whatsapp_enviado = Column(Boolean, default=False, nullable=False)
    whatsapp_enviado_at = Column(DateTime, nullable=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    cita = relationship("CitaMedica", lazy="selectin")
    paciente = relationship("Paciente", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    especialidad = relationship("Especialidad", lazy="selectin")
    consulta = relationship("ConsultaMedica", back_populates="preconsulta", uselist=False, lazy="selectin")
