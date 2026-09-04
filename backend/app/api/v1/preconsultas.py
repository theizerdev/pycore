import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.models.preconsulta import Preconsulta
from app.models.consulta import ConsultaMedica
from app.models.cita import CitaMedica
from app.models.paciente import Paciente
from app.models.medico import Medico
from app.models.especialidad import Especialidad
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.plantilla_especialidad import EspecialidadPlantilla, EspecialidadPlantillaMedico
from app.services.clinical_templates_seed import get_template_for_specialty

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/preconsultas", tags=["Preconsultas Públicas"])


class ResponderPreconsultaRequest(BaseModel):
    respuestas: Dict[str, Any]


@router.get("/public/{token}")
async def get_preconsulta_publica(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint público para que el paciente acceda desde su WhatsApp a su formulario
    de preconsulta dinámica según la especialidad y el médico de su cita.
    """
    query = (
        select(Preconsulta)
        .options(
            selectinload(Preconsulta.cita),
            selectinload(Preconsulta.paciente),
            selectinload(Preconsulta.medico),
            selectinload(Preconsulta.especialidad),
            selectinload(Preconsulta.empresa),
            selectinload(Preconsulta.sucursal),
        )
        .where(Preconsulta.token == token)
    )
    result = await db.execute(query)
    pre = result.scalar_one_or_none()

    if not pre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario de preconsulta no encontrado o enlace no válido."
        )

    paciente = pre.paciente
    medico = pre.medico
    especialidad = pre.especialidad
    empresa = pre.empresa
    sucursal = pre.sucursal
    cita = pre.cita

    # 1. Obtener la plantilla de preconsulta base de la especialidad
    res_plantilla = await db.execute(
        select(EspecialidadPlantilla).where(
            EspecialidadPlantilla.especialidad_id == pre.especialidad_id,
            EspecialidadPlantilla.empresa_id == pre.empresa_id
        )
    )
    plantilla_db = res_plantilla.scalar_one_or_none()

    secciones_preconsulta: List[Dict[str, Any]] = []
    if plantilla_db and plantilla_db.esquema_preconsulta:
        secciones_preconsulta = list(plantilla_db.esquema_preconsulta)
    elif especialidad:
        # Usar plantilla sugerida precargada según el nombre de la especialidad
        sugerencia = get_template_for_specialty(especialidad.nombre)
        secciones_preconsulta = sugerencia.get("esquema_preconsulta", [])

    # 2. Obtener personalizaciones de preguntas creadas por el médico si aplica
    if medico and medico.usuario_id:
        res_med_plantilla = await db.execute(
            select(EspecialidadPlantillaMedico).where(
                EspecialidadPlantillaMedico.especialidad_id == pre.especialidad_id,
                EspecialidadPlantillaMedico.usuario_id == medico.usuario_id,
                EspecialidadPlantillaMedico.empresa_id == pre.empresa_id
            )
        )
        plantilla_med = res_med_plantilla.scalar_one_or_none()
        if plantilla_med and plantilla_med.campos_preconsulta:
            # Agregar sección especial de preguntas del especialista
            secciones_preconsulta.append({
                "id": "preguntas_especialista_medico",
                "titulo": f"Preguntas del Dr(a). {medico.nombres} {medico.apellidos}",
                "descripcion": "Preguntas específicas requeridas por su médico tratante",
                "icono": "UserCheck",
                "campos": plantilla_med.campos_preconsulta
            })

    # Formatear respuesta segura para el paciente
    return {
        "token": pre.token,
        "estado": pre.estado,
        "completada_at": pre.completada_at,
        "paciente": {
            "id": paciente.id if paciente else None,
            "nombres": paciente.nombres if paciente else "Paciente",
            "apellidos": paciente.apellidos if paciente else "",
            "documento": f"{paciente.tipo_documento}-{paciente.documento_identidad}" if paciente else "",
            "telefono": paciente.telefono if paciente else None,
        },
        "medico": {
            "id": medico.id if medico else None,
            "nombres": medico.nombres if medico else "",
            "apellidos": medico.apellidos if medico else "",
            "color": medico.color if medico and medico.color else "#0d9488",
        },
        "especialidad": {
            "id": especialidad.id if especialidad else None,
            "nombre": especialidad.nombre if especialidad else "Consulta Médica",
            "color": especialidad.color if especialidad and especialidad.color else "#8b5cf6",
            "icono": especialidad.icono if especialidad and especialidad.icono else "Stethoscope",
        },
        "empresa": {
            "id": empresa.id if empresa else None,
            "nombre": empresa.nombre if empresa else "Centro Médico",
            "logo_url": empresa.logo_url if empresa else None,
            "logo_mini_url": empresa.logo_mini_url if empresa else None,
            "telefono": empresa.telefono if empresa else None,
            "direccion": empresa.direccion if empresa else None,
        },
        "sucursal": {
            "id": sucursal.id if sucursal else None,
            "nombre": sucursal.nombre if sucursal else "Sede Central",
            "direccion": sucursal.direccion if sucursal else None,
        },
        "cita": {
            "id": cita.id if cita else None,
            "fecha": str(cita.fecha) if cita else "",
            "hora_inicio": cita.hora_inicio if cita else "",
            "hora_fin": cita.hora_fin if cita else "",
            "motivo": cita.motivo if cita else "",
        },
        "secciones": secciones_preconsulta,
        "respuestas": pre.respuestas or {}
    }


@router.post("/public/{token}/responder")
async def responder_preconsulta_publica(
    token: str,
    payload: ResponderPreconsultaRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Guarda las respuestas enviadas por el paciente desde su teléfono móvil y marca
    la preconsulta como completada.
    """
    query = select(Preconsulta).where(Preconsulta.token == token)
    result = await db.execute(query)
    pre = result.scalar_one_or_none()

    if not pre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Formulario de preconsulta no encontrado."
        )

    pre.respuestas = payload.respuestas
    pre.estado = "completada"
    pre.completada_at = datetime.now()
    pre.updated_at = datetime.now()

    # Si hay una consulta médica vinculada, sincronizar las respuestas de preconsulta
    res_con = await db.execute(
        select(ConsultaMedica).where(ConsultaMedica.cita_id == pre.cita_id)
    )
    consulta = res_con.scalar_one_or_none()
    if consulta:
        datos = dict(consulta.datos_plantilla or {})
        datos["preconsulta_respuestas"] = payload.respuestas
        datos["preconsulta_completada_at"] = pre.completada_at.isoformat()
        consulta.datos_plantilla = datos
        consulta.updated_at = datetime.now()

    await db.commit()

    return {
        "success": True,
        "message": "¡Preconsulta completada con éxito! Sus respuestas ya han sido enviadas a su médico tratante."
    }
