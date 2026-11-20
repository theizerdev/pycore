"""
Motor Nativo de WhatsApp Multi-Dispositivo en Python (Sin Intermediarios).
Impulsado por Neonize (WhatsMeow embebido en Python) + Segno (QR SVG nativo).

Características clave:
- Multi-instancia real aislada (1 SQLite de sesión por empresa/sucursal).
- Conexión directa por Código QR o Código de Emparejamiento (8 dígitos por teléfono).
- Simulación real de "Escribiendo..." (ChatPresence COMPOSING -> pausa natural -> PAUSED -> envío).
- Escudo Anti-Baneo integral: Warm-up progresivo, límites por hora y por día, horario laboral,
  verificación previa de números en WhatsApp, Spintax, retardo humano gaussiano, pausas por lote,
  cooldown por destinatario y Circuit Breaker automático ante alertas o fallos consecutivos.
- Actualización automática de confirmaciones de entrega (✓✓) y lectura (✓✓ azul) vía ReceiptEv.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import random
import re
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Deque, Dict, List, Optional, Tuple

import segno

try:
    import psutil
except ImportError:
    psutil = None

from neonize.client import NewClient, ProxySettings
from neonize.events import (
    ConnectedEv,
    ConnectFailureEv,
    DisconnectedEv,
    LoggedOutEv,
    PairStatusEv,
    ReceiptEv,
    TemporaryBanEv,
)
from neonize.proto.waCompanionReg.WACompanionReg_pb2 import DeviceProps
from neonize.utils import build_jid
from neonize.utils.enum import (
    ChatPresence,
    ChatPresenceMedia,
    ClientName,
    Presence,
    ReceiptType,
)

logger = logging.getLogger("whatsapp_python_engine")
logger.setLevel(logging.INFO)

SESSIONS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "whatsapp_sessions")
)
os.makedirs(SESSIONS_DIR, exist_ok=True)


def sanitize_instance_name(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9_-]", "_", (name or "empresa_1").strip())
    return clean[:80] or "empresa_1"


def format_phone_number(phone: str, default_country_code: str = "+58") -> str:
    digits = re.sub(r"[^0-9]", "", str(phone or ""))
    if not digits:
        return ""

    if digits.startswith("0"):
        digits = digits[1:]

    if digits.startswith("580"):
        digits = "58" + digits[3:]

    # Venezuela (+58)
    if digits.startswith("58") and len(digits) >= 12:
        return digits

    # México (+521 o +52)
    if digits.startswith("521") and len(digits) == 13:
        return digits
    if digits.startswith("52") and len(digits) == 12:
        return "521" + digits[2:]

    clean_prefix = re.sub(r"[^0-9]", "", default_country_code or "58") or "58"

    if clean_prefix == "52":
        if len(digits) == 10:
            return "521" + digits
        return clean_prefix + digits

    if len(digits) == 10:
        return clean_prefix + digits

    if digits.startswith(clean_prefix):
        return digits

    return clean_prefix + digits


def parse_spintax(text: str) -> str:
    if not text:
        return ""
    pattern = re.compile(r"\{([^{}]+)\}")
    result = text
    # Evitar reemplazar variables simples tipo {paciente} (sin '|')
    while True:
        match = None
        for m in pattern.finditer(result):
            if "|" in m.group(1):
                match = m
                break
        if not match:
            break
        choices = match.group(1).split("|")
        replacement = random.choice(choices)
        result = result[: match.start()] + replacement + result[match.end() :]
    return result


def replace_variables(text: str, variables: Optional[Dict[str, Any]]) -> str:
    if not text or not variables:
        return text or ""
    result = text
    for k, v in variables.items():
        val = "" if v is None else str(v)
        result = result.replace(f"{{{{{k}}}}}", val).replace(f"{{{k}}}", val)
    return result


def apply_anti_fingerprint_variance(text: str) -> str:
    """
    Agrega una variación imperceptible al final del mensaje para evitar hashes idénticos
    cuando se despachan múltiples notificaciones similares sin Spintax.
    """
    zw_variants = ["", "\u200b", "\u200c", "\u200b\u200c", "\u200c\u200b"]
    return text.rstrip() + random.choice(zw_variants)


def compute_warmup_limit(
    connected_at: Optional[datetime],
    configured_daily_limit: int,
    warmup_mode: bool,
) -> Tuple[int, int]:
    """
    Retorna (effective_daily_limit, warmup_day).
    Escala progresivamente el límite diario para proteger números recién vinculados:
    - Días 1-2: máx 20/día
    - Días 3-4: máx 40/día
    - Días 5-7: máx 80/día
    - Días 8-14: máx 150/día
    - Día 15+: límite completo configurado
    """
    base_limit = max(10, int(configured_daily_limit or 200))
    if not connected_at:
        warmup_day = 1
    else:
        delta_days = (datetime.now() - connected_at).days
        warmup_day = max(1, delta_days + 1)

    if not warmup_mode:
        return base_limit, warmup_day

    if warmup_day <= 2:
        cap = 20
    elif warmup_day <= 4:
        cap = 40
    elif warmup_day <= 7:
        cap = 80
    elif warmup_day <= 14:
        cap = 150
    else:
        cap = base_limit

    return min(base_limit, cap), warmup_day


def is_within_working_hours(
    enabled: bool,
    start_str: str = "08:00",
    end_str: str = "20:00",
    now: Optional[datetime] = None,
) -> Tuple[bool, Optional[datetime]]:
    """
    Verifica si la hora actual está dentro de la ventana laboral permitida.
    Retorna (permitido, proxima_apertura_si_fuera).
    """
    if not enabled:
        return True, None

    current = now or datetime.now()
    try:
        sh, sm = [int(x) for x in (start_str or "08:00").split(":")[:2]]
        eh, em = [int(x) for x in (end_str or "20:00").split(":")[:2]]
    except Exception:
        sh, sm, eh, em = 8, 0, 20, 0

    start_dt = current.replace(hour=sh, minute=sm, second=0, microsecond=0)
    end_dt = current.replace(hour=eh, minute=em, second=0, microsecond=0)

    if start_dt <= end_dt:
        if start_dt <= current <= end_dt:
            return True, None
        next_open = start_dt if current < start_dt else (start_dt + timedelta(days=1))
        return False, next_open
    else:
        # Ventana nocturna que cruza medianoche
        if current >= start_dt or current <= end_dt:
            return True, None
        return False, start_dt


def calculate_safety_score(
    simulate_typing: bool,
    warmup_mode: bool,
    working_hours_enabled: bool,
    verify_number: bool,
    delay_min_sec: int,
    delay_max_sec: int,
    daily_limit: int,
    hourly_limit: int,
    batch_size: int,
    batch_pause_sec: int,
) -> Tuple[int, List[str]]:
    """Calcula un índice de protección Anti-Baneo (0-100) y recomendaciones activas."""
    score = 0
    tips: List[str] = []

    if simulate_typing:
        score += 20
    else:
        tips.append("Activa la simulación de 'Escribiendo...' para humanizar los despachos.")

    if warmup_mode:
        score += 18
    else:
        tips.append("Habilita el Modo Calentamiento (Warm-up) en líneas nuevas o reactivadas.")

    if working_hours_enabled:
        score += 14
    else:
        tips.append("Configura una ventana horaria laboral para evitar envíos nocturnos.")

    if verify_number:
        score += 14
    else:
        tips.append("Activa la verificación previa en WhatsApp para evitar rebotes a números inexistentes.")

    if delay_min_sec >= 8 and delay_max_sec >= 15:
        score += 14
    elif delay_min_sec >= 5:
        score += 8
        tips.append("Aumenta el retardo aleatorio a 8–20 s para reducir patrones automatizados.")
    else:
        tips.append("El retardo entre mensajes es muy bajo (<5 s); se recomienda 8–20 s.")

    if hourly_limit <= 35:
        score += 10
    elif hourly_limit <= 60:
        score += 5
        tips.append("Limita los envíos a ≤ 35 mensajes/hora para mayor seguridad.")
    else:
        tips.append("Más de 60 mensajes/hora incrementa significativamente el riesgo de bloqueo.")

    if batch_size <= 15 and batch_pause_sec >= 45:
        score += 10
    else:
        score += 4
        tips.append("Configura pausas de enfriamiento de ≥ 45 s cada 10–15 mensajes.")

    if daily_limit > 500:
        score = max(0, score - 10)
        tips.append("Un límite diario mayor a 500 mensajes exige cuentas muy maduras.")

    return min(100, max(0, score)), tips


def gaussian_human_delay(min_sec: float, max_sec: float) -> float:
    lo = max(0.5, float(min_sec))
    hi = max(lo + 0.5, float(max_sec))
    mean = (lo + hi) / 2.0
    sigma = (hi - lo) / 4.0
    val = random.gauss(mean, sigma)
    return max(lo, min(hi, val))


def generate_qr_svg_data_uri(qr_text: str) -> str:
    qr = segno.make(qr_text, error="L")
    return qr.svg_data_uri(scale=6, border=2, dark="#0f172a", light="#ffffff")


@dataclass
class WhatsAppInstanceRuntime:
    instance_name: str
    db_path: str
    client: Optional[NewClient] = None
    thread: Optional[threading.Thread] = None
    connection_state: str = "DISCONNECTED"  # DISCONNECTED | CONNECTING | QR_READY | CONNECTED | BANNED_COOLDOWN
    qr_code: Optional[str] = None
    qr_data_url: Optional[str] = None
    qr_generated_at: Optional[datetime] = None
    phone_number: Optional[str] = None
    push_name: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_sync: datetime = field(default_factory=datetime.now)
    last_error: Optional[str] = None
    proxy_url: Optional[str] = None

    # Estado en vivo Anti-Baneo
    queue_paused: bool = False
    pause_reason: Optional[str] = None
    consecutive_failures: int = 0
    sent_timestamps_hour: Deque[float] = field(default_factory=lambda: deque(maxlen=500))
    batch_counter: int = 0
    last_sent_at: float = 0.0
    currently_typing_to: Optional[str] = None
    # Caché temporal de números verificados: phone -> (exists, ts)
    number_check_cache: Dict[str, Tuple[bool, float]] = field(default_factory=dict)
    # Cooldown por destinatario+hash: (phone, hash) -> ts
    recent_sends: Dict[str, float] = field(default_factory=dict)

    # Eventos de sincronización para esperar QR / conexión
    ready_event: threading.Event = field(default_factory=threading.Event)
    lock: threading.RLock = field(default_factory=threading.RLock)


class WhatsAppPythonEngine:
    """
    Gestor singleton multi-instancia de WhatsApp nativo en Python (Neonize).
    Sin microservicios externos ni intermediarios HTTP.
    """

    def __init__(self) -> None:
        self._instances: Dict[str, WhatsAppInstanceRuntime] = {}
        self._global_lock = threading.RLock()
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._started_at: datetime = datetime.now()

    def attach_event_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._event_loop = loop

    def _session_path(self, instance_name: str) -> str:
        safe = sanitize_instance_name(instance_name)
        return os.path.join(SESSIONS_DIR, f"{safe}.sqlite3")

    def has_persisted_session(self, instance_name: str) -> bool:
        path = self._session_path(instance_name)
        return os.path.exists(path) and os.path.getsize(path) > 4096

    def _get_or_create_runtime(self, instance_name: str) -> WhatsAppInstanceRuntime:
        safe = sanitize_instance_name(instance_name)
        with self._global_lock:
            rt = self._instances.get(safe)
            if rt is None:
                rt = WhatsAppInstanceRuntime(
                    instance_name=safe,
                    db_path=self._session_path(safe),
                )
                self._instances[safe] = rt
            return rt

    def get_runtime(self, instance_name: str) -> Optional[WhatsAppInstanceRuntime]:
        safe = sanitize_instance_name(instance_name)
        with self._global_lock:
            return self._instances.get(safe)

    def list_active_runtimes(self) -> Dict[str, WhatsAppInstanceRuntime]:
        with self._global_lock:
            return dict(self._instances)

    def _schedule_coro(self, coro) -> None:
        loop = self._event_loop
        if loop and loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(coro, loop)
                return
            except Exception as e:
                logger.debug(f"No se pudo despachar corrutina de callback: {e}")
        try:
            coro.close()
        except Exception:
            pass

    async def _persist_connection_state(
        self,
        instance_name: str,
        connected: bool,
        status: str,
        phone: Optional[str] = None,
        paused: Optional[bool] = None,
    ) -> None:
        """Sincroniza el estado de conexión real de la instancia con MariaDB."""
        try:
            from sqlalchemy.future import select
            from app.core.database import AsyncSessionLocal
            from app.models.empresa import Empresa
            from app.models.sucursal import Sucursal

            async with AsyncSessionLocal() as db:
                # Buscar en sucursales primero
                stmt_suc = select(Sucursal).where(Sucursal.whatsapp_instance == instance_name)
                suc = (await db.execute(stmt_suc)).scalar_one_or_none()
                if suc:
                    suc.whatsapp_connected = connected
                    suc.whatsapp_status = status
                    if phone:
                        suc.whatsapp_phone = phone
                    elif not connected and status == "disconnected":
                        suc.whatsapp_phone = None
                    if connected and not suc.whatsapp_connected_at:
                        suc.whatsapp_connected_at = datetime.now()
                    if paused is not None:
                        suc.whatsapp_queue_paused = paused
                    await db.commit()
                    return

                stmt_emp = select(Empresa).where(Empresa.whatsapp_instance == instance_name)
                emp = (await db.execute(stmt_emp)).scalar_one_or_none()
                if emp:
                    emp.whatsapp_connected = connected
                    emp.whatsapp_status = status
                    if phone:
                        emp.whatsapp_phone = phone
                    elif not connected and status == "disconnected":
                        emp.whatsapp_phone = None
                    if connected and not emp.whatsapp_connected_at:
                        emp.whatsapp_connected_at = datetime.now()
                    if paused is not None:
                        emp.whatsapp_queue_paused = paused
                    await db.commit()
        except Exception as e:
            logger.warning(f"[WA ENGINE] Error persistiendo estado de {instance_name}: {e}")

    async def _persist_receipt(self, message_ids: List[str], receipt_type: str) -> None:
        """Actualiza automáticamente estados 'delivered' y 'read' en whatsapp_messages."""
        if not message_ids:
            return
        try:
            from sqlalchemy.future import select
            from app.core.database import AsyncSessionLocal
            from app.models.integracion import WhatsAppMessage

            async with AsyncSessionLocal() as db:
                stmt = select(WhatsAppMessage).where(
                    WhatsAppMessage.external_message_id.in_(message_ids)
                )
                msgs = (await db.execute(stmt)).scalars().all()
                now = datetime.now()
                changed = False
                for m in msgs:
                    if receipt_type == "read":
                        m.status = "read"
                        m.read_at = now
                        if not m.delivered_at:
                            m.delivered_at = now
                        changed = True
                    elif receipt_type == "delivered" and m.status not in ("read",):
                        m.status = "delivered"
                        m.delivered_at = now
                        changed = True
                if changed:
                    await db.commit()
        except Exception as e:
            logger.debug(f"[WA ENGINE] Error actualizando receipt {receipt_type}: {e}")

    def _build_client(self, rt: WhatsAppInstanceRuntime) -> NewClient:
        props = DeviceProps(
            os="MediSoft Suite",
            platformType=DeviceProps.CHROME,
        )
        client = NewClient(rt.db_path, uuid=rt.instance_name, props=props)

        @client.event.qr
        def on_qr(_c: NewClient, data_qr: bytes):
            qr_str = data_qr.decode("utf-8", errors="ignore").strip()
            if not qr_str:
                return
            try:
                svg_uri = generate_qr_svg_data_uri(qr_str)
            except Exception as exc:
                logger.warning(f"[WA {rt.instance_name}] Error generando SVG QR: {exc}")
                svg_uri = None
            with rt.lock:
                rt.qr_code = qr_str
                rt.qr_data_url = svg_uri
                rt.qr_generated_at = datetime.now()
                rt.connection_state = "QR_READY"
                rt.last_sync = datetime.now()
                rt.last_error = None
                rt.ready_event.set()
            logger.info(f"[WA {rt.instance_name}] Código QR generado (motor Python nativo).")
            self._schedule_coro(
                self._persist_connection_state(rt.instance_name, False, "qr_ready")
            )

        @client.event(ConnectedEv)
        def on_connected(c: NewClient, _ev: ConnectedEv):
            phone = None
            push_name = None
            try:
                me = c.get_me()
                if me and me.JID and me.JID.User:
                    phone = str(me.JID.User)
                if me and me.PushName:
                    push_name = str(me.PushName)
            except Exception:
                pass
            with rt.lock:
                rt.connection_state = "CONNECTED"
                rt.qr_code = None
                rt.qr_data_url = None
                rt.qr_generated_at = None
                if phone:
                    rt.phone_number = phone
                if push_name:
                    rt.push_name = push_name
                if not rt.connected_at:
                    rt.connected_at = datetime.now()
                rt.last_sync = datetime.now()
                rt.last_error = None
                rt.consecutive_failures = 0
                rt.ready_event.set()
            logger.info(f"[WA {rt.instance_name}] Conectado exitosamente ({phone or 'sin JID'}).")
            self._schedule_coro(
                self._persist_connection_state(rt.instance_name, True, "connected", phone=phone)
            )

        @client.event(PairStatusEv)
        def on_pair(_c: NewClient, ev: PairStatusEv):
            phone = str(ev.ID.User) if ev.ID and ev.ID.User else None
            bname = str(ev.BusinessName) if getattr(ev, "BusinessName", None) else None
            with rt.lock:
                if phone:
                    rt.phone_number = phone
                if bname and not rt.push_name:
                    rt.push_name = bname
                rt.connection_state = "CONNECTED"
                rt.qr_code = None
                rt.qr_data_url = None
                if not rt.connected_at:
                    rt.connected_at = datetime.now()
                rt.last_sync = datetime.now()
                rt.ready_event.set()
            logger.info(f"[WA {rt.instance_name}] Emparejamiento completado ({phone}).")
            self._schedule_coro(
                self._persist_connection_state(rt.instance_name, True, "connected", phone=phone)
            )

        @client.event(DisconnectedEv)
        def on_disconnected(_c: NewClient, _ev: DisconnectedEv):
            with rt.lock:
                if rt.connection_state != "BANNED_COOLDOWN":
                    rt.connection_state = "DISCONNECTED"
                rt.last_sync = datetime.now()
            logger.info(f"[WA {rt.instance_name}] Sesión desconectada.")
            self._schedule_coro(
                self._persist_connection_state(rt.instance_name, False, "disconnected")
            )

        @client.event(LoggedOutEv)
        def on_logged_out(_c: NewClient, _ev: LoggedOutEv):
            with rt.lock:
                rt.connection_state = "DISCONNECTED"
                rt.phone_number = None
                rt.push_name = None
                rt.qr_code = None
                rt.qr_data_url = None
                rt.last_error = "Sesión cerrada desde el teléfono móvil."
                rt.last_sync = datetime.now()
            logger.warning(f"[WA {rt.instance_name}] Sesión cerrada remotamente (LoggedOutEv).")
            self._schedule_coro(
                self._persist_connection_state(rt.instance_name, False, "disconnected")
            )

        @client.event(ConnectFailureEv)
        def on_connect_failure(_c: NewClient, ev: ConnectFailureEv):
            with rt.lock:
                rt.connection_state = "DISCONNECTED"
                rt.last_error = f"Fallo de conexión WhatsApp: {ev}"
                rt.last_sync = datetime.now()
                rt.ready_event.set()
            logger.error(f"[WA {rt.instance_name}] ConnectFailureEv: {ev}")

        @client.event(TemporaryBanEv)
        def on_temp_ban(_c: NewClient, ev: TemporaryBanEv):
            with rt.lock:
                rt.connection_state = "BANNED_COOLDOWN"
                rt.queue_paused = True
                rt.pause_reason = "Circuit Breaker Anti-Ban activado: alerta temporal de WhatsApp."
                rt.last_error = f"Alerta temporal de WhatsApp: {ev}"
                rt.last_sync = datetime.now()
            logger.critical(f"[WA {rt.instance_name}] TemporaryBanEv! Cola pausada automáticamente.")
            self._schedule_coro(
                self._persist_connection_state(
                    rt.instance_name, False, "banned_cooldown", paused=True
                )
            )

        @client.event(ReceiptEv)
        def on_receipt(_c: NewClient, ev: ReceiptEv):
            try:
                ids = list(ev.MessageIDs) if ev.MessageIDs else []
                if not ids:
                    return
                if ev.Type in (ReceiptType.READ, ReceiptType.READ_SELF):
                    self._schedule_coro(self._persist_receipt(ids, "read"))
                elif ev.Type == ReceiptType.DELIVERED:
                    self._schedule_coro(self._persist_receipt(ids, "delivered"))
            except Exception:
                pass

        return client

    def _start_client_thread(
        self, rt: WhatsAppInstanceRuntime, proxy_url: Optional[str] = None
    ) -> None:
        with rt.lock:
            if rt.thread and rt.thread.is_alive():
                return
            rt.ready_event.clear()
            rt.connection_state = "CONNECTING"
            rt.last_error = None
            rt.proxy_url = proxy_url
            client = self._build_client(rt)
            rt.client = client

            proxy_settings = None
            if proxy_url and proxy_url.strip():
                proxy_settings = ProxySettings(proxy_address=proxy_url.strip())

            def _runner():
                try:
                    client.connect(proxy_settings)
                except Exception as exc:
                    logger.warning(f"[WA {rt.instance_name}] Hilo cliente finalizado: {exc}")
                    with rt.lock:
                        rt.last_error = str(exc)
                        if rt.connection_state not in ("CONNECTED", "BANNED_COOLDOWN"):
                            rt.connection_state = "DISCONNECTED"
                        rt.ready_event.set()
                finally:
                    with rt.lock:
                        if rt.client is client and rt.connection_state == "CONNECTING":
                            rt.connection_state = "DISCONNECTED"
                        rt.ready_event.set()

            thread = threading.Thread(
                target=_runner,
                name=f"wa-neonize-{rt.instance_name}",
                daemon=True,
            )
            rt.thread = thread
            thread.start()

    async def connect_instance(
        self,
        instance_name: str,
        proxy_url: Optional[str] = None,
        wait_seconds: float = 10.0,
    ) -> Dict[str, Any]:
        if self._event_loop is None:
            try:
                self._event_loop = asyncio.get_running_loop()
            except RuntimeError:
                pass
        rt = self._get_or_create_runtime(instance_name)

        with rt.lock:
            if rt.connection_state == "CONNECTED" and rt.client and rt.thread and rt.thread.is_alive():
                return self.build_status_payload(rt)

            # Si ya tiene un QR fresco (< 45 s), devolverlo directamente
            if (
                rt.connection_state == "QR_READY"
                and rt.qr_data_url
                and rt.qr_generated_at
                and (datetime.now() - rt.qr_generated_at).total_seconds() < 45
                and rt.thread
                and rt.thread.is_alive()
            ):
                return self.build_status_payload(rt)

        # Iniciar hilo nativo
        self._start_client_thread(rt, proxy_url=proxy_url)

        # Esperar sin bloquear el event loop de FastAPI a que llegue el QR o la reconexión
        deadline = time.monotonic() + wait_seconds
        while time.monotonic() < deadline:
            if rt.ready_event.is_set():
                break
            await asyncio.sleep(0.25)

        return self.build_status_payload(rt)

    async def pair_phone(
        self,
        instance_name: str,
        phone: str,
        country_code: str = "+58",
        proxy_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Vincula la instancia generando un código numérico de 8 dígitos para el teléfono."""
        formatted = format_phone_number(phone, country_code)
        if not formatted or len(formatted) < 10:
            return {"success": False, "error": "Número telefónico inválido para emparejamiento."}

        rt = self._get_or_create_runtime(instance_name)
        with rt.lock:
            if rt.connection_state == "CONNECTED":
                return {
                    "success": True,
                    "already_connected": True,
                    "phone_number": rt.phone_number,
                    "message": "La instancia ya se encuentra conectada.",
                }

        # Garantizar que el cliente esté iniciado en modo conexión/QR
        if not (rt.thread and rt.thread.is_alive()):
            await self.connect_instance(instance_name, proxy_url=proxy_url, wait_seconds=6.0)

        with rt.lock:
            client = rt.client

        if not client:
            return {"success": False, "error": "No se pudo inicializar el cliente WhatsApp."}

        try:
            loop = asyncio.get_running_loop()
            code = await loop.run_in_executor(
                None,
                lambda: client.PairPhone(
                    formatted,
                    show_push_notification=True,
                    client_name=ClientName.CHROME,
                ),
            )
            return {
                "success": True,
                "pairing_code": code,
                "phone": formatted,
                "instance_name": rt.instance_name,
            }
        except Exception as e:
            logger.warning(f"[WA {rt.instance_name}] Error en PairPhone({formatted}): {e}")
            return {"success": False, "error": str(e)}

    async def disconnect_instance(
        self, instance_name: str, clear_session: bool = True
    ) -> Dict[str, Any]:
        safe = sanitize_instance_name(instance_name)
        rt = self._get_or_create_runtime(safe)
        loop = asyncio.get_running_loop()

        def _stop_sync():
            with rt.lock:
                client = rt.client
                thread = rt.thread
                rt.client = None
                rt.thread = None
                rt.connection_state = "DISCONNECTED"
                rt.qr_code = None
                rt.qr_data_url = None
                rt.qr_generated_at = None
                rt.phone_number = None
                rt.push_name = None
                rt.currently_typing_to = None
                rt.last_sync = datetime.now()

            if client:
                if clear_session:
                    try:
                        client.logout()
                    except Exception:
                        pass
                try:
                    client.stop()
                except Exception:
                    pass
                try:
                    client.disconnect()
                except Exception:
                    pass

            if thread and thread.is_alive():
                thread.join(timeout=3.0)

            if clear_session:
                for suffix in ("", "-wal", "-shm", "-journal"):
                    fpath = rt.db_path + suffix
                    if os.path.exists(fpath):
                        try:
                            os.remove(fpath)
                        except Exception as ex:
                            logger.debug(f"No se pudo borrar sesión {fpath}: {ex}")

        await loop.run_in_executor(None, _stop_sync)
        return self.build_status_payload(rt)

    def get_status(self, instance_name: str) -> Dict[str, Any]:
        rt = self._get_or_create_runtime(instance_name)
        with rt.lock:
            # Si el QR expiró (>65s) y el hilo ya no corre, reflejar desconectado
            if rt.connection_state == "QR_READY" and rt.qr_generated_at:
                age = (datetime.now() - rt.qr_generated_at).total_seconds()
                if age > 65 and not (rt.thread and rt.thread.is_alive()):
                    rt.connection_state = "DISCONNECTED"
                    rt.qr_code = None
                    rt.qr_data_url = None
            return self.build_status_payload(rt)

    def build_status_payload(self, rt: WhatsAppInstanceRuntime) -> Dict[str, Any]:
        with rt.lock:
            qr_expires_in = None
            if rt.connection_state == "QR_READY" and rt.qr_generated_at:
                elapsed = int((datetime.now() - rt.qr_generated_at).total_seconds())
                qr_expires_in = max(0, 55 - elapsed)
            return {
                "is_connected": rt.connection_state == "CONNECTED",
                "connection_state": rt.connection_state,
                "qr_code": rt.qr_code,
                "qr_data_url": rt.qr_data_url,
                "qr_expires_in": qr_expires_in,
                "instance_name": rt.instance_name,
                "phone_number": rt.phone_number,
                "push_name": rt.push_name,
                "currently_typing_to": rt.currently_typing_to,
                "queue_paused": rt.queue_paused,
                "pause_reason": rt.pause_reason,
                "last_error": rt.last_error,
                "engine": "python-neonize",
                "has_saved_session": self.has_persisted_session(rt.instance_name),
                "last_sync": datetime.now(),
            }

    async def check_number(
        self,
        instance_name: str,
        phone: str,
        country_code: str = "+58",
    ) -> Dict[str, Any]:
        formatted = format_phone_number(phone, country_code)
        if not formatted or len(formatted) < 10 or len(formatted) > 15:
            return {
                "exists": False,
                "jid": f"{formatted}@s.whatsapp.net",
                "phone": formatted,
                "formattedPhone": formatted,
                "verified_live": False,
                "reason": "Formato de teléfono inválido",
            }

        rt = self._get_or_create_runtime(instance_name)
        now_ts = time.time()

        # Revisar caché de 10 minutos para evitar consultas repetitivas a WhatsApp
        with rt.lock:
            cached = rt.number_check_cache.get(formatted)
            if cached and (now_ts - cached[1]) < 600:
                return {
                    "exists": cached[0],
                    "jid": f"{formatted}@s.whatsapp.net",
                    "phone": formatted,
                    "formattedPhone": formatted,
                    "verified_live": True,
                    "cached": True,
                }
            client = rt.client if rt.connection_state == "CONNECTED" else None

        if client is None:
            return {
                "exists": 10 <= len(formatted) <= 15,
                "jid": f"{formatted}@s.whatsapp.net",
                "phone": formatted,
                "formattedPhone": formatted,
                "verified_live": False,
                "reason": "Instancia desconectada (validación solo de formato)",
            }

        try:
            loop = asyncio.get_running_loop()
            results = await loop.run_in_executor(None, lambda: client.is_on_whatsapp(formatted))
            exists = False
            jid_str = f"{formatted}@s.whatsapp.net"
            verified_name = None
            if results:
                first = results[0]
                exists = bool(getattr(first, "IsIn", False))
                if getattr(first, "JID", None) and first.JID.User:
                    jid_str = f"{first.JID.User}@{first.JID.Server or 's.whatsapp.net'}"
                if getattr(first, "VerifiedName", None):
                    verified_name = str(first.VerifiedName)

            with rt.lock:
                rt.number_check_cache[formatted] = (exists, now_ts)

            return {
                "exists": exists,
                "jid": jid_str,
                "phone": formatted,
                "formattedPhone": formatted,
                "verified_live": True,
                "verified_name": verified_name,
            }
        except Exception as e:
            logger.warning(f"[WA {rt.instance_name}] Error en is_on_whatsapp({formatted}): {e}")
            return {
                "exists": True,
                "jid": f"{formatted}@s.whatsapp.net",
                "phone": formatted,
                "formattedPhone": formatted,
                "verified_live": False,
                "error": str(e),
            }

    async def send_text_humanized(
        self,
        instance_name: str,
        to: str,
        message: str,
        country_code: str = "+58",
        variables: Optional[Dict[str, Any]] = None,
        simulate_typing: bool = True,
        typing_min_sec: float = 2.0,
        typing_max_sec: float = 6.0,
        verify_number: bool = True,
        anti_fingerprint: bool = True,
        enforce_cooldown: bool = True,
    ) -> Dict[str, Any]:
        """
        Despacha un mensaje de texto directo por el motor Python (Neonize) con:
        1. Normalización + Spintax + Variables + variación anti-fingerprint.
        2. Verificación opcional `is_on_whatsapp` para evitar envíos a números inexistentes.
        3. Presencia ONLINE -> simulación real 'escribiendo...' (COMPOSING) proporcional al texto -> PAUSED.
        4. Envío nativo y registro del ID para confirmación de entrega/lectura.
        """
        rt = self._get_or_create_runtime(instance_name)
        formatted = format_phone_number(to, country_code)

        if not formatted or len(formatted) < 10:
            return {"success": False, "error": f"Número telefónico inválido: {to}"}

        with rt.lock:
            if rt.connection_state == "BANNED_COOLDOWN":
                return {
                    "success": False,
                    "error": "Circuit Breaker Anti-Ban activo: instancia en pausa preventiva.",
                }
            if rt.connection_state != "CONNECTED" or rt.client is None:
                return {
                    "success": False,
                    "error": f"La instancia '{rt.instance_name}' no está conectada a WhatsApp. Escanea el QR primero.",
                }
            client = rt.client

        # Procesar Spintax y variables
        processed_msg = parse_spintax(message)
        if variables:
            processed_msg = replace_variables(processed_msg, variables)
        if anti_fingerprint:
            processed_msg = apply_anti_fingerprint_variance(processed_msg)

        # Protección contra duplicados accidentales al mismo número en < 45 segundos
        msg_hash = hashlib.sha256(f"{formatted}:{processed_msg.strip()}".encode()).hexdigest()[:16]
        now_ts = time.time()
        if enforce_cooldown:
            with rt.lock:
                # Limpiar registros viejos
                expired = [k for k, ts in rt.recent_sends.items() if now_ts - ts > 60]
                for k in expired:
                    rt.recent_sends.pop(k, None)
                if msg_hash in rt.recent_sends:
                    return {
                        "success": False,
                        "error": "Bloqueo Anti-Duplicado: mensaje idéntico enviado recientemente al mismo contacto.",
                    }

        # Verificación real en WhatsApp antes de enviar
        if verify_number:
            chk = await self.check_number(instance_name, formatted, country_code=country_code)
            if chk.get("verified_live") and not chk.get("exists"):
                return {
                    "success": False,
                    "error": f"El número +{formatted} no tiene cuenta activa en WhatsApp (envío bloqueado por Anti-Ban).",
                    "final_message": processed_msg,
                }

        jid = build_jid(formatted)
        loop = asyncio.get_running_loop()
        typing_elapsed = 0.0

        try:
            # 1. Presencia disponible (humano abre WhatsApp)
            try:
                await loop.run_in_executor(None, lambda: client.send_presence(Presence.AVAILABLE))
            except Exception:
                pass

            # Micro-pausa humana al abrir el chat
            await asyncio.sleep(random.uniform(0.35, 0.85))

            # 2. Simulación real de "Escribiendo..."
            if simulate_typing:
                with rt.lock:
                    rt.currently_typing_to = formatted
                try:
                    await loop.run_in_executor(
                        None,
                        lambda: client.send_chat_presence(
                            jid,
                            ChatPresence.CHAT_PRESENCE_COMPOSING,
                            ChatPresenceMedia.CHAT_PRESENCE_MEDIA_TEXT,
                        ),
                    )
                    # Calcular duración orgánica según cantidad de caracteres (~38-52 chars/s)
                    chars = max(12, len(processed_msg))
                    organic = (chars / random.uniform(35.0, 52.0)) + random.uniform(0.5, 1.3)
                    lo = max(1.0, float(typing_min_sec or 2.0))
                    hi = max(lo + 0.5, float(typing_max_sec or 6.0))
                    typing_duration = max(lo, min(hi, organic))

                    await asyncio.sleep(typing_duration)
                    typing_elapsed = round(typing_duration, 2)

                    await loop.run_in_executor(
                        None,
                        lambda: client.send_chat_presence(
                            jid,
                            ChatPresence.CHAT_PRESENCE_PAUSED,
                            ChatPresenceMedia.CHAT_PRESENCE_MEDIA_TEXT,
                        ),
                    )
                    await asyncio.sleep(random.uniform(0.2, 0.5))
                except Exception as presence_err:
                    logger.debug(f"[WA {rt.instance_name}] Aviso simulando typing: {presence_err}")
                finally:
                    with rt.lock:
                        rt.currently_typing_to = None

            # 3. Enviar mensaje real
            resp = await loop.run_in_executor(
                None, lambda: client.send_message(jid, processed_msg)
            )
            ext_id = str(getattr(resp, "ID", "") or f"py_{int(time.time() * 1000)}")

            with rt.lock:
                rt.consecutive_failures = 0
                rt.last_sent_at = time.time()
                rt.sent_timestamps_hour.append(rt.last_sent_at)
                rt.recent_sends[msg_hash] = rt.last_sent_at
                rt.last_sync = datetime.now()

            return {
                "success": True,
                "message_id": ext_id,
                "final_message": processed_msg,
                "formatted_phone": formatted,
                "typing_seconds": typing_elapsed,
                "engine": "python-neonize",
            }
        except Exception as e:
            err_str = str(e)
            logger.error(f"[WA {rt.instance_name}] Error enviando a +{formatted}: {err_str}")
            with rt.lock:
                rt.currently_typing_to = None
                rt.consecutive_failures += 1
                rt.last_error = err_str
                # Circuit Breaker: 3 fallos consecutivos pausan la cola para proteger el número
                if rt.consecutive_failures >= 3:
                    rt.queue_paused = True
                    rt.pause_reason = (
                        f"Circuit Breaker activado tras {rt.consecutive_failures} fallos consecutivos: {err_str[:120]}"
                    )
            return {
                "success": False,
                "error": err_str,
                "final_message": processed_msg,
                "formatted_phone": formatted,
            }

    def get_hourly_count(self, instance_name: str) -> int:
        rt = self._get_or_create_runtime(instance_name)
        cutoff = time.time() - 3600
        with rt.lock:
            while rt.sent_timestamps_hour and rt.sent_timestamps_hour[0] < cutoff:
                rt.sent_timestamps_hour.popleft()
            return len(rt.sent_timestamps_hour)

    def set_queue_paused(self, instance_name: str, paused: bool, reason: Optional[str] = None) -> None:
        rt = self._get_or_create_runtime(instance_name)
        with rt.lock:
            rt.queue_paused = paused
            rt.pause_reason = reason if paused else None
            if not paused:
                rt.consecutive_failures = 0
                if rt.connection_state == "BANNED_COOLDOWN":
                    rt.connection_state = "DISCONNECTED"

    async def diagnostic(self, instance_name: str) -> Dict[str, Any]:
        start_time = time.perf_counter()
        rt = self._get_or_create_runtime(instance_name)
        session_size_kb = 0.0
        if os.path.exists(rt.db_path):
            session_size_kb = round(os.path.getsize(rt.db_path) / 1024, 1)

        mem_label = "Nativo Python"
        if psutil:
            try:
                proc = psutil.Process(os.getpid())
                rss_mb = round(proc.memory_info().rss / (1024 * 1024), 1)
                mem_label = f"{rss_mb} MB RSS (Proceso Python)"
            except Exception:
                pass

        with rt.lock:
            state = rt.connection_state
            thread_alive = bool(rt.thread and rt.thread.is_alive())
            phone = rt.phone_number
            paused = rt.queue_paused

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return {
            "service_online": True,
            "latency_ms": latency_ms,
            "memory_usage": mem_label,
            "api_url": "python://local (Neonize / WhatsMeow)",
            "instance": rt.instance_name,
            "socket_state": state,
            "thread_alive": thread_alive,
            "phone_number": phone,
            "session_size_kb": session_size_kb,
            "queue_paused": paused,
            "active_instances_count": len(self._instances),
            "timestamp": datetime.now().isoformat(),
        }

    async def auto_reconnect_saved_sessions(self) -> None:
        """
        Al iniciar FastAPI, reconecta automáticamente las sesiones SQLite existentes
        que correspondan a empresas o sucursales marcadas como activas en BD.
        """
        try:
            from sqlalchemy.future import select
            from app.core.database import AsyncSessionLocal
            from app.models.empresa import Empresa
            from app.models.sucursal import Sucursal

            to_reconnect: List[Tuple[str, Optional[str]]] = []

            async with AsyncSessionLocal() as db:
                emps = (await db.execute(select(Empresa))).scalars().all()
                for emp in emps:
                    inst = emp.whatsapp_instance or f"empresa_{emp.id}"
                    if self.has_persisted_session(inst):
                        to_reconnect.append((inst, emp.whatsapp_proxy_url))

                sucs = (await db.execute(select(Sucursal))).scalars().all()
                for suc in sucs:
                    inst = suc.whatsapp_instance or f"sucursal_{suc.empresa_id}_{suc.id}"
                    if self.has_persisted_session(inst):
                        to_reconnect.append((inst, suc.whatsapp_proxy_url))

            for inst, proxy in to_reconnect:
                logger.info(f"🔄 [WA ENGINE] Reconectando sesión guardada: {inst}")
                rt = self._get_or_create_runtime(inst)
                self._start_client_thread(rt, proxy_url=proxy)
        except Exception as e:
            logger.warning(f"[WA ENGINE] Aviso en auto-reconexión de sesiones: {e}")

    def shutdown_all(self) -> None:
        """Cierra ordenadamente todos los sockets Neonize al apagar el servidor."""
        with self._global_lock:
            runtimes = list(self._instances.values())
        for rt in runtimes:
            try:
                with rt.lock:
                    client = rt.client
                if client:
                    client.stop()
            except Exception:
                pass


# Instancia Singleton global del motor Python
whatsapp_engine = WhatsAppPythonEngine()
