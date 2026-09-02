from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
from app.models.base import TimestampMixin

class WhatsAppTemplate(Base, TimestampMixin):
    __tablename__ = "whatsapp_templates"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    nombre = Column(String(100), nullable=False)
    categoria = Column(String(50), nullable=False, default="general") # recordatorio_cita, confirmacion_turno, receta_medica, resultado_estudio, general
    contenido = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True) # ["paciente", "fecha_cita", "hora", "medico", "sede"]
    activo = Column(Boolean, default=True, nullable=False)

    # Relación
    empresa = relationship("Empresa", back_populates="whatsapp_templates")


class WhatsAppMessage(Base, TimestampMixin):
    __tablename__ = "whatsapp_messages"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    recipient_phone = Column(String(30), nullable=False, index=True)
    recipient_name = Column(String(120), nullable=True)
    message_content = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True)
    status = Column(String(20), default="pending", nullable=False) # pending, sent, delivered, read, failed
    direction = Column(String(10), default="outbound", nullable=False) # inbound, outbound
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)

    # Relación
    empresa = relationship("Empresa", back_populates="whatsapp_messages")
