from datetime import datetime
from sqlalchemy import Column, String, Boolean, Integer, Float, ForeignKey, Text, Date, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class CitaMedica(Base, TimestampMixin):
    __tablename__ = "citas_medicas"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="RESTRICT"), nullable=False, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="RESTRICT"), nullable=False, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="RESTRICT"), nullable=False, index=True)
    servicio_id = Column(Integer, ForeignKey("servicios.id", ondelete="SET NULL"), nullable=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)

    fecha = Column(Date, nullable=False, index=True)  # Ej. 2026-09-04
    hora_inicio = Column(String(10), nullable=False)   # Ej. "09:00"
    hora_fin = Column(String(10), nullable=False)      # Ej. "09:30"
    duracion_minutos = Column(Integer, default=30, nullable=False)

    motivo = Column(String(255), nullable=False)
    notas = Column(Text, nullable=True)

    # Servicio y Aspectos Financieros
    precio_estimado = Column(Float, default=0.0, nullable=True)
    # Estado de pago: 'pendiente', 'pagado', 'aseguradora', 'exonerado'
    estado_pago = Column(String(30), default="pendiente", nullable=False, index=True)
    metodo_pago = Column(String(50), nullable=True)

    # Sobreturnos / Urgencias
    es_sobreturno = Column(Boolean, default=False, nullable=False)
    motivo_sobreturno = Column(String(255), nullable=True)

    # Estado del flujo: 'programada', 'confirmada', 'sala_espera', 'en_consulta', 'atendida', 'cancelada', 'no_asistio'
    estado = Column(String(30), default="programada", nullable=False, index=True)
    motivo_cancelacion = Column(String(255), nullable=True)

    # Notificaciones WhatsApp al agendar
    whatsapp_notificado = Column(Boolean, default=False, nullable=False)
    whatsapp_notificado_at = Column(DateTime, nullable=True)

    # Recordatorio 24h previas
    recordatorio_enviado = Column(Boolean, default=False, nullable=False)
    recordatorio_enviado_at = Column(DateTime, nullable=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    especialidad = relationship("Especialidad", lazy="selectin")
    servicio = relationship("Servicio", lazy="selectin")
    paciente = relationship("Paciente", lazy="selectin")
