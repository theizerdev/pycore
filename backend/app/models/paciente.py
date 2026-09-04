from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Text, JSON, Date
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Paciente(Base, TimestampMixin):
    __tablename__ = "pacientes"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_registro_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)
    pais_telefono_id = Column(Integer, ForeignKey("pais.id", ondelete="SET NULL"), nullable=True, index=True)

    # Datos Demográficos
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)
    tipo_documento = Column(String(20), default="V", nullable=False)  # V, E, J, P, DNI, etc.
    documento_identidad = Column(String(50), nullable=False, index=True)
    fecha_nacimiento = Column(Date, nullable=True)
    genero = Column(String(20), default="M", nullable=False)  # M (Masculino), F (Femenino), O (Otro)
    email = Column(String(150), nullable=True, index=True)
    telefono = Column(String(50), nullable=True)
    direccion = Column(Text, nullable=True)
    ciudad = Column(String(100), nullable=True)
    estado = Column(String(100), nullable=True)
    codigo_postal = Column(String(20), nullable=True)

    # Ficha Médica Base
    grupo_sanguineo = Column(String(10), nullable=True)  # A+, A-, B+, B-, AB+, AB-, O+, O-
    alergias = Column(JSON, default=list, nullable=False)  # Lista de strings: ["Penicilina", "Ibuprofeno"]
    antecedentes_patologicos = Column(Text, nullable=True)  # Hipertensión, Diabetes, Asma, etc.
    antecedentes_familiares = Column(Text, nullable=True)  # Antecedentes de familiares directos
    antecedentes_quirurgicos = Column(Text, nullable=True)  # Cirugías e intervenciones previas
    medicacion_habitual = Column(Text, nullable=True)  # Fármacos de toma habitual
    observaciones_medicas = Column(Text, nullable=True)

    # Contacto de Emergencia
    contacto_emergencia_nombre = Column(String(120), nullable=True)
    contacto_emergencia_parentesco = Column(String(50), nullable=True)  # Cónyuge, Padre, Madre, Hijo, etc.
    contacto_emergencia_telefono = Column(String(50), nullable=True)

    # Cobertura Médica / Seguro
    seguro_medico = Column(String(120), nullable=True)
    numero_poliza = Column(String(80), nullable=True)

    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal_registro = relationship("Sucursal", foreign_keys=[sucursal_registro_id], lazy="selectin")
    pais_telefono = relationship("Pais", foreign_keys=[pais_telefono_id], lazy="selectin")
    consultas = relationship("ConsultaMedica", back_populates="paciente", order_by="desc(ConsultaMedica.fecha_consulta)", lazy="selectin")

    @property
    def edad(self):
        if not self.fecha_nacimiento:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.fecha_nacimiento.year - (
            (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )

    @property
    def edad_texto(self):
        if not self.fecha_nacimiento:
            return None
        from datetime import date
        today = date.today()
        anios = today.year - self.fecha_nacimiento.year - (
            (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day)
        )
        if anios > 0:
            return f"{anios} años" if anios != 1 else "1 año"
        
        meses = (today.year - self.fecha_nacimiento.year) * 12 + (today.month - self.fecha_nacimiento.month)
        if today.day < self.fecha_nacimiento.day:
            meses -= 1
        if meses > 0:
            return f"{meses} meses" if meses != 1 else "1 mes"
            
        dias = (today - self.fecha_nacimiento).days
        return f"{dias} días" if dias != 1 else "1 día"

