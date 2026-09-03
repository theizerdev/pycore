from typing import List, Optional, Any, Dict
from datetime import date, datetime
from pydantic import BaseModel, Field

class PacienteBase(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    tipo_documento: str = Field(default="V", max_length=20)
    documento_identidad: str = Field(..., min_length=3, max_length=50)
    fecha_nacimiento: Optional[date] = None
    genero: str = Field(default="M", max_length=20)  # M, F, O
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais_telefono_id: Optional[int] = None
    sucursal_registro_id: Optional[int] = None

    # Ficha Médica Base
    grupo_sanguineo: Optional[str] = None  # A+, A-, B+, B-, AB+, AB-, O+, O-
    alergias: List[str] = []
    antecedentes_patologicos: Optional[str] = None
    antecedentes_familiares: Optional[str] = None
    antecedentes_quirurgicos: Optional[str] = None
    medicacion_habitual: Optional[str] = None
    observaciones_medicas: Optional[str] = None

    # Contacto de Emergencia
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_parentesco: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None

    # Seguro de salud
    seguro_medico: Optional[str] = None
    numero_poliza: Optional[str] = None

    activo: bool = True

class PacienteCreate(PacienteBase):
    pass

class PacienteUpdate(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    tipo_documento: Optional[str] = None
    documento_identidad: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    pais_telefono_id: Optional[int] = None
    sucursal_registro_id: Optional[int] = None

    # Ficha Médica
    grupo_sanguineo: Optional[str] = None
    alergias: Optional[List[str]] = None
    antecedentes_patologicos: Optional[str] = None
    antecedentes_familiares: Optional[str] = None
    antecedentes_quirurgicos: Optional[str] = None
    medicacion_habitual: Optional[str] = None
    observaciones_medicas: Optional[str] = None

    # Contacto de Emergencia
    contacto_emergencia_nombre: Optional[str] = None
    contacto_emergencia_parentesco: Optional[str] = None
    contacto_emergencia_telefono: Optional[str] = None

    # Seguro
    seguro_medico: Optional[str] = None
    numero_poliza: Optional[str] = None

    activo: Optional[bool] = None

class ConsultaResumenResponse(BaseModel):
    id: int
    fecha_consulta: datetime
    motivo_consulta: str
    medico_id: int
    medico_nombre: Optional[str] = None
    especialidad_id: int
    especialidad_nombre: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    signos_vitales: Dict[str, Any] = {}
    diagnostico_principal: str
    diagnosticos_secundarios: List[str] = []
    plan_tratamiento: Optional[str] = None
    receta_medica: List[Dict[str, Any]] = []
    indicaciones_generales: Optional[str] = None
    estado: str = "finalizada"

    class Config:
        from_attributes = True

class PacienteResponse(PacienteBase):
    id: int
    empresa_id: int
    edad: Optional[int] = None
    edad_texto: Optional[str] = None
    pais_nombre: Optional[str] = None
    pais_codigo_iso2: Optional[str] = None
    pais_codigo_telefonico: Optional[str] = None
    sucursal_nombre: Optional[str] = None
    total_consultas: int = 0
    ultima_consulta: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PacienteHistorialResponse(BaseModel):
    paciente: PacienteResponse
    consultas: List[ConsultaResumenResponse] = []
    alergias: List[str] = []
    signos_vitales_recientes: Optional[Dict[str, Any]] = None
