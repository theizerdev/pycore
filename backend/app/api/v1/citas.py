import logging
from typing import List, Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, require_permission
import uuid
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.models.especialidad import Especialidad
from app.models.servicio import Servicio
from app.models.medico import Medico
from app.models.paciente import Paciente
from app.models.cita import CitaMedica
from app.models.bloqueo import BloqueoAgenda
from app.models.preconsulta import Preconsulta
from app.models.consulta import ConsultaMedica
from app.models.integracion import WhatsAppMessage
from app.models.auditoria import AuditoriaLog
from app.schemas.cita import (
    CitaCreate,
    CitaUpdate,
    CitaCambiarEstado,
    CitaCambiarPago,
    CitaResponse,
    CitaNotificarWhatsAppResponse,
    BloqueoAgendaCreate,
    BloqueoAgendaResponse,
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
    serv_nombre = c.servicio.nombre if c.servicio else None

    return CitaResponse(
        id=c.id,
        empresa_id=c.empresa_id,
        sucursal_id=c.sucursal_id,
        medico_id=c.medico_id,
        especialidad_id=c.especialidad_id,
        servicio_id=c.servicio_id,
        paciente_id=c.paciente_id,
        fecha=c.fecha,
        hora_inicio=c.hora_inicio,
        hora_fin=c.hora_fin,
        duracion_minutos=c.duracion_minutos,
        motivo=c.motivo,
        notas=c.notas,
        estado=c.estado,
        motivo_cancelacion=c.motivo_cancelacion,
        servicio_nombre=serv_nombre,
        precio_estimado=c.precio_estimado or 0.0,
        estado_pago=c.estado_pago or "pendiente",
        metodo_pago=c.metodo_pago,
        es_sobreturno=bool(c.es_sobreturno),
        motivo_sobreturno=c.motivo_sobreturno,
        whatsapp_notificado=c.whatsapp_notificado,
        whatsapp_notificado_at=c.whatsapp_notificado_at,
        recordatorio_enviado=bool(c.recordatorio_enviado),
        recordatorio_enviado_at=c.recordatorio_enviado_at,
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


def get_empresa_codigo_pais(empresa: Optional[Empresa]) -> str:
    """Obtiene el código telefónico internacional del país de la empresa (default: '58')."""
    if empresa:
        if empresa.pais_telefono and empresa.pais_telefono.codigo_telefonico:
            return empresa.pais_telefono.codigo_telefonico
        if empresa.pais and empresa.pais.codigo_telefonico:
            return empresa.pais.codigo_telefonico
    return "58"


async def get_medico_id_for_user(db: AsyncSession, user: Usuario) -> Optional[int]:
    """
    Si el usuario logueado es un médico especialista, obtiene su ID de médico para restringir
    la visualización de citas exclusivamente a su propia agenda.
    """
    if user.es_superadmin:
        return None

    # Si el usuario tiene asignado el rol de 'medico'
    is_doctor_role = bool(user.rol and user.rol.slug == "medico")
    
    # Buscar la ficha médica asociada por usuario_id o por email dentro de su empresa
    stmt = select(Medico.id).where(
        Medico.empresa_id == user.empresa_id,
        or_(
            Medico.usuario_id == user.id,
            func.lower(Medico.email) == user.email.lower()
        )
    )
    res = await db.execute(stmt)
    med_id = res.scalar_one_or_none()

    if is_doctor_role or med_id is not None:
        return med_id if med_id is not None else -1

    return None


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
    Si el usuario logueado es un doctor, solo ve sus propias citas.
    """
    query = (
        select(CitaMedica)
        .options(
            selectinload(CitaMedica.paciente),
            selectinload(CitaMedica.medico),
            selectinload(CitaMedica.especialidad),
            selectinload(CitaMedica.sucursal),
            selectinload(CitaMedica.servicio),
        )
        .order_by(CitaMedica.fecha.asc(), CitaMedica.hora_inicio.asc())
    )

    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    # Restricción obligatoria si el usuario logueado es médico
    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        query = query.where(CitaMedica.medico_id == doctor_auto_id)
    elif medico_id:
        query = query.where(CitaMedica.medico_id == medico_id)

    if fecha_inicio:
        query = query.where(CitaMedica.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.where(CitaMedica.fecha <= fecha_fin)
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


@router.get("/bloqueos", response_model=List[BloqueoAgendaResponse])
async def list_bloqueos(
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    medico_id: Optional[int] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.ver")),
):
    """
    Listar bloqueos de horario de la clínica (cirugías, almuerzos, vacaciones, reuniones).
    """
    query = (
        select(BloqueoAgenda)
        .options(
            selectinload(BloqueoAgenda.medico),
            selectinload(BloqueoAgenda.sucursal),
        )
        .order_by(BloqueoAgenda.fecha.asc(), BloqueoAgenda.hora_inicio.asc())
    )
    if not current_user.es_superadmin:
        query = query.where(BloqueoAgenda.empresa_id == current_user.empresa_id)

    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        query = query.where(BloqueoAgenda.medico_id == doctor_auto_id)
    elif medico_id:
        query = query.where(BloqueoAgenda.medico_id == medico_id)

    if fecha_inicio:
        query = query.where(BloqueoAgenda.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.where(BloqueoAgenda.fecha <= fecha_fin)
    if sucursal_id:
        query = query.where(BloqueoAgenda.sucursal_id == sucursal_id)

    res = await db.execute(query)
    bloqueos = res.scalars().all()

    return [
        BloqueoAgendaResponse(
            id=b.id,
            empresa_id=b.empresa_id,
            sucursal_id=b.sucursal_id,
            medico_id=b.medico_id,
            fecha=b.fecha,
            hora_inicio=b.hora_inicio,
            hora_fin=b.hora_fin,
            tipo=b.tipo,
            motivo=b.motivo,
            medico_nombre=f"{b.medico.nombres} {b.medico.apellidos}" if b.medico else None,
            sucursal_nombre=b.sucursal.nombre if b.sucursal else None,
            created_at=b.created_at,
        )
        for b in bloqueos
    ]


@router.post("/bloqueos", response_model=BloqueoAgendaResponse, status_code=status.HTTP_201_CREATED)
async def create_bloqueo(
    payload: BloqueoAgendaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.crear")),
):
    """
    Registrar un bloqueo de horario para un médico.
    """
    empresa_id = current_user.empresa_id
    if current_user.es_superadmin and not empresa_id:
        res_emp = await db.execute(select(Empresa.id).limit(1))
        empresa_id = res_emp.scalar() or 1

    nuevo_bloqueo = BloqueoAgenda(
        empresa_id=empresa_id,
        sucursal_id=payload.sucursal_id,
        medico_id=payload.medico_id,
        fecha=payload.fecha,
        hora_inicio=payload.hora_inicio,
        hora_fin=payload.hora_fin,
        tipo=payload.tipo,
        motivo=payload.motivo,
    )
    db.add(nuevo_bloqueo)
    await db.commit()

    res_b = await db.execute(
        select(BloqueoAgenda)
        .options(selectinload(BloqueoAgenda.medico), selectinload(BloqueoAgenda.sucursal))
        .where(BloqueoAgenda.id == nuevo_bloqueo.id)
    )
    b = res_b.scalar_one()
    return BloqueoAgendaResponse(
        id=b.id,
        empresa_id=b.empresa_id,
        sucursal_id=b.sucursal_id,
        medico_id=b.medico_id,
        fecha=b.fecha,
        hora_inicio=b.hora_inicio,
        hora_fin=b.hora_fin,
        tipo=b.tipo,
        motivo=b.motivo,
        medico_nombre=f"{b.medico.nombres} {b.medico.apellidos}" if b.medico else None,
        sucursal_nombre=b.sucursal.nombre if b.sucursal else None,
        created_at=b.created_at,
    )


@router.delete("/bloqueos/{id}")
async def delete_bloqueo(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.eliminar")),
):
    """
    Eliminar un bloqueo de horario existente.
    """
    query = select(BloqueoAgenda).where(BloqueoAgenda.id == id)
    if not current_user.es_superadmin:
        query = query.where(BloqueoAgenda.empresa_id == current_user.empresa_id)

    res = await db.execute(query)
    b = res.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Bloqueo no encontrado")

    await db.delete(b)
    await db.commit()
    return {"message": "Bloqueo eliminado exitosamente", "id": id}


@router.post("/recordatorios/enviar-proximas")
async def enviar_recordatorios_proximas(
    fecha: Optional[date] = Query(None, description="Fecha a recordar (default: mañana)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.editar")),
):
    """
    Despachar recordatorios de WhatsApp a todas las citas activas del día indicado (o mañana).
    """
    from datetime import timedelta
    target_fecha = fecha or (date.today() + timedelta(days=1))

    query = (
        select(CitaMedica)
        .options(
            selectinload(CitaMedica.paciente),
            selectinload(CitaMedica.medico),
            selectinload(CitaMedica.especialidad),
            selectinload(CitaMedica.servicio),
            selectinload(CitaMedica.sucursal),
        )
        .where(
            CitaMedica.fecha == target_fecha,
            CitaMedica.estado.in_(["programada", "confirmada"]),
            CitaMedica.recordatorio_enviado == False,
        )
    )
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(query)
    citas_a_recordar = res.scalars().all()

    if not citas_a_recordar:
        return {
            "success": True,
            "total_citas": 0,
            "enviados": 0,
            "message": f"No hay citas pendientes de recordatorio para el {target_fecha.strftime('%d/%m/%Y')}",
        }

    # Obtener datos de empresa para WhatsApp
    res_emp = await db.execute(
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == current_user.empresa_id)
    )
    empresa_obj = res_emp.scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais(empresa_obj)
    nombre_clinica = empresa_obj.nombre if empresa_obj else "Centro Médico"

    wa_service = WhatsAppService(
        api_url=empresa_obj.whatsapp_api_url or "https://whatsapp.theizerdev.com",
        api_key=empresa_obj.whatsapp_api_key,
        instance_name=empresa_obj.whatsapp_instance or f"empresa_{empresa_obj.id}",
        company_id=empresa_obj.id,
        country_code=cod_pais
    )

    enviados_count = 0
    fecha_str = target_fecha.strftime("%d/%m/%Y")

    for cita in citas_a_recordar:
        if not cita.paciente or not cita.paciente.telefono:
            continue

        clean_phone = format_clean_whatsapp_number(cita.paciente.telefono, cod_pais)
        if not clean_phone:
            continue

        doc_name = f"{cita.medico.nombres} {cita.medico.apellidos}" if cita.medico else "Especialista"
        serv_text = f"🩺 *Servicio:* {cita.servicio.nombre}\n" if cita.servicio else f"🩺 *Especialidad:* {cita.especialidad.nombre}\n"
        monto_text = f"💳 *Arancel:* ${cita.precio_estimado:.2f}\n" if (cita.precio_estimado and cita.precio_estimado > 0) else ""

        mensaje = (
            f"👋 ¡Hola *{cita.paciente.nombres}*!\n\n"
            f"⏰ Le recordamos que mañana *{fecha_str}* tiene cita programada en *{nombre_clinica}*:\n\n"
            f"{serv_text}"
            f"👨‍⚕️ *Especialista:* Dr(a). {doc_name}\n"
            f"⏰ *Hora:* {cita.hora_inicio}\n"
            f"📍 *Sede:* {cita.sucursal.nombre if cita.sucursal else 'Sede Central'}\n"
            f"{monto_text}\n"
            f"Le sugerimos presentarse 10 minutos antes. Si necesita confirmar o reprogramar su asistencia, por favor responda a este mensaje.\n\n"
            f"¡Le deseamos un excelente día! ✨"
        )

        try:
            send_res = await wa_service.send_message(
                to=clean_phone,
                message=mensaje,
                sync=False,
                simulate_typing=False,
            )
            if send_res.get("success"):
                cita.recordatorio_enviado = True
                cita.recordatorio_enviado_at = datetime.now()
                enviados_count += 1
                db.add(WhatsAppMessage(
                    empresa_id=cita.empresa_id,
                    recipient_phone=clean_phone,
                    recipient_name=f"{cita.paciente.nombres} {cita.paciente.apellidos}",
                    message_content=mensaje,
                    status="sent",
                    sent_at=datetime.now(),
                ))
        except Exception as e:
            logger.warning(f"Error enviando recordatorio a {clean_phone}: {e}")

    await db.commit()

    return {
        "success": True,
        "fecha": str(target_fecha),
        "total_citas": len(citas_a_recordar),
        "enviados": enviados_count,
        "message": f"Se despacharon {enviados_count} recordatorios vía WhatsApp para el {fecha_str}.",
    }


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
            selectinload(CitaMedica.servicio),
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

    # Validar servicio si se proporcionó
    servicio = None
    if payload.servicio_id:
        res_serv = await db.execute(
            select(Servicio).where(Servicio.id == payload.servicio_id, Servicio.empresa_id == empresa_id)
        )
        servicio = res_serv.scalar_one_or_none()

    precio_final = payload.precio_estimado if (payload.precio_estimado is not None and payload.precio_estimado > 0) else (servicio.precio_base if servicio else 0.0)

    # Verificar si hay conflicto de horario para el mismo médico (salvo citas canceladas y sobreturnos)
    if not payload.es_sobreturno:
        # 1. Validar contra bloqueos de agenda activos del médico
        bloqueo_query = select(BloqueoAgenda).where(
            BloqueoAgenda.medico_id == payload.medico_id,
            BloqueoAgenda.fecha == payload.fecha,
            and_(
                BloqueoAgenda.hora_inicio < payload.hora_fin,
                BloqueoAgenda.hora_fin > payload.hora_inicio,
            )
        )
        res_bloq = await db.execute(bloqueo_query)
        bloqueo = res_bloq.scalar_one_or_none()
        if bloqueo:
            raise HTTPException(
                status_code=400,
                detail=f"El médico tiene un bloqueo de agenda en ese horario ({bloqueo.hora_inicio} - {bloqueo.hora_fin}) por motivo: {bloqueo.motivo}"
            )

        # 2. Validar contra citas existentes
        conflicto_query = select(CitaMedica).where(
            CitaMedica.medico_id == payload.medico_id,
            CitaMedica.fecha == payload.fecha,
            CitaMedica.estado != "cancelada",
            and_(
                CitaMedica.hora_inicio < payload.hora_fin,
                CitaMedica.hora_fin > payload.hora_inicio,
            )
        )
        res_conf = await db.execute(conflicto_query)
        citas_traslapadas = res_conf.scalars().all()
        if citas_traslapadas:
            raise HTTPException(
                status_code=400,
                detail=f"El médico ya tiene una cita agendada en ese horario ({citas_traslapadas[0].hora_inicio} - {citas_traslapadas[0].hora_fin}). Elija otro horario o active la opción de Sobreturno si es un caso urgente."
            )

    # Crear la cita
    nueva_cita = CitaMedica(
        empresa_id=empresa_id,
        sucursal_id=payload.sucursal_id,
        medico_id=payload.medico_id,
        especialidad_id=payload.especialidad_id,
        servicio_id=payload.servicio_id,
        paciente_id=payload.paciente_id,
        fecha=payload.fecha,
        hora_inicio=payload.hora_inicio,
        hora_fin=payload.hora_fin,
        duracion_minutos=payload.duracion_minutos,
        motivo=payload.motivo,
        notas=payload.notas,
        precio_estimado=precio_final,
        estado_pago=payload.estado_pago or "pendiente",
        metodo_pago=payload.metodo_pago,
        es_sobreturno=payload.es_sobreturno,
        motivo_sobreturno=payload.motivo_sobreturno,
        estado="programada",
    )
    db.add(nueva_cita)
    await db.flush()

    # Si se solicitó notificar por WhatsApp al paciente
    if payload.notificar_whatsapp and paciente.telefono:
        try:
            res_emp = await db.execute(
                select(Empresa)
                .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
                .where(Empresa.id == empresa_id)
            )
            empresa_obj = res_emp.scalar_one_or_none()
            cod_pais_empresa = get_empresa_codigo_pais(empresa_obj)

            clean_phone = format_clean_whatsapp_number(
                paciente.telefono, cod_pais_empresa
            )
            if clean_phone:
                nombre_clinica = empresa_obj.nombre if empresa_obj else "Centro Médico"

                nombre_doc = f"{medico.nombres} {medico.apellidos}" if medico else "Especialista"
                fecha_str = payload.fecha.strftime("%d/%m/%Y")
                servicio_txt = f"🩺 *Servicio:* {servicio.nombre}\n" if servicio else f"🩺 *Especialidad:* {especialidad.nombre}\n"
                arancel_txt = f"💵 *Arancel:* ${precio_final:.2f}\n" if precio_final > 0 else ""
                sobreturno_txt = "⚡ *Modalidad:* Sobreturno / Urgencia autorizada\n" if payload.es_sobreturno else ""

                mensaje_ws = (
                    f"👋 ¡Hola *{paciente.nombres}*!\n\n"
                    f"Le confirmamos su cita médica en *{nombre_clinica}*:\n\n"
                    f"{servicio_txt}"
                    f"👨‍⚕️ *Especialista:* Dr(a). {nombre_doc}\n"
                    f"📅 *Fecha:* {fecha_str}\n"
                    f"⏰ *Hora:* {payload.hora_inicio}\n"
                    f"📍 *Sede:* {sucursal.nombre}\n"
                    f"{sobreturno_txt}"
                    f"{arancel_txt}"
                    f"💡 *Motivo:* {payload.motivo}\n\n"
                    f"Por favor presentarse 10 minutos antes de su consulta. En caso de requerir reprogramación, puede responder a este mensaje.\n\n"
                    f"¡Cuidamos de su salud! 🩺✨"
                )

                wa_service = WhatsAppService(
                    api_url=empresa_obj.whatsapp_api_url or "https://whatsapp.theizerdev.com",
                    api_key=empresa_obj.whatsapp_api_key,
                    instance_name=empresa_obj.whatsapp_instance or f"empresa_{empresa_obj.id}",
                    company_id=empresa_obj.id,
                    country_code=cod_pais_empresa
                )

                send_res = await wa_service.send_message(
                    to=clean_phone,
                    message=mensaje_ws,
                    sync=False,
                    simulate_typing=False,
                )
                if send_res.get("success"):
                    nueva_cita.whatsapp_notificado = True
                    nueva_cita.whatsapp_notificado_at = datetime.now()
                    db.add(WhatsAppMessage(
                        empresa_id=empresa_id,
                        recipient_phone=clean_phone,
                        recipient_name=f"{paciente.nombres} {paciente.apellidos}",
                        message_content=mensaje_ws,
                        status="sent",
                        sent_at=datetime.now()
                    ))
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

    target_es_sobreturno = payload.es_sobreturno if payload.es_sobreturno is not None else cita.es_sobreturno

    # Si se cambia horario, fecha o médico, validar que no colisione con bloqueos ni otra cita activa (salvo sobreturno)
    if (payload.fecha or payload.hora_inicio or payload.hora_fin or payload.medico_id) and not target_es_sobreturno:
        # Verificar bloqueo
        bloq_query = select(BloqueoAgenda).where(
            BloqueoAgenda.medico_id == target_medico_id,
            BloqueoAgenda.fecha == target_fecha,
            and_(
                BloqueoAgenda.hora_inicio < target_hora_fin,
                BloqueoAgenda.hora_fin > target_hora_inicio,
            )
        )
        res_bloq = await db.execute(bloq_query)
        bloqueo = res_bloq.scalar_one_or_none()
        if bloqueo:
            raise HTTPException(
                status_code=400,
                detail=f"El médico tiene un bloqueo de agenda en ese horario ({bloqueo.hora_inicio} - {bloqueo.hora_fin}): {bloqueo.motivo}"
            )

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

    # Sincronizar estado con la consulta médica si ya existe
    if payload.estado in ["en_consulta", "atendida", "cancelada"]:
        res_con_sync = await db.execute(select(ConsultaMedica).where(ConsultaMedica.cita_id == cita.id))
        con_sync = res_con_sync.scalar_one_or_none()
        if con_sync:
            if payload.estado == "en_consulta":
                con_sync.estado = "en_curso"
            elif payload.estado == "atendida":
                con_sync.estado = "finalizada"
            elif payload.estado == "cancelada":
                con_sync.estado = "anulada"
            con_sync.updated_at = datetime.now()

    # Si el nuevo estado es "sala_espera", se inserta en la tabla de consulta y se genera la preconsulta
    if payload.estado == "sala_espera":
        # 1. Crear o recuperar el registro de preconsulta
        res_pre_exist = await db.execute(
            select(Preconsulta).where(Preconsulta.cita_id == cita.id)
        )
        preconsulta = res_pre_exist.scalar_one_or_none()
        if not preconsulta:
            preconsulta = Preconsulta(
                token=uuid.uuid4().hex,
                empresa_id=cita.empresa_id,
                sucursal_id=cita.sucursal_id,
                cita_id=cita.id,
                paciente_id=cita.paciente_id,
                medico_id=cita.medico_id,
                especialidad_id=cita.especialidad_id,
                respuestas={},
                estado="pendiente",
                whatsapp_enviado=False,
            )
            db.add(preconsulta)
            await db.flush()

        # 2. Verificar si ya existe una consulta médica generada para esta cita
        res_con_exist = await db.execute(
            select(ConsultaMedica).where(ConsultaMedica.cita_id == cita.id)
        )
        con_existente = res_con_exist.scalar_one_or_none()

        if not con_existente:
            fecha_str = datetime.now().strftime("%Y%m%d")
            codigo_consulta = f"CON-{fecha_str}-{cita.id:04d}"

            nueva_consulta = ConsultaMedica(
                codigo=codigo_consulta,
                cita_id=cita.id,
                paciente_id=cita.paciente_id,
                medico_id=cita.medico_id,
                especialidad_id=cita.especialidad_id,
                fecha_consulta=datetime.now(),
                preconsulta_id=preconsulta.id,
                motivo_consulta=cita.motivo or "Consulta médica programada",
                estado="en_espera",
                empresa_id=cita.empresa_id,
                sucursal_id=cita.sucursal_id,
                creado_por=current_user.id,
            )
            db.add(nueva_consulta)
            await db.flush()

        # 3. Despachar mensaje por WhatsApp al paciente con el enlace de preconsulta
        try:
            res_pac = await db.execute(
                select(Paciente).where(Paciente.id == cita.paciente_id)
            )
            paciente = res_pac.scalar_one_or_none()

            if paciente and paciente.telefono:
                res_emp = await db.execute(
                    select(Empresa)
                    .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
                    .where(Empresa.id == cita.empresa_id)
                )
                empresa_obj = res_emp.scalar_one_or_none()
                cod_pais_empresa = get_empresa_codigo_pais(empresa_obj)

                clean_phone = format_clean_whatsapp_number(
                    paciente.telefono, cod_pais_empresa
                )
                if clean_phone and empresa_obj:
                    nombre_clinica = empresa_obj.nombre or "Centro Médico"

                    res_med = await db.execute(select(Medico).where(Medico.id == cita.medico_id))
                    medico = res_med.scalar_one_or_none()
                    nombre_doc = f"{medico.nombres} {medico.apellidos}" if medico else "Especialista"

                    res_esp = await db.execute(select(Especialidad.nombre).where(Especialidad.id == cita.especialidad_id))
                    esp_nombre = res_esp.scalar() or "Consulta Médica"

                    # URL para que el paciente abra la preconsulta desde su móvil
                    preconsulta_url = f"http://localhost:5173/preconsulta/{preconsulta.token}"

                    mensaje_ws = (
                        f"👋 ¡Hola *{paciente.nombres}*!\n\n"
                        f"Le damos la bienvenida a la sala de espera de *{nombre_clinica}*.\n\n"
                        f"🩺 *Especialidad:* {esp_nombre}\n"
                        f"👨‍⚕️ *Especialista:* Dr(a). {nombre_doc}\n\n"
                        f"📋 Para agilizar su atención médica, por favor complete este breve formulario de *Preconsulta* desde su teléfono mientras espera su turno:\n\n"
                        f"👉 {preconsulta_url}\n\n"
                        f"¡Pronto será llamado a su consulta médica! 🩺✨"
                    )

                    wa_service = WhatsAppService(
                        api_url=empresa_obj.whatsapp_api_url or "https://whatsapp.theizerdev.com",
                        api_key=empresa_obj.whatsapp_api_key,
                        instance_name=empresa_obj.whatsapp_instance or f"empresa_{empresa_obj.id}",
                        company_id=empresa_obj.id,
                        country_code=cod_pais_empresa
                    )

                    send_res = await wa_service.send_message(
                        to=clean_phone,
                        message=mensaje_ws,
                        sync=False,
                        simulate_typing=False,
                    )
                    logger.info(f"Resultado envío WhatsApp preconsulta a {clean_phone}: {send_res}")
                    if send_res.get("success"):
                        preconsulta.whatsapp_enviado = True
                        preconsulta.whatsapp_enviado_at = datetime.now()
                        db.add(
                            WhatsAppMessage(
                                empresa_id=cita.empresa_id,
                                recipient_phone=clean_phone,
                                recipient_name=f"{paciente.nombres} {paciente.apellidos}",
                                message_content=mensaje_ws,
                                status="sent",
                                sent_at=datetime.now()
                            )
                        )
                    else:
                        db.add(
                            WhatsAppMessage(
                                empresa_id=cita.empresa_id,
                                recipient_phone=clean_phone,
                                recipient_name=f"{paciente.nombres} {paciente.apellidos}",
                                message_content=mensaje_ws,
                                status="failed",
                                error_message=str(send_res.get("error") or send_res.get("message"))
                            )
                        )
        except Exception as err_ws:
            logger.warning(f"No se pudo despachar WhatsApp de preconsulta en sala de espera: {err_ws}")

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


@router.patch("/{id}/pago", response_model=CitaResponse)
async def cambiar_pago_cita(
    id: int,
    payload: CitaCambiarPago,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("citas.editar")),
):
    """
    Actualizar el estado y método de pago de una cita médica en caja/recepción.
    """
    valid_pagos = {"pendiente", "pagado", "aseguradora", "exonerado"}
    if payload.estado_pago not in valid_pagos:
        raise HTTPException(
            status_code=400,
            detail=f"Estado de pago inválido. Opciones: {', '.join(valid_pagos)}"
        )
    query = select(CitaMedica).where(CitaMedica.id == id)
    if not current_user.es_superadmin:
        query = query.where(CitaMedica.empresa_id == current_user.empresa_id)

    result = await db.execute(query)
    cita = result.scalar_one_or_none()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita médica no encontrada")

    cita.estado_pago = payload.estado_pago
    if payload.metodo_pago is not None:
        cita.metodo_pago = payload.metodo_pago
    cita.updated_at = datetime.now()

    db.add(
        AuditoriaLog(
            empresa_id=cita.empresa_id,
            usuario_id=current_user.id,
            accion="ACTUALIZAR_PAGO",
            modulo="citas",
            detalles={"cita_id": id, "estado_pago": payload.estado_pago, "metodo_pago": payload.metodo_pago},
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

    cod_pais_empresa = get_empresa_codigo_pais(cita.empresa)
    clean_phone = format_clean_whatsapp_number(
        paciente.telefono, cod_pais_empresa
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

    wa_service = WhatsAppService(
        api_url=cita.empresa.whatsapp_api_url or "https://whatsapp.theizerdev.com" if cita.empresa else "https://whatsapp.theizerdev.com",
        api_key=cita.empresa.whatsapp_api_key if cita.empresa else None,
        instance_name=cita.empresa.whatsapp_instance or f"empresa_{cita.empresa_id}" if cita.empresa else f"empresa_{cita.empresa_id}",
        company_id=cita.empresa_id,
        country_code=cod_pais_empresa
    )

    send_res = await wa_service.send_message(
        to=clean_phone,
        message=mensaje,
        sync=False,
        simulate_typing=False,
    )

    success = send_res.get("success", False)
    if success:
        cita.whatsapp_notificado = True
        cita.whatsapp_notificado_at = datetime.now()
        db.add(
            WhatsAppMessage(
                empresa_id=cita.empresa_id,
                recipient_phone=clean_phone,
                recipient_name=f"{paciente.nombres} {paciente.apellidos}",
                message_content=mensaje,
                status="sent",
                sent_at=datetime.now()
            )
        )
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
