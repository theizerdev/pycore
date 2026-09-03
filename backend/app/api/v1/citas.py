import logging
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_permission
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.especialidad import Especialidad
from app.models.medico import Medico
from app.models.paciente import Paciente
from app.models.cita import CitaMedica
from app.models.auditoria import AuditoriaLog
from app.schemas.cita import (
    CitaCreate,
    CitaUpdate,
    CitaCambiarEstado,
    CitaResponse,
    CitaNotificarWhatsAppResponse,
)
from app.services.whatsapp_service import WhatsAppService
from app.api.v1.medicos import format_clean_whatsapp_number

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/citas", tags=["Agenda y Citas Médicas"])

VALID_ESTADOS = {
    "programada",
    "confirmada",
    "sala_espera",
    "en_consulta",
    "atendida",
    "cancelada",
    "no_asistio",
}

def build_cita_response(c: CitaMedica) -> CitaResponse:
    paciente_nombre = f"{c.paciente.nombres} {c.paciente.apellidos}" if c.paciente else "Paciente Desconocido"
    paciente_doc = f"{c.paciente.tipo_documento}-{c.paciente.documento_identidad}" if c.paciente else "S/D"
    paciente_tel = c.paciente.telefono if c.paciente else None

    medico_nombre = f"{c.medico.nombres} {c.medico.apellidos}" if c.medico else "Dr(a). Desconocido"
    medico_color = c.medico.color if c.medico and c.medico.color else "#0d9488"

    esp_nombre = c.especialidad.nombre if c.especialidad else "Medicina General"
    esp_color = c.especialidad.color if c.especialidad and c.especialidad.color else "#8b5cf6"
    suc_nombre = c.sucursal.nombre if c.sucursal else "Sede Central"

    return CitaResponse(
        id=c.id,
        empresa_id=c.empresa_id,
        sucursal_id=c.sucursal_id,
        medico_id=c.medico_id,
        especialidad_id=c.especialidad_id,
        paciente_id=c.paciente_id,
        fecha=c.fecha,
        hora_inicio=c.hora_inicio,
        hora_fin=c.hora_fin,
        duracion_minutos=c.duracion_minutos,
        motivo=c.motivo,
        notas=c.notas,
        estado=c.estado,
        motivo_cancelacion=c.motivo_cancelacion,
        whatsapp_notificado=c.whatsapp_notificado,
        whatsapp_notificado_at=c.whatsapp_notificado_at,
        paciente_nombre=paciente_nombre,
        paciente_documento=paciente_doc,
        paciente_telefono=paciente_tel,
        medico_nombre=medico_nombre,
        medico_color=medico_color,
        especialidad_nombre=esp_nombre,
        especialidad_color=esp_color,
        sucursal_nombre=suc_nombre,
        created_at=c.created_at,
        updated_at=c.updated_at,
    )


