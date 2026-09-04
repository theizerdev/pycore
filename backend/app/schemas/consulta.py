from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class PacienteMini(BaseModel):
    id: int
    nombres: str
    apellidos: str
    tipo_documento: Optional[str] = None
    documento_identidad: Optional[str] = None
    numero_documento: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    genero: Optional[str] = None
    fecha_nacimiento: Optional[Any] = None
    edad: Optional[int] = None
    grupo_sanguineo: Optional[str] = None
    alergias: Optional[Any] = None
    antecedentes_patologicos: Optional[str] = None
    medicacion_habitual: Optional[str] = None

    class Config:
        from_attributes = True

class MedicoMini(BaseModel):
    id: int
    nombres: str
    apellidos: str
    especialidad_id: Optional[int] = None
    numero_colegiado: Optional[str] = None
    color_calendario: Optional[str] = None

    class Config:
        from_attributes = True

class EspecialidadMini(BaseModel):
    id: int
    nombre: str
    codigo: Optional[str] = None
    color: Optional[str] = None
    icono: Optional[str] = None

    class Config:
        from_attributes = True

class PreconsultaMini(BaseModel):
    id: int
    token: str
    estado: str
    respuestas: Dict[str, Any] = {}
    whatsapp_enviado: bool = False
    whatsapp_enviado_at: Optional[datetime] = None
    completada_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class SucursalMini(BaseModel):
    id: int
    nombre: str
    codigo: Optional[str] = None

    class Config:
        from_attributes = True

class CitaMini(BaseModel):
    id: int
    fecha: Optional[Any] = None
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    estado: Optional[str] = None
    motivo: Optional[str] = None

    class Config:
        from_attributes = True

class ConsultaBase(BaseModel):
    motivo_consulta: str
    enfermedad_actual: Optional[str] = None
    signos_vitales: Optional[Dict[str, Any]] = {}
    datos_plantilla: Optional[Dict[str, Any]] = {}
    estudios_solicitados: Optional[List[Any]] = []
    receta_medica: Optional[List[Any]] = []
    reposo_medico: Optional[Dict[str, Any]] = {}
    diagnostico_principal: Optional[str] = None
    diagnosticos_secundarios: Optional[List[Any]] = []
    plan_tratamiento: Optional[str] = None
    indicaciones_generales: Optional[str] = None
    observaciones_adicionales: Optional[str] = None
    referido_para: Optional[str] = None
    estado: str = "en_espera"

class ConsultaCreate(ConsultaBase):
    paciente_id: int
    medico_id: int
    especialidad_id: int
    sucursal_id: Optional[int] = None
    cita_id: Optional[int] = None
    preconsulta_id: Optional[int] = None

class ConsultaUpdate(BaseModel):
    motivo_consulta: Optional[str] = None
    enfermedad_actual: Optional[str] = None
    signos_vitales: Optional[Dict[str, Any]] = None
    datos_plantilla: Optional[Dict[str, Any]] = None
    estudios_solicitados: Optional[List[Any]] = None
    receta_medica: Optional[List[Any]] = None
    reposo_medico: Optional[Dict[str, Any]] = None
    diagnostico_principal: Optional[str] = None
    diagnosticos_secundarios: Optional[List[Any]] = None
    plan_tratamiento: Optional[str] = None
    indicaciones_generales: Optional[str] = None
    observaciones_adicionales: Optional[str] = None
    referido_para: Optional[str] = None
    estado: Optional[str] = None

class ConsultaCambiarEstado(BaseModel):
    estado: str  # 'en_espera', 'en_curso', 'finalizada', 'anulada'
    motivo: Optional[str] = None

class ConsultaResponse(BaseModel):
    id: int
    codigo: Optional[str] = None
    empresa_id: int
    sucursal_id: Optional[int] = None
    cita_id: Optional[int] = None
    paciente_id: int
    medico_id: int
    especialidad_id: int
    preconsulta_id: Optional[int] = None
    creado_por: Optional[int] = None
    fecha_consulta: datetime
    motivo_consulta: str
    enfermedad_actual: Optional[str] = None
    signos_vitales: Optional[Dict[str, Any]] = {}
    datos_plantilla: Optional[Dict[str, Any]] = {}
    estudios_solicitados: Optional[List[Any]] = []
    receta_medica: Optional[List[Any]] = []
    reposo_medico: Optional[Dict[str, Any]] = {}
    diagnostico_principal: Optional[str] = None
    diagnosticos_secundarios: Optional[List[Any]] = []
    plan_tratamiento: Optional[str] = None
    indicaciones_generales: Optional[str] = None
    observaciones_adicionales: Optional[str] = None
    referido_para: Optional[str] = None
    estado: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Relaciones anidadas
    paciente: Optional[PacienteMini] = None
    medico: Optional[MedicoMini] = None
    especialidad: Optional[EspecialidadMini] = None
    preconsulta: Optional[PreconsultaMini] = None
    sucursal: Optional[SucursalMini] = None
    cita: Optional[CitaMini] = None

    class Config:
        from_attributes = True

class ConsultaResumenContadores(BaseModel):
    sala_espera: int = 0
    en_consulta: int = 0
    atendidas: int = 0
    total_hoy: int = 0
