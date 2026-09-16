from datetime import date, datetime
from sqlalchemy import Column, String, Integer, ForeignKey, Date, DateTime, Text, JSON
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class EstudioAdjunto(Base, TimestampMixin):
    __tablename__ = "estudios_adjuntos"

    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id", ondelete="CASCADE"), nullable=False, index=True)
    consulta_id = Column(Integer, ForeignKey("consultas_medicas.id", ondelete="SET NULL"), nullable=True, index=True)
    medico_id = Column(Integer, ForeignKey("medicos.id", ondelete="SET NULL"), nullable=True, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="SET NULL"), nullable=True, index=True)

    titulo = Column(String(200), nullable=False)
    categoria = Column(String(50), nullable=False, index=True) # "laboratorio", "imagenologia", "informe", "otro"
    subtipo = Column(String(80), nullable=True) # "hemograma", "panoramica_dental", "ecografia", etc.
    
    # Archivo físico o Data URI (LONGTEXT para soportar imágenes base64 de hasta 4GB)
    archivo_url = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=False)
    archivo_nombre = Column(String(255), nullable=False)
    archivo_tipo = Column(String(100), nullable=False) # "image/jpeg", "image/png", "application/pdf"
    archivo_tamano = Column(Integer, default=0, nullable=False) # bytes

    fecha_estudio = Column(Date, default=date.today, nullable=False, index=True)
    notas = Column(Text, nullable=True)

    # Estado del análisis inteligente (bot clínico)
    # 'pendiente', 'analizado_normal', 'analizado_alterado', 'revisado_medico'
    estado_analisis = Column(String(40), default="pendiente", nullable=False, index=True)

    # Valores estructurados para Laboratorio:
    # [ { parametro: str, valor: float|str, unidad: str, ref_min: float, ref_max: float, estado: "normal"|"alto"|"bajo", alerta: bool, notas: str } ]
    valores_laboratorio = Column(JSON, nullable=True)

    # Datos estructurados para Imagenología (Eco, Panorámica Dental, Rx):
    # { region_anatomica: str, tecnica: str, hallazgos: str, conclusion: str, medidas: dict, recomendaciones: str }
    datos_imagenologia = Column(JSON, nullable=True)

    # Resumen e interpretación clínica (generado por el bot y editable por el médico)
    interpretacion_clinica = Column(Text, nullable=True)
    
    # Lista resumida de parámetros o hallazgos alterados para vista rápida
    alertas_detectadas = Column(JSON, nullable=True)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    paciente = relationship("Paciente", lazy="selectin")
    consulta = relationship("ConsultaMedica", lazy="selectin")
    medico = relationship("Medico", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
