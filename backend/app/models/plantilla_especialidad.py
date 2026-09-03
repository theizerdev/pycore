from sqlalchemy import Column, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class EspecialidadPlantilla(Base, TimestampMixin):
    """
    Plantilla base institucional de una especialidad.
    Define las preguntas de preconsulta (interrogatorio/triaje)
    y los campos de la consulta médica (examen clínico y evaluación).
    """
    __tablename__ = "especialidad_plantillas"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Lista de secciones y preguntas para el interrogatorio / triaje de preconsulta
    # Formato: [{"id": "...", "titulo": "...", "descripcion": "...", "icono": "...", "campos": [...]}]
    esquema_preconsulta = Column(JSON, default=list, nullable=False)
    
    # Lista de secciones y campos para la consulta médica especializada
    # Formato: [{"id": "...", "titulo": "...", "descripcion": "...", "icono": "...", "campos": [...]}]
    esquema_consulta = Column(JSON, default=list, nullable=False)
    
    # Widgets especializados activos (ej. ["odontograma", "refraccion", "percentiles_oms", "rueda_obstetrica"])
    widgets_activos = Column(JSON, default=list, nullable=False)
    
    version = Column(Integer, default=1, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    especialidad = relationship("Especialidad", lazy="selectin")


class EspecialidadPlantillaMedico(Base, TimestampMixin):
    """
    Personalización individual por médico para una especialidad.
    Permite a cada doctor agregar preguntas y campos propios que se sumarán
    automáticamente a la plantilla base de la clínica en sus consultas.
    """
    __tablename__ = "especialidad_plantillas_medico"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True) # El médico
    
    # Campos propios del médico para la preconsulta
    # Formato: [{"key": "...", "label": "...", "tipo": "...", "requerido": false, ...}]
    campos_preconsulta = Column(JSON, default=list, nullable=False)
    
    # Campos propios del médico para el examen de consulta médica
    # Formato: [{"key": "...", "label": "...", "tipo": "...", "requerido": false, ...}]
    campos_consulta = Column(JSON, default=list, nullable=False)
    
    # Keys de campos base no-obligatorios que el médico prefiere no mostrar en su pantalla
    campos_ocultos = Column(JSON, default=list, nullable=False)
    
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    especialidad = relationship("Especialidad", lazy="selectin")
    usuario = relationship("Usuario", lazy="selectin")
