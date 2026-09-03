from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class ConsultaMedica(Base, TimestampMixin):
    __tablename__ = "consultas_medicas"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="RESTRICT"), nullable=False, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="RESTRICT"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)

    fecha_consulta = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    motivo_consulta = Column(String(255), nullable=False)
    enfermedad_actual = Column(Text, nullable=True)

    # Signos Vitales estructurados (peso, talla, imc, masa_corporal, presion_arterial, fc, fr, temperatura, saturacion_oxigeno)
    signos_vitales = Column(JSON, default=dict, nullable=False)

    # Datos dinámicos de la plantilla de especialidad / Odontograma
    datos_plantilla = Column(JSON, default=dict, nullable=False)

    # Diagnóstico CIE-10 y Plan
    diagnostico_principal = Column(String(255), nullable=False)
    diagnosticos_secundarios = Column(JSON, default=list, nullable=False)
    plan_tratamiento = Column(Text, nullable=True)

    # Prescripción y Receta Médica estructurada (lista de medicamentos)
    receta_medica = Column(JSON, default=list, nullable=False)
    indicaciones_generales = Column(Text, nullable=True)

    # Estado de la atención: 'en_curso', 'finalizada', 'anulada'
    estado = Column(String(30), default="finalizada", nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    paciente = relationship("Paciente", back_populates="consultas", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    especialidad = relationship("Especialidad", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