@router.get("", response_model=List[CitaResponse])
async def list_citas(
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin (YYYY-MM-DD)"),
    medico_id: Optional[int] = Query(None),
    especialidad_id: Optional[int] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    paciente_id: Optional[int] = Query(None),
    estado: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.ver")),
):
    """
    Listar citas médicas con filtros asistenciales por rango de fechas, médico, sucursal o estado.
    """
    query = (
        select(CitaMedica)
        .options(
            selectinload(CitaMedica.paciente),
            selectinload(CitaMedica.medico),
            selectinload(CitaMedica.especialidad),
            selectinload(CitaMedica.sucursal),
        )
        .order_by(CitaMedica.fecha.asc(), CitaMedica.hora_inicio.asc())
    )

    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    if fecha_inicio:
        query = query.where(CitaMedica.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.where(CitaMedica.fecha <= fecha_fin)
    if medico_id:
        query = query.where(CitaMedica.medico_id == medico_id)
    if especialidad_id:
        query = query.where(CitaMedica.especialidad_id == especialidad_id)
    if sucursal_id:
        query = query.where(CitaMedica.sucursal_id == sucursal_id)
    if paciente_id:
        query = query.where(CitaMedica.paciente_id == paciente_id)
    if estado and estado != "all":
        query = query.where(CitaMedica.estado == estado)

    result = await db.execute(query)
    citas = result.scalars().all()
    return [build_cita_response(c) for c in citas]


@router.get("/{id}", response_model=CitaResponse)
async def get_cita(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.ver")),
):
    """
    Obtener detalle completo de una cita médica.
    """
    query = (
        select(CitaMedica)
        .options(
            selectinload(CitaMedica.paciente),
            selectinload(CitaMedica.medico),
            selectinload(CitaMedica.especialidad),
            selectinload(CitaMedica.sucursal),
        )
        .where(CitaMedica.id == id)
    )
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita médica no encontrada")

    return build_cita_response(cita)


@router.post("", response_model=CitaResponse, status_code=status.HTTP_201_CREATED)
async def create_cita(
    payload: CitaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.crear")),
):
    """
    Agendar una nueva cita médica con validación de traslapes y opción de notificación WhatsApp automática.
    """
    empresa_id = current_user.empresa_id
    if current_user.es_superadmin and not empresa_id:
        # Fallback a la primera empresa
        res_emp = await db.execute(select(Empresa.id).limit(1))
        empresa_id = res_emp.scalar() or 1

    # Validar que no sea en fecha u hora anterior a la actual
    today = date.today()
    now_time_str = datetime.now().strftime("%H:%M")
    if payload.fecha < today or (payload.fecha == today and payload.hora_inicio < now_time_str):
        raise HTTPException(
            status_code=400,
            detail="No es permitido registrar citas en horas anteriores"
        )

    # Validar existencia de entidades
    res_pac = await db.execute(
        select(Paciente).where(Paciente.id == payload.paciente_id, Paciente.empresa_id == empresa_id)
    )
    paciente = res_pac.scalar_one_or_none()
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado en esta clínica")

    res_med = await db.execute(
        select(Medico)
        .options(selectinload(Medico.usuario))
        .where(Medico.id == payload.medico_id, Medico.empresa_id == empresa_id)
    )
    medico = res_med.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=404, detail="Médico no encontrado")

    res_esp = await db.execute(
        select(Especialidad).where(Especialidad.id == payload.especialidad_id)
    )
    especialidad = res_esp.scalar_one_or_none()
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no válida")

    res_suc = await db.execute(
        select(Sucursal).where(Sucursal.id == payload.sucursal_id, Sucursal.empresa_id == empresa_id)
    )
    sucursal = res_suc.scalar_one_or_none()
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no válida")

    # Verificar si hay conflicto de horario para el mismo médico (salvo citas canceladas)
    conflicto_query = select(CitaMedica).where(
        CitaMedica.medico_id == payload.medico_id,
        CitaMedica.fecha == payload.fecha,
        CitaMedica.estado != "cancelada",
        or_(
            and_(CitaMedica.hora_inicio <= payload.hora_inicio, CitaMedica.hora_fin > payload.hora_inicio),
            and_(CitaMedica.hora_inicio < payload.hora_fin, CitaMedica.hora_fin >= payload.hora_fin),
            and_(CitaMedica.hora_inicio >= payload.hora_inicio, CitaMedica.hora_fin <= payload.hora_fin),
        )
    )
    res_conf = await db.execute(conflicto_query)
    citas_traslapadas = res_conf.scalars().all()
    if citas_traslapadas:
        raise HTTPException(
            status_code=400,
            detail=f"El médico ya tiene una cita agendada en ese horario ({citas_traslapadas[0].hora_inicio} - {citas_traslapadas[0].hora_fin}). Elija otro horario."
        )

    # Crear la cita
    nueva_cita = CitaMedica(
        empresa_id=empresa_id,
        sucursal_id=payload.sucursal_id,
        medico_id=payload.medico_id,
        especialidad_id=payload.especialidad_id,
        paciente_id=payload.paciente_id,
        fecha=payload.fecha,
        hora_inicio=payload.hora_inicio,
        hora_fin=payload.hora_fin,
        duracion_minutos=payload.duracion_minutos,
        motivo=payload.motivo,
        notas=payload.notas,
        estado="programada",
    )
    db.add(nueva_cita)
    await db.flush()

    # Si se solicitó notificar por WhatsApp al paciente
    if payload.notificar_whatsapp and paciente.telefono:
        try:
            clean_phone = format_clean_whatsapp_number(
                paciente.telefono, paciente.pais_codigo_telefonico or "58"
            )
            if clean_phone:
                res_emp_nombre = await db.execute(select(Empresa.nombre).where(Empresa.id == empresa_id))
                nombre_clinica = res_emp_nombre.scalar() or "Centro Médico"

                nombre_doc = f"{medico.nombres} {medico.apellidos}" if medico else "Especialista"
                fecha_str = payload.fecha.strftime("%d/%m/%Y")

                mensaje_ws = (
                    f"👋 ¡Hola *{paciente.nombres}*!\n\n"
                    f"Le confirmamos su cita médica en *{nombre_clinica}*:\n\n"
                    f"🩺 *Especialidad:* {especialidad.nombre}\n"
                    f"👨‍⚕️ *Especialista:* Dr(a). {nombre_doc}\n"
                    f"📅 *Fecha:* {fecha_str}\n"
                    f"⏰ *Hora:* {payload.hora_inicio}\n"
                    f"📍 *Sede:* {sucursal.nombre}\n\n"
                    f"💡 *Motivo:* {payload.motivo}\n\n"
                    f"Por favor presentarse 10 minutos antes de su consulta. En caso de requerir reprogramación, puede responder a este mensaje.\n\n"
                    f"¡Cuidamos de su salud! 🩺✨"
                )

                send_res = await WhatsAppService.send_message(
                    to=clean_phone,
                    message=mensaje_ws,
                    sync=False,
                    simulate_typing=False,
                )
                if send_res.get("success"):
                    nueva_cita.whatsapp_notificado = True
                    nueva_cita.whatsapp_notificado_at = datetime.now()
        except Exception as err:
            logger.warning(f"No se pudo enviar notificación WhatsApp automática de cita: {err}")

    # Auditoría
    db.add(
        AuditoriaLog(
            empresa_id=empresa_id,
            usuario_id=current_user.id,
            accion="CREAR",
            modulo="citas",
            detalles={"cita_id": nueva_cita.id, "fecha": str(payload.fecha), "hora": payload.hora_inicio, "paciente_id": payload.paciente_id},
        )
    )

    await db.commit()

    # Recargar relaciones
    return await get_cita(nueva_cita.id, db, current_user)


