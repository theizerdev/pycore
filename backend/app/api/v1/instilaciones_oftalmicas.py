import logging
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.usuario import Usuario
from app.models.medico import Medico
from app.models.sucursal import Sucursal
from app.models.instilacion_oftalmica import InstilacionOftalmica
from app.schemas.instilacion_oftalmica import (
    InstilacionOftalmicaCreate,
    InstilacionGotaAdd,
    InstilacionEstadoUpdate,
    InstilacionOftalmicaResponse,
)
from app.schemas.chat import ChatMensajeCreate
from app.services.chat_service import ChatService
from app.services.chat_ws_manager import chat_ws_manager
from app.services.whatsapp_resolver import resolve_whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/instilaciones-oftalmicas", tags=["Instilaciones Oftálmicas"])


async def _notify_doctor_and_branch(
    instilacion: InstilacionOftalmica,
    drop_num: int,
    drop_type: str,
    db: AsyncSession,
    current_user: Usuario,
):
    """
    Envía las alertas automáticas cuando se registra una instilación:
    1. Chat interno: Mensaje directo al médico oftalmólogo (o canal general de la sede).
    2. WebSocket: Notificación en tiempo real a la sucursal para disparar el bip y actualizar la UI.
    3. WhatsApp: Mensaje al teléfono celular del médico.
    """
    empresa_id = instilacion.empresa_id
    sucursal_id = instilacion.sucursal_id
    now_str = datetime.now().strftime("%I:%M:%S %p")
    quien = instilacion.quien_instilo or f"{current_user.nombre} {current_user.apellido}"

    # Cargar datos del médico si está asignado
    medico: Optional[Medico] = None
    if instilacion.medico_id:
        stmt_m = (
            select(Medico)
            .options(selectinload(Medico.usuario))
            .where(Medico.id == instilacion.medico_id)
        )
        medico = (await db.execute(stmt_m)).scalar_one_or_none()

    # 1. NOTIFICACIÓN POR CHAT INTERNO CLÍNICO
    try:
        chat_text = (
            f"👁️ [INSTILACIÓN OFTALMOLÓGICA]\n"
            f"• Paciente: {instilacion.paciente_nombre}\n"
            f"• Gota: #{drop_num} ({drop_type})\n"
            f"• Fármaco: {instilacion.farmaco} ({instilacion.ojo})\n"
            f"• Hora: {now_str}\n"
            f"• Aplicado por: {quien}\n"
            f"• Estado: En proceso de dilatación (~{instilacion.tiempo_recomendado_min} min en espera)"
        )

        canal_id = None
        if medico and medico.usuario_id and medico.usuario_id != current_user.id:
            canal = await ChatService.get_or_create_direct_channel(
                db=db,
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                user_a_id=current_user.id,
                user_b_id=medico.usuario_id,
            )
            canal_id = canal.id
        else:
            canal_gen = await ChatService.ensure_general_branch_channel(
                db=db,
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                current_user_id=current_user.id,
            )
            canal_id = canal_gen.id

        if canal_id:
            msg_resp, participant_ids = await ChatService.save_message(
                db=db,
                canal_id=canal_id,
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                remitente=current_user,
                payload=ChatMensajeCreate(texto=chat_text, tipo="texto"),
            )
            await chat_ws_manager.broadcast_to_participants(
                participant_ids,
                {
                    "event": "nuevo_mensaje",
                    "canal_id": canal_id,
                    "sucursal_id": sucursal_id,
                    "mensaje": msg_resp.model_dump(mode="json"),
                },
            )
            instilacion.notificado_chat = True
            instilacion.ultimo_mensaje_chat_id = msg_resp.id
    except Exception as e:
        logger.warning(f"Aviso al enviar notificación de chat de instilación: {e}")

    # 2. DIFUSIÓN POR WEBSOCKET A LA SUCURSAL (Dispara el BIP sonoro y actualiza lista)
    try:
        await chat_ws_manager.broadcast_to_sucursal(
            sucursal_id=sucursal_id,
            message={
                "event": "instilacion_oftalmica_actualizada",
                "tipo_evento": "gota_aplicada",
                "instilacion_id": instilacion.id,
                "paciente_nombre": instilacion.paciente_nombre,
                "numero_gota": drop_num,
                "tipo_gota": drop_type,
                "farmaco": instilacion.farmaco,
                "ojo": instilacion.ojo,
                "medico_id": instilacion.medico_id,
                "medico_usuario_id": medico.usuario_id if medico else None,
                "quien_instilo": quien,
                "hora": now_str,
                "timestamp": int(datetime.now().timestamp() * 1000),
            },
        )
    except Exception as e:
        logger.warning(f"Aviso al difundir WS de instilación: {e}")

    # 3. NOTIFICACIÓN POR WHATSAPP AL MÉDICO
    try:
        med_phone = None
        if medico:
            med_phone = medico.telefono or (medico.usuario.telefono if medico.usuario else None)

        if med_phone:
            wa_service, _, _, is_connected = await resolve_whatsapp_service(
                db=db, empresa_id=empresa_id, sucursal_id=sucursal_id
            )
            if wa_service and is_connected:
                wa_msg = (
                    f"👁️ *MediSoft - Control de Dilatación Oftálmica* 🩺\n\n"
                    f"Estimado(a) Dr(a). *{medico.nombres} {medico.apellidos}*:\n"
                    f"Se acaba de registrar la aplicación de gotas oftálmicas a su paciente:\n\n"
                    f"👤 *Paciente:* {instilacion.paciente_nombre}\n"
                    f"💧 *Gota:* #{drop_num} ({drop_type})\n"
                    f"🧪 *Fármaco:* {instilacion.farmaco} ({instilacion.ojo})\n"
                    f"⏰ *Hora:* {now_str}\n"
                    f"👩‍⚕️ *Instilado por:* {quien}\n"
                    f"⏳ *Tiempo recomendado:* ~{instilacion.tiempo_recomendado_min} min\n\n"
                    f"_El paciente se encuentra en sala de espera en proceso de midriasis._"
                )
                res_wa = await wa_service.send_message(to=med_phone, message=wa_msg)
                if res_wa and res_wa.get("success"):
                    instilacion.notificado_whatsapp = True
    except Exception as e:
        logger.warning(f"Aviso al enviar WhatsApp de instilación al médico: {e}")


