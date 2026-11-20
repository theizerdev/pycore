"""
Servicio de Captura Automática de Estudios Médicos entrantes por WhatsApp.
Cuando un paciente envía un PDF o imagen al WhatsApp conectado de la sucursal:
1. Valida archivo (PDF / JPG / PNG / WEBP <= 15 MB) y evita duplicados.
2. Intenta emparejar automáticamente con:
   - Una consulta con "Escucha Activa" en el Paso 4, o
   - Un paciente registrado cuyo teléfono coincida (últimos 10 dígitos) y tenga consulta activa/hoy.
3. Si coincide: analiza con el Bot Clínico Híbrido (Gemini Vision o extractor PDF Python),
   inserta directamente en `estudios_adjuntos`, notifica en tiempo real al médico vía WebSocket
   y responde al paciente confirmando la recepción.
4. Si el número no coincide (ej. enviado desde el celular de un familiar): guarda en la
   bandeja entrante `whatsapp_estudios_pendientes` y alerta en tiempo real al médico en el Paso 4
   para asignar y analizar con 1 clic.
"""
from __future__ import annotations

import base64
import logging
import os
import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy import desc
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.consulta import ConsultaMedica
from app.models.estudio import EstudioAdjunto, WhatsAppEstudioPendiente
from app.models.integracion import WhatsAppMessage
from app.models.paciente import Paciente
from app.models.sucursal import Sucursal
from app.services.clinical_agent import (
    PatientContext,
    clinical_agent,
    detect_category_from_metadata,
)
from app.services.estudios_ws_manager import estudios_ws_manager
from app.services.whatsapp_python_engine import (
    format_phone_number,
    sanitize_instance_name,
    whatsapp_engine,
)

logger = logging.getLogger("whatsapp_inbound_studies")
logger.setLevel(logging.INFO)

ALLOWED_STUDY_MIMES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

MAX_INBOUND_STUDY_BYTES = 15 * 1024 * 1024  # 15 MB


def _clean_digits(phone: str) -> str:
    return re.sub(r"[^0-9]", "", str(phone or ""))


def _build_study_title(caption: str, filename: str, categoria: str) -> str:
    cap = (caption or "").strip()
    if cap and len(cap) >= 3:
        return cap[:180]
    base = os.path.splitext(filename or "")[0]
    base = re.sub(r"[-_]+", " ", base).strip()
    # Ignorar nombres genéricos de cámara/WhatsApp como IMG-20261120-WA0001
    if base and not re.match(r"^(img|vid|doc|wa|whatsapp|photo|image|scan|document)[\s0-9a-zA-Z]{0,6}$", base, re.I):
        if not re.match(r"^(img|ptt|aud|doc)\s*\d{6,}", base, re.I):
            return base[:180].capitalize()
    label_map = {
        "laboratorio": "Resultado de Laboratorio (WhatsApp)",
        "imagenologia": "Estudio de Imagenología (WhatsApp)",
        "informe": "Informe Médico Adjunto (WhatsApp)",
    }
    return label_map.get(categoria, "Estudio Médico Recibido (WhatsApp)")


async def _find_paciente_by_phone(
    db, empresa_id: int, sender_digits: str
) -> Optional[Paciente]:
    tail = sender_digits[-10:] if len(sender_digits) >= 10 else sender_digits
    if not tail or len(tail) < 7:
        return None
    stmt = (
        select(Paciente)
        .where(
            Paciente.empresa_id == empresa_id,
            Paciente.activo == True,
            Paciente.telefono.isnot(None),
        )
        .order_by(Paciente.id.desc())
    )
    pacientes = (await db.execute(stmt)).scalars().all()
    for p in pacientes:
        p_digits = _clean_digits(p.telefono or "")
        p_tail = p_digits[-10:] if len(p_digits) >= 10 else p_digits
        if p_tail and p_tail == tail:
            return p
    return None