@router.put("/{id}", response_model=CitaResponse)
async def update_cita(
    id: int,
    payload: CitaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.editar")),
):
    """
    Modificar datos u horario de una cita médica.
    """
    query = select(CitaMedica).where(CitaMedica.id == id)
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita médica no encontrada")

    target_fecha = payload.fecha or cita.fecha
    target_medico_id = payload.medico_id or cita.medico_id
    target_hora_inicio = payload.hora_inicio or cita.hora_inicio
    target_hora_fin = payload.hora_fin or cita.hora_fin

    # Validar que no se reprograme a horas o fechas anteriores a la actual
    today = date.today()
    now_time_str = datetime.now().strftime("%H:%M")
    if (payload.fecha and payload.fecha < today) or (
        target_fecha == today and payload.hora_inicio and payload.hora_inicio < now_time_str
    ):
        raise HTTPException(
            status_code=400,
            detail="No es permitido registrar citas en horas anteriores"
        )

    # Si se cambia horario, fecha o médico, validar que no colisione con otra cita activa
    if payload.fecha or payload.hora_inicio or payload.hora_fin or payload.medico_id:
        overlap_query = select(CitaMedica).options(selectinload(CitaMedica.paciente)).where(
            CitaMedica.id != id,
            CitaMedica.medico_id == target_medico_id,
            CitaMedica.fecha == target_fecha,
            CitaMedica.estado != "cancelada",
            and_(
                CitaMedica.hora_inicio < target_hora_fin,
                CitaMedica.hora_fin > target_hora_inicio,
            )
        )
        overlap_res = await db.execute(overlap_query)
        overlap_cita = overlap_res.scalar_one_or_none()
        if overlap_cita:
            pac_nom = f"{overlap_cita.paciente.nombres} {overlap_cita.paciente.apellidos}" if overlap_cita.paciente else "otro paciente"
            raise HTTPException(
                status_code=400,
                detail=f"Conflicto de horario: El especialista ya tiene una cita de {overlap_cita.hora_inicio} a {overlap_cita.hora_fin} con {pac_nom}"
            )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(cita, field, val)

    cita.updated_at = datetime.now()
    await db.commit()

    return await get_cita(cita.id, db, current_user)


