from datetime import datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Text, JSON, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class ConsultaMedica(Base, TimestampMixin):
    __tablename__ = "consultas_medicas"

    # Código único correlativo de la consulta clínica (ej. CON-20260904-0001)
    codigo = Column(String(50), unique=True, nullable=True, index=True)

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    cita_id = Column(Integer, ForeignKey("citas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="RESTRICT"), nullable=False, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="RESTRICT"), nullable=False, index=True)
    preconsulta_id = Column(Integer, ForeignKey("preconsultas.id", ondelete="SET NULL"), nullable=True, index=True)
    creado_por = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)

    fecha_consulta = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    motivo_consulta = Column(String(255), nullable=False)
    enfermedad_actual = Column(Text, nullable=True)

    # Signos Vitales estructurados (peso, talla, imc, masa_corporal, presion_arterial, fc, fr, temperatura, saturacion_oxigeno)
    signos_vitales = Column(JSON, default=dict, nullable=False)

    # Datos dinámicos de la plantilla de especialidad / Odontograma
    datos_plantilla = Column(JSON, default=dict, nullable=False)

    # Diagnóstico CIE-10 y Plan
    diagnostico_principal = Column(String(255), nullable=True)
    diagnosticos_secundarios = Column(JSON, default=list, nullable=False)
    plan_tratamiento = Column(Text, nullable=True)

    # Prescripción y Receta Médica estructurada (lista de medicamentos)
    receta_medica = Column(JSON, default=list, nullable=False)
    indicaciones_generales = Column(Text, nullable=True)

    # Estudios solicitados / Carrito de exámenes de laboratorio e imagenología
    estudios_solicitados = Column(JSON, default=list, nullable=False)

    # Orden de reposo médico
    reposo_medico = Column(JSON, default=dict, nullable=False)

    # Observaciones adicionales y Referido a
    observaciones_adicionales = Column(Text, nullable=True)
    referido_para = Column(String(255), nullable=True)

    # Estado de la atención: 'en_espera', 'en_curso', 'finalizada', 'anulada'
    estado = Column(String(30), default="en_espera", nullable=False, index=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    cita = relationship("CitaMedica", lazy="selectin")
    paciente = relationship("Paciente", back_populates="consultas", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    especialidad = relationship("Especialidad", lazy="selectin")
    preconsulta = relationship("Preconsulta", back_populates="consulta", lazy="selectin")
    usuario_creador = relationship("Usuario", foreign_keys=[creado_por], lazy="selectin")
