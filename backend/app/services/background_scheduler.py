import asyncio
import logging
from datetime import datetime, timedelta, date
from typing import Optional, Dict, Any
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.empresa import Empresa
from app.models.cita import CitaMedica
from app.models.integracion import WhatsAppMessage
from app.services.subscription_reminders import check_and_send_subscription_reminders
from app.services.whatsapp_service import WhatsAppService
from app.api.v1.medicos import format_clean_whatsapp_number
from app.api.v1.citas import get_empresa_codigo_pais

logger = logging.getLogger("background_scheduler")
logger.setLevel(logging.INFO)

# Referencia a la tarea asíncrona global del scheduler
_scheduler_task: Optional[asyncio.Task] = None
_scheduler_running: bool = False


async def send_daily_appointment_reminders() -> Dict[str, Any]:
    """
    Busca todas las citas del día siguiente en estado 'programada' o 'confirmada'
    cuyo recordatorio no haya sido despachado, y envía el mensaje por WhatsApp.
    """
    logger.info("📅 [SCHEDULER] Iniciando envío de recordatorios de citas para mañana...")
    tomorrow = datetime.now().date() + timedelta(days=1)
    fecha_fmt = tomorrow.strftime("%d/%m/%Y")
    
    total_enviados = 0
    total_fallidos = 0
    total_encontrados = 0

    async with AsyncSessionLocal() as db:
        # Consultar citas con relaciones necesarias cargadas
        stmt = (
            select(CitaMedica)
            .options(
                selectinload(CitaMedica.paciente),
                selectinload(CitaMedica.medico),
                selectinload(CitaMedica.sucursal),
                selectinload(CitaMedica.especialidad),
                selectinload(CitaMedica.servicio),
                selectinload(CitaMedica.empresa).selectinload(Empresa.pais_telefono),
                selectinload(CitaMedica.empresa).selectinload(Empresa.pais)
            )
            .where(
                CitaMedica.fecha == tomorrow,
                CitaMedica.estado.in_(["programada", "confirmada"]),
                CitaMedica.recordatorio_enviado == False
            )
        )
        res = await db.execute(stmt)
        citas = res.scalars().all()
        total_encontrados = len(citas)

        for cita in citas:
            if not cita.paciente or not cita.paciente.telefono:
                continue

            empresa_obj = cita.empresa
            cod_pais = get_empresa_codigo_pais(empresa_obj)
            clean_phone = format_clean_whatsapp_number(cita.paciente.telefono, default_country_code=cod_pais)
            
            if not clean_phone:
                continue

            nombre_clinica = empresa_obj.nombre if empresa_obj else "Centro Médico"
            doc_name = f"{cita.medico.nombres} {cita.medico.apellidos}" if cita.medico else "Especialista"
            serv_text = f"🩺 *Servicio:* {cita.servicio.nombre}\n" if cita.servicio else (
                f"🩺 *Especialidad:* {cita.especialidad.nombre}\n" if cita.especialidad else ""
            )
            monto_text = f"💳 *Arancel:* ${cita.precio_estimado:.2f}\n" if (cita.precio_estimado and cita.precio_estimado > 0) else ""

            mensaje = (
                f"👋 ¡Hola *{cita.paciente.nombres}*!\n\n"
                f"⏰ Le recordamos que mañana *{fecha_fmt}* tiene cita programada en *{nombre_clinica}*:\n\n"
                f"{serv_text}"
                f"👨‍⚕️ *Especialista:* Dr(a). {doc_name}\n"
                f"⏰ *Hora:* {cita.hora_inicio}\n"
                f"📍 *Sede:* {cita.sucursal.nombre if cita.sucursal else 'Sede Principal'}\n"
                f"{monto_text}\n"
                f"Le sugerimos presentarse 10 minutos antes. Si necesita confirmar o reprogramar su asistencia, por favor responda a este mensaje.\n\n"
                f"¡Le deseamos un excelente día! ✨"
            )

            # Instanciar WhatsAppService
            wa_service = WhatsAppService(
                api_url=empresa_obj.whatsapp_api_url or "https://whatsapp.theizerdev.com" if empresa_obj else "https://whatsapp.theizerdev.com",
                api_key=empresa_obj.whatsapp_api_key if empresa_obj else None,
                instance_name=empresa_obj.whatsapp_instance or f"empresa_{cita.empresa_id}" if empresa_obj else "default",
                company_id=cita.empresa_id,
                country_code=cod_pais
            )

            try:
                send_res = await wa_service.send_message(
                    to=clean_phone,
                    message=mensaje,
                    sync=False,
                    simulate_typing=False,
                )
                
                cita.recordatorio_enviado = True
                cita.recordatorio_enviado_at = datetime.now()
                total_enviados += 1

                db.add(WhatsAppMessage(
                    empresa_id=cita.empresa_id,
                    recipient_phone=clean_phone,
                    recipient_name=f"{cita.paciente.nombres} {cita.paciente.apellidos}",
                    message_content=mensaje,
                    status="sent" if send_res.get("success") else "pending",
                    direction="outbound",
                    sent_at=datetime.now()
                ))
            except Exception as e:
                total_fallidos += 1
                logger.warning(f"⚠️ Error enviando WhatsApp recordatorio cita {cita.id} ({clean_phone}): {e}")

        await db.commit()

    logger.info(f"✅ [SCHEDULER] Recordatorios procesados: {total_enviados} enviados, {total_fallidos} errores de {total_encontrados} citas.")
    return {
        "encontradas": total_encontrados,
        "enviados": total_enviados,
        "fallidos": total_fallidos,
        "fecha_objetivo": str(tomorrow)
    }