async def _find_active_consulta_for_paciente(
    db, empresa_id: int, paciente_id: int
) -> Optional[ConsultaMedica]:
    # 1. Prioridad: consulta 'en_curso' o 'en_espera'
    stmt_active = (
        select(ConsultaMedica)
        .options(selectinload(ConsultaMedica.medico), selectinload(ConsultaMedica.paciente))
        .where(
            ConsultaMedica.empresa_id == empresa_id,
            ConsultaMedica.paciente_id == paciente_id,
            ConsultaMedica.estado.in_(["en_curso", "en_espera"]),
        )
        .order_by(desc(ConsultaMedica.id))
        .limit(1)
    )
    consulta = (await db.execute(stmt_active)).scalar_one_or_none()
    if consulta:
        return consulta

    # 2. Alternativa: consulta creada hoy (últimas 18 horas) aunque esté recién guardada
    cutoff = datetime.now() - timedelta(hours=18)
    stmt_today = (
        select(ConsultaMedica)
        .options(selectinload(ConsultaMedica.medico), selectinload(ConsultaMedica.paciente))
        .where(
            ConsultaMedica.empresa_id == empresa_id,
            ConsultaMedica.paciente_id == paciente_id,
            ConsultaMedica.created_at >= cutoff,
            ConsultaMedica.estado != "anulada",
        )
        .order_by(desc(ConsultaMedica.id))
        .limit(1)
    )
    return (await db.execute(stmt_today)).scalar_one_or_none()


