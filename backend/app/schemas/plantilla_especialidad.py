from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

class CampoClinico(BaseModel):
    """Definición de un campo o pregunta clínica dinámica."""
    key: str = Field(..., description="Identificador único del campo (ej. presion_arterial, fum, fuma)")
    label: str = Field(..., description="Pregunta o título visible del campo")
    tipo: str = Field(
        "text",
        description="Tipo de input: text, textarea, number, select, multiselect, boolean, date, scale_1_10"
    )
    placeholder: Optional[str] = None
    requerido: bool = False
    unidad: Optional[str] = Field(None, description="Unidad de medida opcional (ej. mmHg, bpm, kg, cm)")
    opciones: Optional[List[str]] = Field(default_factory=list, description="Opciones posibles si es select o multiselect")
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    grid_cols: int = Field(12, description="Ancho en rejilla de 12 columnas (12=ancho completo, 6=medio, 4=tercio)")
    
    # Metadata para identificar personalización médica
    es_medico: bool = Field(False, description="True si este campo fue agregado exclusivamente por el médico en sesión")
    medico_nombre: Optional[str] = None

    class Config:
        from_attributes = True


class SeccionClinica(BaseModel):
    """Agrupador de campos clínicos (ej. Signos Vitales, Antecedentes, Examen Físico)."""
    id: str = Field(..., description="Identificador único de la sección")
    titulo: str = Field(..., description="Nombre visible de la sección")
    descripcion: Optional[str] = None
    icono: Optional[str] = Field("FileText", description="Icono Lucide representativo de la sección")
    campos: List[CampoClinico] = Field(default_factory=list)

    class Config:
        from_attributes = True


# ── Schemas de Plantilla Base Institucional ──────────────────────────────────
class PlantillaEspecialidadSave(BaseModel):
    esquema_preconsulta: List[SeccionClinica] = Field(
        default_factory=list,
        description="Secciones y preguntas para el interrogatorio / triaje"
    )
    esquema_consulta: List[SeccionClinica] = Field(
        default_factory=list,
        description="Secciones y campos para la consulta médica"
    )
    widgets_activos: Optional[List[str]] = Field(
        default_factory=list,
        description="Widgets clínicos habilitados (ej. odontograma, refraccion, percentiles_oms, rueda_obstetrica)"
    )


class PlantillaEspecialidadResponse(BaseModel):
    id: int
    empresa_id: int
    especialidad_id: int
    version: int
    activo: bool
    esquema_preconsulta: List[SeccionClinica]
    esquema_consulta: List[SeccionClinica]
    widgets_activos: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Schemas de Personalización por Médico ───────────────────────────────────
class PlantillaMedicoSave(BaseModel):
    campos_preconsulta: List[CampoClinico] = Field(
        default_factory=list,
        description="Campos adicionales creados por el médico para la preconsulta"
    )
    campos_consulta: List[CampoClinico] = Field(
        default_factory=list,
        description="Campos adicionales creados por el médico para el examen de consulta"
    )
    campos_ocultos: Optional[List[str]] = Field(
        default_factory=list,
        description="Keys de campos base que el médico prefiere no mostrar en su pantalla"
    )


class PlantillaMedicoResponse(BaseModel):
    id: Optional[int] = None
    empresa_id: int
    especialidad_id: int
    usuario_id: int
    campos_preconsulta: List[CampoClinico]
    campos_consulta: List[CampoClinico]
    campos_ocultos: List[str]
    activo: bool

    class Config:
        from_attributes = True


# ── Schema de Plantilla Efectiva (Base + Médico Merged) ─────────────────────
class PlantillaEfectivaResponse(BaseModel):
    especialidad_id: int
    especialidad_nombre: str
    especialidad_color: Optional[str] = None
    especialidad_icono: Optional[str] = None
    tiene_plantilla_base: bool
    widgets_activos: List[str]
    
    # Secciones fusionadas con campos base + campos del médico (claramente identificados)
    preconsulta_secciones: List[SeccionClinica]
    consulta_secciones: List[SeccionClinica]
    
    total_campos_preconsulta: int
    total_campos_consulta: int
    total_campos_medico: int
