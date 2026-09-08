from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Medico(Base, TimestampMixin):
    __tablename__ = "medicos"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    especialidad_id = Column(Integer, ForeignKey("especialidades.id", ondelete="RESTRICT"), nullable=False, index=True)
    pais_telefono_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)
    sucursal_defecto_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)

    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    tipo_documento = Column(String(20), default="V", nullable=False)
    documento_identidad = Column(String(50), nullable=False, index=True)
    email = Column(String(150), nullable=False, index=True)
    telefono = Column(String(50), nullable=True)
    licencia_medica = Column(String(100), nullable=True)  # Colegiatura / Matrícula / Registro médico profesional
    color = Column(String(20), default="#0d9488", nullable=False)  # Color en agenda y turnero
    biografia = Column(Text, nullable=True)

    # Subespecialidades en formato estructurado (Carrito de compras: nivel, años, certificado)
    subespecialidades = Column(JSON, default=list, nullable=False)

    # Sucursales asignadas donde atiende
    sucursales_ids = Column(JSON, default=list, nullable=False)

    # Configuración de turnos y disponibilidad horaria del médico
    horario_atencion = Column(JSON, default=dict, nullable=False)

    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    usuario = relationship("Usuario", foreign_keys=[usuario_id], lazy="selectin")
    especialidad = relationship("Especialidad", foreign_keys=[especialidad_id], lazy="selectin")
    pais_telefono = relationship("Pais", foreign_keys=[pais_telefono_id], lazy="selectin")
    sucursal_defecto = relationship("Sucursal", foreign_keys=[sucursal_defecto_id], lazy="selectin")