@router.patch("/{id}/estado", response_model=CitaResponse)
async def cambiar_estado_cita(
    id: int,
    payload: CitaCambiarEstado,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.cambiar_estado")),
):
    """
    Transición del estado asistencial de la cita:
    'programada' -> 'confirmada' -> 'sala_espera' -> 'en_consulta' -> 'atendida' / 'cancelada' / 'no_asistio'.
    """
    if payload.estado not in VALID_ESTADOS:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Opciones permitidas: {', '.join(VALID_ESTADOS)}"
        )

    query = select(CitaMedica).where(CitaMedica.id == id)
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita médica no encontrada")

    estado_anterior = cita.estado
    cita.estado = payload.estado

    if payload.estado == "cancelada":
        cita.motivo_cancelacion = payload.motivo_cancelacion

    cita.updated_at = datetime.now()

    # Auditoría del cambio de estado
    db.add(
        AuditoriaLog(
            empresa_id=cita.empresa_id,
            usuario_id=current_user.id,
            accion="CAMBIAR_ESTADO",
            modulo="citas",
            detalles={
                "cita_id": cita.id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": payload.estado,
                "motivo_cancelacion": payload.motivo_cancelacion,
            },
        )
    )

    await db.commit()
    return await get_cita(cita.id, db, current_user)


@router.post("/{id}/notificar-whatsapp", response_model=CitaNotificarWhatsAppResponse)
async def notificar_whatsapp(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.ver")),
):
    """
    Enviar confirmación o recordatorio automático de cita médica al WhatsApp del paciente.
    """
    query = (
        select(CitaMedica)
        .options(
            selectinload(CitaMedica.paciente),
            selectinload(CitaMedica.medico),
            selectinload(CitaMedica.especialidad),
            selectinload(CitaMedica.sucursal),
            selectinload(CitaMedica.empresa),
        )
        .where(CitaMedica.id == id)
    )
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita médica no encontrada")

    paciente = cita.paciente
    if not paciente or not paciente.telefono:
        raise HTTPException(status_code=400, detail="El paciente no tiene un teléfono registrado")

    clean_phone = format_clean_whatsapp_number(
        paciente.telefono, paciente.pais_codigo_telefonico or "58"
    )
    if not clean_phone:
        raise HTTPException(status_code=400, detail="El número de teléfono del paciente no es válido")

    nombre_clinica = cita.empresa.nombre if cita.empresa else "Centro Médico"
    nombre_doc = f"{cita.medico.nombres} {cita.medico.apellidos}" if cita.medico else "Especialista"
    fecha_str = cita.fecha.strftime("%d/%m/%Y")

    mensaje = (
        f"👋 ¡Hola *{paciente.nombres}*!\n\n"
        f"Le recordamos los detalles de su cita médica en *{nombre_clinica}*:\n\n"
        f"🩺 *Especialidad:* {cita.especialidad.nombre if cita.especialidad else 'Medicina'}\n"
        f"👨‍⚕️ *Especialista:* Dr(a). {nombre_doc}\n"
        f"📅 *Fecha:* {fecha_str}\n"
        f"⏰ *Hora:* {cita.hora_inicio}\n"
        f"📍 *Sede:* {cita.sucursal.nombre if cita.sucursal else 'Sede Central'}\n"
        f"📋 *Estado:* {cita.estado.replace('_', ' ').capitalize()}\n\n"
        f"💡 *Motivo:* {cita.motivo}\n\n"
        f"Por favor acuda con 10 minutos de anticipación. Para reprogramar o confirmar, puede responder a este mensaje.\n\n"
        f"¡Cuidamos de su salud! 🩺✨"
    )

    send_res = await WhatsAppService.send_message(
        to=clean_phone,
        message=mensaje,
        sync=False,
        simulate_typing=False,
    )

    success = send_res.get("success", False)
    if success:
        cita.whatsapp_notificado = True
        cita.whatsapp_notificado_at = datetime.now()
        await db.commit()

    direct_url = f"https://wa.me/{clean_phone}?text={mensaje.replace(' ', '%20').replace('\n', '%0A')}"

    return CitaNotificarWhatsAppResponse(
        success=success,
        mensaje_enviado=mensaje,
        destinatario=clean_phone,
        whatsapp_direct_url=direct_url,
        detalle="Notificación despachada exitosamente por WhatsApp" if success else send_res.get("message", "Error al enviar mensaje por WhatsApp"),
    )


@router.delete("/{id}")
async def delete_cita(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.eliminar")),
):
    """
    Inactivar o cancelar una cita médica.
    """
    query = select(CitaMedica).where(CitaMedica.id == id)
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita médica no encontrada")

    cita.estado = "cancelada"
    cita.motivo_cancelacion = "Cancelada por usuario"
    cita.updated_at = datetime.now()
    await db.commit()

    return {"message": "Cita cancelada correctamente", "id": id}