async def cleanup_old_chat_messages(days_retention: int = 30) -> Dict[str, Any]:
    """
    Política de retención del Chat Clínico:
    Elimina mensajes con más de 30 días de antigüedad y borra físicamente
    los archivos adjuntos (audios, imágenes, documentos) del disco.
    """
    import os
    from sqlalchemy import delete
    from app.models.chat import ChatMensaje

    logger.info(f"🧹 [SCHEDULER] Iniciando purga de mensajes de chat antiguos (> {days_retention} días)...")
    cutoff_date = datetime.now() - timedelta(days=days_retention)
    upload_chat_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "chat"))

    archivos_eliminados = 0
    mensajes_eliminados = 0

    async with AsyncSessionLocal() as db:
        # 1. Obtener mensajes anteriores a cutoff_date con archivo_url para eliminar archivos físicos
        stmt_files = select(ChatMensaje.archivo_url).where(
            ChatMensaje.created_at < cutoff_date,
            ChatMensaje.archivo_url.isnot(None)
        )
        res_files = await db.execute(stmt_files)
        file_urls = res_files.scalars().all()

        for url in file_urls:
            if url and url.startswith("/uploads/chat/"):
                fname = url.replace("/uploads/chat/", "")
                fpath = os.path.join(upload_chat_dir, fname)
                try:
                    if os.path.exists(fpath):
                        os.remove(fpath)
                        archivos_eliminados += 1
                except Exception as ex:
                    logger.warning(f"No se pudo eliminar archivo físico {fpath}: {ex}")

        # 2. Eliminar registros de mensajes de la base de datos
        stmt_del = delete(ChatMensaje).where(ChatMensaje.created_at < cutoff_date)
        res_del = await db.execute(stmt_del)
        mensajes_eliminados = res_del.rowcount or 0
        await db.commit()

    logger.info(f"🧹 [SCHEDULER] Purga de chat completada: {mensajes_eliminados} mensajes y {archivos_eliminados} archivos eliminados.")
    return {
        "mensajes_eliminados": mensajes_eliminados,
        "archivos_eliminados": archivos_eliminados,
        "fecha_corte": str(cutoff_date)
    }


async def run_all_scheduled_tasks() -> Dict[str, Any]:
    """
    Ejecuta el lote completo de tareas automatizadas:
    1. Suscripciones y vencimientos + alertas por hitos WhatsApp
    2. Recordatorios de citas para el día de mañana
    3. Purga de mensajes de chat y archivos adjuntos mayores a 30 días
    """
    logger.info("🚀 [SCHEDULER] Ejecutando lote de automatizaciones en segundo plano...")
    start_time = datetime.now()

    # 1. Suscripciones
    sub_res = None
    try:
        await check_and_send_subscription_reminders()
        sub_res = "ok"
    except Exception as e:
        logger.error(f"❌ Error en check_and_send_subscription_reminders: {e}", exc_info=True)
        sub_res = str(e)

    # 2. Citas médicas
    citas_res = None
    try:
        citas_res = await send_daily_appointment_reminders()
    except Exception as e:
        logger.error(f"❌ Error en send_daily_appointment_reminders: {e}", exc_info=True)
        citas_res = {"error": str(e)}

    # 3. Chat clínico: purga de mensajes y multimedia > 30 días
    chat_res = None
    try:
        chat_res = await cleanup_old_chat_messages(days_retention=30)
    except Exception as e:
        logger.error(f"❌ Error en cleanup_old_chat_messages: {e}", exc_info=True)
        chat_res = {"error": str(e)}

    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info(f"🏁 [SCHEDULER] Lote de tareas completado en {elapsed:.2f}s.")
    return {
        "ejecutado_en": str(datetime.now()),
        "duracion_segundos": elapsed,
        "suscripciones": sub_res,
        "citas": citas_res,
        "chat_purga": chat_res
    }


async def background_scheduler_worker():
    """
    Loop asíncrono permanente de ejecución cada 1 hora.
    Se ejecuta de fondo sin bloquear el servidor web.
    """
    global _scheduler_running
    _scheduler_running = True
    logger.info("🟢 [SCHEDULER] Worker en segundo plano iniciado.")
    
    # Pequeña espera al arrancar el servidor antes de la primera corrida (15 segundos)
    await asyncio.sleep(15)

    last_run_date: Optional[date] = None

    while _scheduler_running:
        try:
            today = datetime.now().date()
            # Ejecutar una vez al día o cada 60 minutos
            if last_run_date != today:
                await run_all_scheduled_tasks()
                last_run_date = today
        except asyncio.CancelledError:
            logger.info("🛑 [SCHEDULER] Tarea cancelada por apagado del servidor.")
            break
        except Exception as e:
            logger.error(f"⚠️ [SCHEDULER] Excepción no controlada en el worker: {e}", exc_info=True)

        # Dormir 1 hora (3600 seg) antes de la siguiente verificación
        try:
            await asyncio.sleep(3600)
        except asyncio.CancelledError:
            break

    _scheduler_running = False
    logger.info("🔴 [SCHEDULER] Worker finalizado.")


def start_background_scheduler():
    """Inicia el background scheduler task si aún no está corriendo."""
    global _scheduler_task, _scheduler_running
    if not _scheduler_running:
        _scheduler_task = asyncio.create_task(background_scheduler_worker())
        return _scheduler_task
    return None


def stop_background_scheduler():
    """Detiene el background scheduler de forma segura."""
    global _scheduler_task, _scheduler_running
    _scheduler_running = False
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