@router.get("", response_model=List[InstilacionOftalmicaResponse])
async def list_instilaciones(
    sucursal_id: int = Query(...),
    solo_activas: bool = Query(True),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Lista las instilaciones oftálmicas filtradas estrictamente por sucursal.
    Evita la mezcla de pacientes entre diferentes sedes clínicas.
    """
    empresa_id = current_user.empresa_id or 1

    query = select(InstilacionOftalmica).where(
        InstilacionOftalmica.empresa_id == empresa_id,
        InstilacionOftalmica.sucursal_id == sucursal_id,
    )

    if solo_activas:
        # Estados activos o del día
        query = query.where(
            InstilacionOftalmica.estado.in_(["en_espera", "dilatado_listo", "en_consulta"])
        )

    query = query.order_by(InstilacionOftalmica.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=InstilacionOftalmicaResponse)
async def create_instilacion(
    req: InstilacionOftalmicaCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registra la primera gota de instilación para dilatación oftálmica.
    Dispara notificación por chat interno, sonido bip vía WebSocket y mensaje de WhatsApp al médico.
    """
    empresa_id = current_user.empresa_id or 1
    now = datetime.now()
    now_hora = now.strftime("%I:%M:%S %p")
    now_ms = int(now.timestamp() * 1000)

    quien = req.quien_instilo or f"{current_user.nombre} {current_user.apellido}"

    # Si se proporcionó medico_id pero no medico_nombre, buscarlo
    medico_nombre = req.medico_nombre
    if req.medico_id and not medico_nombre:
        stmt_m = select(Medico).where(Medico.id == req.medico_id)
        m = (await db.execute(stmt_m)).scalar_one_or_none()
        if m:
            medico_nombre = f"Dr(a). {m.nombres} {m.apellidos}"

    primera_gota = {
        "numero": 1,
        "tipo_gota": "1ra Gota",
        "hora": now_hora,
        "timestamp": now_ms,
        "quien_instilo": quien,
        "observaciones": req.observaciones or "",
    }

    instilacion = InstilacionOftalmica(
        empresa_id=empresa_id,
        sucursal_id=req.sucursal_id,
        paciente_id=req.paciente_id,
        paciente_nombre=req.paciente_nombre.strip(),
        paciente_documento=req.paciente_documento,
        paciente_edad=req.paciente_edad,
        alergias=req.alergias,
        medico_id=req.medico_id,
        medico_nombre=medico_nombre,
        cita_id=req.cita_id,
        consulta_id=req.consulta_id,
        tipo=req.tipo,
        farmaco=req.farmaco,
        ojo=req.ojo,
        es_pediatrico=req.es_pediatrico,
        quien_instilo=quien,
        usuario_id_instilo=current_user.id,
        estado="en_espera",
        total_gotas=1,
        hora_primera_gota=now_hora,
        hora_ultima_gota=now_hora,
        gotas=[primera_gota],
        observaciones=req.observaciones,
        tiempo_recomendado_min=req.tiempo_recomendado_min or 25,
        notificado_chat=False,
        notificado_whatsapp=False,
    )

    db.add(instilacion)
    await db.flush()

    # Enviar notificaciones (Chat, WebSocket con bip, WhatsApp)
    await _notify_doctor_and_branch(
        instilacion=instilacion,
        drop_num=1,
        drop_type="1ra Gota",
        db=db,
        current_user=current_user,
    )

    await db.commit()
    await db.refresh(instilacion)
    return instilacion


@router.post("/{instilacion_id}/gota", response_model=InstilacionOftalmicaResponse)
async def add_gota_instilacion(
    instilacion_id: int,
    req: InstilacionGotaAdd,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registra una gota adicional: 2da gota, 3ra gota o gota de refuerzo.
    Actualiza el cronómetro y vuelve a alertar al médico por chat y WhatsApp.
    """
    empresa_id = current_user.empresa_id or 1
    stmt = select(InstilacionOftalmica).where(
        InstilacionOftalmica.id == instilacion_id,
        InstilacionOftalmica.empresa_id == empresa_id,
    )
    instilacion = (await db.execute(stmt)).scalar_one_or_none()

    if not instilacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de instilación no encontrado.",
        )

    now = datetime.now()
    now_hora = now.strftime("%I:%M:%S %p")
    now_ms = int(now.timestamp() * 1000)

    quien = req.quien_instilo or f"{current_user.nombre} {current_user.apellido}"
    nuevo_num = (instilacion.total_gotas or 1) + 1

    tipo_nombre = req.tipo_gota
    if not tipo_nombre or tipo_nombre == "siguiente":
        if nuevo_num == 2:
            tipo_nombre = "2da Gota"
        elif nuevo_num == 3:
            tipo_nombre = "3ra Gota"
        else:
            tipo_nombre = "Gota Refuerzo"

    nueva_gota = {
        "numero": nuevo_num,
        "tipo_gota": tipo_nombre,
        "hora": now_hora,
        "timestamp": now_ms,
        "quien_instilo": quien,
        "observaciones": req.observaciones or "",
    }

    current_gotas = list(instilacion.gotas or [])
    current_gotas.append(nueva_gota)

    instilacion.gotas = current_gotas
    instilacion.total_gotas = nuevo_num
    instilacion.hora_ultima_gota = now_hora
    instilacion.quien_instilo = quien
    if req.observaciones:
        instilacion.observaciones = (
            f"{instilacion.observaciones}\n[{tipo_nombre}]: {req.observaciones}".strip()
            if instilacion.observaciones
            else req.observaciones
        )

    await db.flush()

    # Enviar notificaciones
    await _notify_doctor_and_branch(
        instilacion=instilacion,
        drop_num=nuevo_num,
        drop_type=tipo_nombre,
        db=db,
        current_user=current_user,
    )

    await db.commit()
    await db.refresh(instilacion)
    return instilacion


@router.patch("/{instilacion_id}/estado", response_model=InstilacionOftalmicaResponse)
async def update_estado_instilacion(
    instilacion_id: int,
    req: InstilacionEstadoUpdate,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cambia el estado clínico de la instilación:
    - 'dilatado_listo': Paciente listo para pasar a consultorio oftalmológico.
    - 'en_consulta': Actualmente en atención.
    - 'finalizado': Dilatación y evaluación completadas.
    - 'cancelado': Proceso cancelado.
    """
    empresa_id = current_user.empresa_id or 1
    stmt = select(InstilacionOftalmica).where(
        InstilacionOftalmica.id == instilacion_id,
        InstilacionOftalmica.empresa_id == empresa_id,
    )
    instilacion = (await db.execute(stmt)).scalar_one_or_none()

    if not instilacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro de instilación no encontrado.",
        )

    instilacion.estado = req.estado
    await db.commit()
    await db.refresh(instilacion)

    # Notificar a la sede vía WebSocket
    try:
        await chat_ws_manager.broadcast_to_sucursal(
            sucursal_id=instilacion.sucursal_id,
            message={
                "event": "instilacion_oftalmica_actualizada",
                "tipo_evento": "estado_cambiado",
                "instilacion_id": instilacion.id,
                "estado": instilacion.estado,
                "paciente_nombre": instilacion.paciente_nombre,
                "timestamp": int(datetime.now().timestamp() * 1000),
            },
        )
    except Exception:
        pass

    return instilacion


@router.delete("/{instilacion_id}")
async def delete_instilacion(
    instilacion_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Elimina o descarta un registro de instilación."""
    empresa_id = current_user.empresa_id or 1
    stmt = select(InstilacionOftalmica).where(
        InstilacionOftalmica.id == instilacion_id,
        InstilacionOftalmica.empresa_id == empresa_id,
    )
    instilacion = (await db.execute(stmt)).scalar_one_or_none()

    if not instilacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registro no encontrado.",
        )

    sucursal_id = instilacion.sucursal_id
    await db.delete(instilacion)
    await db.commit()

    try:
        await chat_ws_manager.broadcast_to_sucursal(
            sucursal_id=sucursal_id,
            message={
                "event": "instilacion_oftalmica_actualizada",
                "tipo_evento": "eliminado",
                "instilacion_id": instilacion_id,
            },
        )
    except Exception:
        pass

    return {"success": True, "message": "Instilación eliminada correctamente."}
