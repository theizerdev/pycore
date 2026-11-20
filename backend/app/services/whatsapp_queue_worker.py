"""
Worker Asíncrono de Cola de Envíos WhatsApp con Control Anti-Baneo por Instancia.
Procesa mensajes con estado 'queued'/'pending' respetando:
- Estado real de conexión y pausa/circuit-breaker por instancia.
- Ventana horaria laboral (reprograma automáticamente fuera de horario).
- Límite diario efectivo con Modo Calentamiento (Warm-up progresivo).
- Límite horario estricto (mensajes/hora).
- Retardo humano gaussiano entre envíos + pausas de enfriamiento por lote.
- Simulación real de "Escribiendo..." (ChatPresence COMPOSING).
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.models.empresa import Empresa
from app.models.integracion import WhatsAppMessage
from app.models.sucursal import Sucursal
from app.services.whatsapp_python_engine import (
    compute_warmup_limit,
    gaussian_human_delay,
    is_within_working_hours,
    whatsapp_engine,
)
from app.services.whatsapp_resolver import get_empresa_codigo_pais_resolver

logger = logging.getLogger("whatsapp_queue_worker")
logger.setLevel(logging.INFO)

_worker_task: Optional[asyncio.Task] = None
_worker_running: bool = False
# Control de tiempos de próximo envío permitido por instancia (timestamp epoch)
_next_allowed_send_at: Dict[str, float] = {}
_batch_sent_count: Dict[str, int] = {}


async def _load_entity_policy(
    db, empresa_id: int, sucursal_id: Optional[int]
) -> Tuple[Optional[Any], str, str]:
    """Retorna (entidad_config, instance_name, country_code)."""
    stmt_emp = (
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == empresa_id)
    )
    empresa = (await db.execute(stmt_emp)).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)

    if sucursal_id:
        stmt_suc = (
            select(Sucursal)
            .options(selectinload(Sucursal.pais_telefono))
            .where(Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id)
        )
        suc = (await db.execute(stmt_suc)).scalar_one_or_none()
        if suc:
            inst = suc.whatsapp_instance or f"sucursal_{empresa_id}_{suc.id}"
            rt = whatsapp_engine.get_runtime(inst)
            if rt and rt.connection_state == "CONNECTED":
                cod_suc = (
                    suc.pais_telefono.codigo_telefonico
                    if suc.pais_telefono and suc.pais_telefono.codigo_telefonico
                    else cod_pais
                )
                return suc, inst, cod_suc

    if empresa:
        inst = empresa.whatsapp_instance or f"empresa_{empresa.id}"
        return empresa, inst, cod_pais

    return None, f"empresa_{empresa_id}", "58"


async def _count_sent_today(
    db, empresa_id: int, sucursal_id: Optional[int]
) -> int:
    today_start = datetime.combine(date.today(), datetime.min.time())
    q = select(func.count(WhatsAppMessage.id)).where(
        WhatsAppMessage.empresa_id == empresa_id,
        WhatsAppMessage.direction == "outbound",
        WhatsAppMessage.status.in_(["sent", "delivered", "read"]),
        WhatsAppMessage.sent_at >= today_start,
    )
    if sucursal_id is not None:
        q = q.where(WhatsAppMessage.sucursal_id == sucursal_id)
    else:
        q = q.where(WhatsAppMessage.sucursal_id.is_(None))
    return int((await db.execute(q)).scalar() or 0)


async def _count_sent_last_hour(
    db, empresa_id: int, sucursal_id: Optional[int]
) -> int:
    cutoff = datetime.now() - timedelta(hours=1)
    q = select(func.count(WhatsAppMessage.id)).where(
        WhatsAppMessage.empresa_id == empresa_id,
        WhatsAppMessage.direction == "outbound",
        WhatsAppMessage.status.in_(["sent", "delivered", "read"]),
        WhatsAppMessage.sent_at >= cutoff,
    )
    if sucursal_id is not None:
        q = q.where(WhatsAppMessage.sucursal_id == sucursal_id)
    else:
        q = q.where(WhatsAppMessage.sucursal_id.is_(None))
    return int((await db.execute(q)).scalar() or 0)


async def _process_one_cycle() -> None:
    now_dt = datetime.now()
    now_ts = time.time()

    async with AsyncSessionLocal() as db:
        # Buscar mensajes en cola listos para despachar (orden FIFO)
        stmt = (
            select(WhatsAppMessage)
            .where(
                WhatsAppMessage.direction == "outbound",
                WhatsAppMessage.status.in_(["queued", "pending"]),
                (WhatsAppMessage.scheduled_at.is_(None))
                | (WhatsAppMessage.scheduled_at <= now_dt),
            )
            .order_by(WhatsAppMessage.id.asc())
            .limit(25)
        )
        candidates = (await db.execute(stmt)).scalars().all()
        if not candidates:
            return

        # Procesar a lo sumo 1 mensaje por instancia en cada ciclo para respetar delays de forma justa
        handled_instances = set()

        for msg in candidates:
            target_entity, inst_name, cod_pais = await _load_entity_policy(
                db, msg.empresa_id, msg.sucursal_id
            )
            if not target_entity or inst_name in handled_instances:
                continue

            handled_instances.add(inst_name)

            # 1. Respetar temporizador de delay humano / pausa por lote de la instancia
            if now_ts < _next_allowed_send_at.get(inst_name, 0.0):
                continue

            # 2. Verificar conexión en vivo y pausa/circuit breaker
            rt = whatsapp_engine.get_runtime(inst_name)
            if not rt or rt.connection_state != "CONNECTED":
                continue
            if rt.queue_paused or getattr(target_entity, "whatsapp_queue_paused", False):
                continue

            # 3. Verificar ventana horaria laboral
            wh_enabled = bool(
                getattr(target_entity, "whatsapp_working_hours_enabled", True)
                if getattr(target_entity, "whatsapp_working_hours_enabled", None) is not None
                else True
            )
            wh_start = getattr(target_entity, "whatsapp_working_hours_start", None) or "08:00"
            wh_end = getattr(target_entity, "whatsapp_working_hours_end", None) or "20:00"
            in_hours, next_open = is_within_working_hours(wh_enabled, wh_start, wh_end, now_dt)
            if not in_hours:
                if next_open:
                    msg.scheduled_at = next_open
                    msg.error_message = f"En espera de horario laboral ({wh_start}–{wh_end})."
                    await db.commit()
                continue

            # 4. Verificar cuota diaria efectiva (con Warm-up)
            daily_cfg = int(getattr(target_entity, "whatsapp_rate_limit", None) or 200)
            warmup_enabled = bool(
                getattr(target_entity, "whatsapp_warmup_mode", True)
                if getattr(target_entity, "whatsapp_warmup_mode", None) is not None
                else True
            )
            connected_at = getattr(target_entity, "whatsapp_connected_at", None) or rt.connected_at
            effective_daily, _ = compute_warmup_limit(connected_at, daily_cfg, warmup_enabled)
            sent_today = await _count_sent_today(db, msg.empresa_id, msg.sucursal_id)
            if sent_today >= effective_daily:
                tomorrow_open = datetime.combine(date.today() + timedelta(days=1), datetime.min.time()).replace(
                    hour=int(wh_start.split(":")[0]), minute=int(wh_start.split(":")[1])
                )
                msg.scheduled_at = tomorrow_open
                msg.error_message = f"Cuota diaria segura alcanzada ({sent_today}/{effective_daily}). Reprogramado para mañana."
                await db.commit()
                continue

            # 5. Verificar cuota por hora
            hourly_limit = int(getattr(target_entity, "whatsapp_hourly_limit", None) or 25)
            sent_hour = max(
                await _count_sent_last_hour(db, msg.empresa_id, msg.sucursal_id),
                whatsapp_engine.get_hourly_count(inst_name),
            )
            if sent_hour >= hourly_limit:
                _next_allowed_send_at[inst_name] = time.time() + 180  # Reintentar en 3 min
                continue

            # 6. Marcar como 'sending' y despachar con simulación de escritura humana
            msg.status = "sending"
            msg.instance_name = inst_name
            msg.error_message = None
            await db.commit()

            simulate_typing = bool(
                getattr(target_entity, "whatsapp_simulate_typing", True)
                if getattr(target_entity, "whatsapp_simulate_typing", None) is not None
                else True
            )
            typing_min = float(getattr(target_entity, "whatsapp_typing_min_sec", None) or 2.0)
            typing_max = float(getattr(target_entity, "whatsapp_typing_max_sec", None) or 6.0)
            verify_num = bool(
                getattr(target_entity, "whatsapp_verify_number", True)
                if getattr(target_entity, "whatsapp_verify_number", None) is not None
                else True
            )

            res = await whatsapp_engine.send_text_humanized(
                instance_name=inst_name,
                to=msg.recipient_phone,
                message=msg.message_content,
                country_code=cod_pais,
                variables=msg.variables,
                simulate_typing=simulate_typing,
                typing_min_sec=typing_min,
                typing_max_sec=typing_max,
                verify_number=verify_num,
                anti_fingerprint=True,
                enforce_cooldown=True,
            )

            if res.get("success"):
                msg.status = "sent"
                msg.sent_at = datetime.now()
                msg.external_message_id = res.get("message_id")
                msg.message_content = res.get("final_message", msg.message_content)
                msg.error_message = None

                # Calcular retardo humano para el siguiente mensaje de esta instancia
                delay_min = int(getattr(target_entity, "whatsapp_delay_min_sec", None) or 8)
                delay_max = int(getattr(target_entity, "whatsapp_delay_max_sec", None) or 20)
                batch_size = max(2, int(getattr(target_entity, "whatsapp_batch_size", None) or 10))
                batch_pause = max(15, int(getattr(target_entity, "whatsapp_batch_pause_sec", None) or 60))

                _batch_sent_count[inst_name] = _batch_sent_count.get(inst_name, 0) + 1
                if _batch_sent_count[inst_name] >= batch_size:
                    _batch_sent_count[inst_name] = 0
                    pause_s = gaussian_human_delay(batch_pause * 0.85, batch_pause * 1.25)
                    _next_allowed_send_at[inst_name] = time.time() + pause_s
                    logger.info(
                        f"☕ [WA QUEUE {inst_name}] Lote de {batch_size} completado. Enfriamiento Anti-Ban: {pause_s:.1f}s."
                    )
                else:
                    delay_s = gaussian_human_delay(delay_min, delay_max)
                    _next_allowed_send_at[inst_name] = time.time() + delay_s
            else:
                err_txt = res.get("error") or "Error desconocido al enviar"
                is_permanent = (
                    "no tiene cuenta activa" in err_txt.lower()
                    or "inválido" in err_txt.lower()
                    or "anti-duplicado" in err_txt.lower()
                )
                msg.retry_count = (msg.retry_count or 0) + 1
                msg.error_message = err_txt
                if is_permanent or msg.retry_count >= 3:
                    msg.status = "failed"
                else:
                    msg.status = "queued"
                    msg.scheduled_at = datetime.now() + timedelta(seconds=30 * msg.retry_count)
                _next_allowed_send_at[inst_name] = time.time() + 10.0

            await db.commit()


async def _queue_worker_loop() -> None:
    global _worker_running
    _worker_running = True
    logger.info("🟢 [WA QUEUE WORKER] Motor de cola Anti-Baneo en Python iniciado.")
    await asyncio.sleep(3)

    while _worker_running:
        try:
            await _process_one_cycle()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"❌ [WA QUEUE WORKER] Error en ciclo de cola: {e}")
        await asyncio.sleep(2.5)

    logger.info("🔴 [WA QUEUE WORKER] Motor de cola detenido.")


def start_whatsapp_queue_worker() -> None:
    global _worker_task, _worker_running
    if _worker_task and not _worker_task.done():
        return
    try:
        loop = asyncio.get_running_loop()
        whatsapp_engine.attach_event_loop(loop)
        _worker_task = loop.create_task(_queue_worker_loop())
        # Reconectar sesiones guardadas en segundo plano sin bloquear el arranque
        loop.create_task(whatsapp_engine.auto_reconnect_saved_sessions())
    except Exception as e:
        logger.warning(f"No se pudo iniciar el worker de WhatsApp: {e}")


def stop_whatsapp_queue_worker() -> None:
    global _worker_task, _worker_running
    _worker_running = False
    if _worker_task and not _worker_task.done():
        _worker_task.cancel()
        _worker_task = None
    whatsapp_engine.shutdown_all()
