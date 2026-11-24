from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class InstilacionOftalmica(Base, TimestampMixin):
    __tablename__ = "instilaciones_oftalmicas"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)

    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="SET NULL"), nullable=True, index=True)
    paciente_nombre = Column(String(150), nullable=False, index=True)
    paciente_documento = Column(String(50), nullable=True)
    paciente_edad = Column(Integer, nullable=True)
    alergias = Column(String(255), nullable=True)

    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="SET NULL"), nullable=True, index=True)
    medico_nombre = Column(String(150), nullable=True)

    cita_id = Column(Integer, ForeignKey("citas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)
    consulta_id = Column(Integer, ForeignKey("consultas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)

    tipo = Column(String(50), default="Midriática", nullable=False)  # 'Midriática' | 'Ciclopléjica' | 'Anestésica' | 'Tinción' | 'Otra'
    farmaco = Column(String(100), default="Tropicamida 1%", nullable=False)
    ojo = Column(String(50), default="Ambos", nullable=False)  # 'Derecho' | 'Izquierdo' | 'Ambos'
    es_pediatrico = Column(Boolean, default=False, nullable=False)

    quien_instilo = Column(String(100), nullable=False)
    usuario_id_instilo = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    # Estado: 'en_espera' | 'dilatado_listo' | 'en_consulta' | 'finalizado' | 'cancelado'
    estado = Column(String(30), default="en_espera", nullable=False, index=True)

    total_gotas = Column(Integer, default=1, nullable=False)
    hora_primera_gota = Column(String(20), nullable=True)
    hora_ultima_gota = Column(String(20), nullable=True)

    # Array de historial de gotas:
    # [
    #   {"numero": 1, "tipo_gota": "1ra Gota", "hora": "10:41:02", "timestamp": 1732450000000, "quien_instilo": "Theizer Dev", "observaciones": ""},
    #   ...
    # ]
    gotas = Column(JSON, default=list, nullable=False)

    observaciones = Column(Text, nullable=True)
    tiempo_recomendado_min = Column(Integer, default=25, nullable=False)

    notificado_chat = Column(Boolean, default=False, nullable=False)
    notificado_whatsapp = Column(Boolean, default=False, nullable=False)
    ultimo_mensaje_chat_id = Column(Integer, nullable=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    paciente = relationship("Paciente", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    usuario_instilo = relationship("Usuario", foreign_keys=[usuario_id_instilo], lazy="selectin")