async def handle_inbound_whatsapp_media(
    instance_name: str,
    sender_phone: str,
    push_name: str,
    message_id: str,
    file_bytes: bytes,
    mime_type: str,
    file_name: str,
    caption: str = "",
) -> None:
    """Procesa un PDF o imagen médica entrante por WhatsApp en tiempo real."""
    clean_mime = (mime_type or "").split(";")[0].strip().lower()
    if clean_mime not in ALLOWED_STUDY_MIMES:
        return
    if not file_bytes or len(file_bytes) > MAX_INBOUND_STUDY_BYTES:
        logger.warning(f"[WA INBOUND] Archivo descartado por tamaño ({len(file_bytes or b'')} bytes).")
        return

    safe_inst = sanitize_instance_name(instance_name)
    sender_digits = _clean_digits(sender_phone)
    if not sender_digits:
        return

    ext = ALLOWED_STUDY_MIMES[clean_mime]
    safe_filename = (file_name or f"estudio_whatsapp_{datetime.now().strftime('%H%M%S')}{ext}").strip()
    if not os.path.splitext(safe_filename)[1]:
        safe_filename += ext

    data_uri = f"data:{clean_mime};base64,{base64.b64encode(file_bytes).decode('ascii')}"
    remitente_label = f"+{sender_digits}" + (f" ({push_name})" if push_name else "")

    async with AsyncSessionLocal() as db:
        # 1. Identificar Sucursal dueña de la instancia
        sucursal = (
            await db.execute(select(Sucursal).where(Sucursal.whatsapp_instance == safe_inst))
        ).scalar_one_or_none()
        if not sucursal:
            # Fallback por patrón sucursal_{emp}_{suc}
            m_pat = re.match(r"^sucursal_(\d+)_(\d+)$", safe_inst)
            if m_pat:
                sucursal = (
                    await db.execute(select(Sucursal).where(Sucursal.id == int(m_pat.group(2))))
                ).scalar_one_or_none()
        if not sucursal:
            logger.debug(f"[WA INBOUND] No se encontró sucursal para instancia {safe_inst}.")
            return

        empresa_id = sucursal.empresa_id
        sucursal_id = sucursal.id

        # 2. Evitar reprocesar el mismo mensaje WhatsApp
        if message_id:
            dup_msg = (
                await db.execute(
                    select(WhatsAppMessage.id).where(
                        WhatsAppMessage.external_message_id == message_id,
                        WhatsAppMessage.direction == "inbound",
                    )
                )
            ).scalar_one_or_none()
            if dup_msg:
                return

        # Registrar entrada en bitácora WhatsApp
        db.add(
            WhatsAppMessage(
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                instance_name=safe_inst,
                external_message_id=message_id or None,
                recipient_phone=sender_digits,
                recipient_name=push_name or f"+{sender_digits}",
                message_content=f"[Archivo recibido: {safe_filename}] {caption}".strip(),
                status="delivered",
                direction="inbound",
                delivered_at=datetime.now(),
            )
        )

        # 3. Resolver consulta destino:
        #    Prioridad A: Ventana de escucha activa en Paso 4 coincidente por teléfono
        #    Prioridad B: Paciente registrado por teléfono con consulta activa/hoy
        target_consulta: Optional[ConsultaMedica] = None
        active_win = estudios_ws_manager.find_matching_window(empresa_id, sucursal_id, sender_digits)
        if active_win:
            target_consulta = (
                await db.execute(
                    select(ConsultaMedica)
                    .options(selectinload(ConsultaMedica.medico), selectinload(ConsultaMedica.paciente))
                    .where(ConsultaMedica.id == active_win.consulta_id)
                )
            ).scalar_one_or_none()

        if not target_consulta:
            paciente = await _find_paciente_by_phone(db, empresa_id, sender_digits)
            if paciente:
                target_consulta = await _find_active_consulta_for_paciente(db, empresa_id, paciente.id)

        # 4A. COINCIDENCIA AUTOMÁTICA -> Analizar con MediCore AI Local, insertar en Paso 4 y notificar por WebSocket
        if target_consulta:
            categoria_auto = detect_category_from_metadata(
                filename=safe_filename,
                mime_type=clean_mime,
                caption=caption,
            )
            titulo_auto = _build_study_title(caption, safe_filename, categoria_auto)
            pac_obj = target_consulta.paciente
            patient_ctx = PatientContext(
                edad=getattr(pac_obj, "edad", None) if pac_obj else None,
                genero=getattr(pac_obj, "genero", None) if pac_obj else None,
                antecedentes=getattr(pac_obj, "antecedentes_patologicos", None) if pac_obj else None,
                medicacion=getattr(pac_obj, "medicacion_habitual", None) if pac_obj else None,
                alergias=getattr(pac_obj, "alergias", None) if pac_obj else None,
                motivo_consulta=getattr(target_consulta, "motivo_consulta", None),
            )

            bot_res = await clinical_agent.analyze_study(
                file_bytes=file_bytes,
                mime_type=clean_mime,
                titulo=titulo_auto,
                categoria=categoria_auto,
                caption=caption,
                patient_ctx=patient_ctx,
            )

            titulo_final = bot_res.get("titulo_sugerido") or titulo_auto
            categoria_final = bot_res.get("categoria") or categoria_auto
            analisis_agente = bot_res.get("analisis_agente") or {}

            nuevo_estudio = EstudioAdjunto(
                empresa_id=empresa_id,
                paciente_id=target_consulta.paciente_id,
                consulta_id=target_consulta.id,
                medico_id=target_consulta.medico_id,
                sucursal_id=sucursal_id,
                titulo=titulo_final[:200],
                categoria=categoria_final,
                subtipo="whatsapp_directo",
                archivo_url=data_uri,
                archivo_nombre=safe_filename[:255],
                archivo_tipo=clean_mime,
                archivo_tamano=len(file_bytes),
                fecha_estudio=date.today(),
                notas=(
                    f"Recibido automáticamente por WhatsApp de {remitente_label}."
                    + (f" Nota: {caption}" if caption else "")
                ),
                estado_analisis=bot_res.get("estado_analisis", "pendiente"),
                valores_laboratorio=bot_res.get("valores_laboratorio"),
                datos_imagenologia=bot_res.get("datos_imagenologia"),
                interpretacion_clinica=bot_res.get("interpretacion_clinica"),
                alertas_detectadas=bot_res.get("alertas_detectadas") or [],
                analisis_agente=analisis_agente,
                origen="whatsapp",
                whatsapp_remitente=remitente_label[:120],
            )
            db.add(nuevo_estudio)
            await db.commit()
            await db.refresh(nuevo_estudio)

            logger.info(
                f"📲 [WA INBOUND] Estudio #{nuevo_estudio.id} ('{nuevo_estudio.titulo}') insertado en Consulta #{target_consulta.id} desde +{sender_digits} [motor={bot_res.get('engine_used')}]."
            )

            # Notificar en tiempo real al médico en la pantalla de consulta
            await estudios_ws_manager.notify_consulta(
                consulta_id=target_consulta.id,
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                payload={
                    "event": "whatsapp_estudio_recibido",
                    "consulta_id": target_consulta.id,
                    "paciente_id": target_consulta.paciente_id,
                    "estudio": {
                        "id": nuevo_estudio.id,
                        "titulo": nuevo_estudio.titulo,
                        "categoria": nuevo_estudio.categoria,
                        "archivo_nombre": nuevo_estudio.archivo_nombre,
                        "archivo_tipo": nuevo_estudio.archivo_tipo,
                        "estado_analisis": nuevo_estudio.estado_analisis,
                        "alertas_detectadas": nuevo_estudio.alertas_detectadas or [],
                        "critical_alerts": analisis_agente.get("critical_alerts") or [],
                        "cie10_sugeridos": analisis_agente.get("cie10_sugeridos") or [],
                        "origen": "whatsapp",
                        "whatsapp_remitente": remitente_label,
                        "engine_used": bot_res.get("engine_used", "medicore-local"),
                        "created_at": datetime.now().isoformat(),
                    },
                },
            )

            # Confirmar recepción al paciente por WhatsApp (con simulación "escribiendo...")
            try:
                med_nombre = (
                    f"Dr(a). {target_consulta.medico.nombres} {target_consulta.medico.apellidos}".strip()
                    if target_consulta.medico
                    else "su médico tratante"
                )
                pac_nombre = (
                    target_consulta.paciente.nombres
                    if target_consulta.paciente
                    else (push_name or "")
                )
                confirm_msg = (
                    f"{{Hola|¡Perfecto!}} {pac_nombre}, recibimos tu archivo *{nuevo_estudio.titulo}* "
                    f"y ya fue cargado automáticamente en tu consulta con *{med_nombre}* para su revisión. ✅"
                ).strip()
                await whatsapp_engine.send_text_humanized(
                    instance_name=safe_inst,
                    to=sender_digits,
                    message=confirm_msg,
                    simulate_typing=True,
                    typing_min_sec=1.5,
                    typing_max_sec=3.0,
                    verify_number=False,
                    anti_fingerprint=True,
                    enforce_cooldown=False,
                )
            except Exception as reply_err:
                logger.debug(f"[WA INBOUND] No se pudo enviar acuse de recibo: {reply_err}")
            return

        # 4B. SIN COINCIDENCIA EXACTA (ej. celular de un familiar) -> Bandeja Entrante en Paso 4
        categoria_sug = detect_category_from_metadata(
            filename=safe_filename,
            mime_type=clean_mime,
            caption=caption,
        )
        pendiente = WhatsAppEstudioPendiente(
            empresa_id=empresa_id,
            sucursal_id=sucursal_id,
            instance_name=safe_inst,
            remitente_telefono=sender_digits,
            remitente_nombre=push_name or None,
            caption=caption or None,
            archivo_url=data_uri,
            archivo_nombre=safe_filename[:255],
            archivo_tipo=clean_mime,
            archivo_tamano=len(file_bytes),
            categoria_sugerida=categoria_sug,
            estado="pendiente",
            whatsapp_message_id=message_id or None,
        )
        db.add(pendiente)
        await db.commit()
        await db.refresh(pendiente)

        logger.info(
            f"📥 [WA INBOUND] Archivo '{safe_filename}' de +{sender_digits} guardado en bandeja entrante (#{pendiente.id}) para asignación en Paso 4."
        )

        await estudios_ws_manager.notify_branch(
            empresa_id=empresa_id,
            sucursal_id=sucursal_id,
            payload={
                "event": "whatsapp_estudio_pendiente",
                "pendiente": {
                    "id": pendiente.id,
                    "remitente_telefono": pendiente.remitente_telefono,
                    "remitente_nombre": pendiente.remitente_nombre,
                    "caption": pendiente.caption,
                    "archivo_nombre": pendiente.archivo_nombre,
                    "archivo_tipo": pendiente.archivo_tipo,
                    "archivo_tamano": pendiente.archivo_tamano,
                    "categoria_sugerida": pendiente.categoria_sugerida,
                    "created_at": pendiente.created_at.isoformat() if pendiente.created_at else datetime.now().isoformat(),
                },
            },
        )
