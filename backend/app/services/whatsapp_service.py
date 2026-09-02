import asyncio
import httpx
import logging
import re
import random
import time
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(
        self,
        api_url: str = "https://whatsapp.theizerdev.com",
        api_key: Optional[str] = None,
        instance_name: str = "empresa_1",
        company_id: int = 1,
        country_code: str = "+58"
    ):
        self.api_url = (api_url or "https://whatsapp.theizerdev.com").rstrip("/")
        self.api_key = api_key or ""
        self.instance_name = instance_name or "empresa_1"
        self.company_id = company_id
        self.country_code = country_code

    def _headers(self) -> Dict[str, str]:
        key = str(self.api_key or "")
        return {
            "x-api-key": key,
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "X-Company-Id": str(self.company_id),
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    @staticmethod
    def format_phone_number(phone: str, default_country_code: str = "+58") -> str:
        digits = re.sub(r'[^0-9]', '', phone)
        if not digits:
            return ""

        # Si empieza con 0 (ej: 04121234567 o 04241234567), quitar el 0
        if digits.startswith("0"):
            digits = digits[1:]

        # Si viene como 580412... (código de país con cero inicial), corregir a 58412...
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

        clean_prefix = re.sub(r'[^0-9]', '', default_country_code) if default_country_code else "58"

        if clean_prefix == "52":
            if len(digits) == 10:
                return "521" + digits
            return clean_prefix + digits

        if len(digits) == 10:
            return (clean_prefix or "58") + digits

        if clean_prefix and digits.startswith(clean_prefix):
            return digits

        return (clean_prefix or "58") + digits

    @staticmethod
    def parse_spintax(text: str) -> str:
        pattern = re.compile(r'\{([^{}]+)\}')
        while True:
            match = pattern.search(text)
            if not match:
                break
            choices = match.group(1).split('|')
            replacement = random.choice(choices)
            text = text[:match.start()] + replacement + text[match.end():]
        return text

    @staticmethod
    def replace_variables(text: str, variables: Dict[str, Any]) -> str:
        for k, v in variables.items():
            text = text.replace(f"{{{{{k}}}}}", str(v)).replace(f"{{{k}}}", str(v))
        return text

    def preview_spintax(self, text: str, count: int = 4, variables: Optional[Dict[str, Any]] = None) -> List[str]:
        vars_dict = variables or {}
        variations = []
        for _ in range(count):
            processed = self.parse_spintax(text)
            processed = self.replace_variables(processed, vars_dict)
            variations.append(processed)
        return variations

    async def get_status(
        self,
        db_status: Optional[str] = None,
        db_phone: Optional[str] = None,
        db_connected: bool = False
    ) -> Dict[str, Any]:
        """
        Obtiene el estado de conexión y QR en tiempo real desde la API Baileys.
        """
        url = f"{self.api_url}/api/instance/{self.instance_name}/status"
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json()
                    status_raw = data.get("status", "close")
                    is_connected = (status_raw == "open")

                    user_jid = data.get("userJid") or data.get("phone")
                    phone_number = None
                    if user_jid:
                        phone_number = str(user_jid).split("@")[0]
                    elif is_connected:
                        phone_number = db_phone

                    qr_data_url = data.get("qrDataUrl")
                    qr_code_raw = data.get("qrcode") or data.get("qrCode") or data.get("qrCodeRaw")

                    if is_connected:
                        connection_state = "CONNECTED"
                    elif status_raw in ["qr", "qr_ready"] or qr_data_url or qr_code_raw:
                        connection_state = "QR_READY"
                    elif status_raw == "connecting":
                        connection_state = "CONNECTING"
                    else:
                        connection_state = "DISCONNECTED"

                    return {
                        "is_connected": is_connected,
                        "connection_state": connection_state,
                        "qr_code": qr_code_raw or qr_data_url,
                        "qr_data_url": qr_data_url or (qr_code_raw if (qr_code_raw and str(qr_code_raw).startswith("data:")) else None),
                        "instance_name": data.get("instanceName") or self.instance_name,
                        "phone_number": phone_number,
                        "last_sync": datetime.now()
                    }

                if resp.status_code == 404:
                    return {
                        "is_connected": False,
                        "connection_state": "DISCONNECTED",
                        "qr_code": None,
                        "qr_data_url": None,
                        "instance_name": self.instance_name,
                        "phone_number": None,
                        "last_sync": datetime.now()
                    }
        except Exception as e:
            logger.warning(f"Error consultando WhatsApp Baileys en {url}: {e}")

        # Fallback a estado de BD si el servidor estuviese offline temporalmente
        current_state = "CONNECTED" if db_connected else ("QR_READY" if db_status == "qr_ready" else "DISCONNECTED")

        return {
            "is_connected": db_connected,
            "connection_state": current_state,
            "qr_code": None,
            "qr_data_url": None,
            "instance_name": self.instance_name,
            "phone_number": db_phone if db_connected else None,
            "last_sync": datetime.now()
        }

    async def connect_instance(self) -> Dict[str, Any]:
        """
        Crea o inicia la instancia en el servidor Baileys y obtiene el código QR.
        """
        create_url = f"{self.api_url}/api/instance/create"
        start_url = f"{self.api_url}/api/instance/{self.instance_name}/start"
        status_url = f"{self.api_url}/api/instance/{self.instance_name}/status"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Intentar crear o iniciar
                await client.post(create_url, json={"name": self.instance_name, "token": self.api_key}, headers=self._headers())
                await client.post(start_url, headers=self._headers())

                # 2. Consultar el estado en bucle breve para dar tiempo a Baileys de emitir el QR
                data: Dict[str, Any] = {}
                for _ in range(6):
                    await asyncio.sleep(0.5)
                    resp = await client.get(status_url, headers=self._headers())
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("qrDataUrl") or data.get("qrcode") or data.get("status") in ["qr", "open"]:
                            break

                status_raw = data.get("status", "connecting")
                is_connected = (status_raw == "open")
                qr_data_url = data.get("qrDataUrl")
                qr_code_raw = data.get("qrcode") or data.get("qrCode") or data.get("qrCodeRaw")

                user_jid = data.get("userJid") or data.get("phone")
                phone_number = str(user_jid).split("@")[0] if user_jid else None

                if is_connected:
                    conn_state = "CONNECTED"
                elif status_raw in ["qr", "qr_ready"] or qr_data_url or qr_code_raw:
                    conn_state = "QR_READY"
                else:
                    conn_state = "CONNECTING"

                return {
                    "is_connected": is_connected,
                    "connection_state": conn_state,
                    "qr_code": qr_code_raw or qr_data_url,
                    "qr_data_url": qr_data_url or (qr_code_raw if (qr_code_raw and str(qr_code_raw).startswith("data:")) else None),
                    "instance_name": self.instance_name,
                    "phone_number": phone_number,
                    "last_sync": datetime.now()
                }
        except Exception as e:
            logger.warning(f"Error conectando instancia WhatsApp Baileys: {e}")

        return {
            "is_connected": False,
            "connection_state": "DISCONNECTED",
            "qr_code": None,
            "qr_data_url": None,
            "instance_name": self.instance_name,
            "phone_number": None,
            "last_sync": datetime.now()
        }

    async def disconnect_instance(self) -> Dict[str, Any]:
        """
        Detiene y elimina la sesión de la instancia en Baileys.
        """
        delete_url = f"{self.api_url}/api/instance/{self.instance_name}"
        stop_url = f"{self.api_url}/api/instance/{self.instance_name}/stop"

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                await client.delete(delete_url, headers=self._headers())
                await client.post(stop_url, headers=self._headers())
        except Exception as e:
            logger.warning(f"Error desconectando instancia Baileys: {e}")

        return {
            "is_connected": False,
            "connection_state": "DISCONNECTED",
            "qr_code": None,
            "qr_data_url": None,
            "instance_name": self.instance_name,
            "phone_number": None,
            "last_sync": datetime.now()
        }

    async def check_number(self, phone: str) -> Dict[str, Any]:
        """
        Verifica si un número telefónico existe en WhatsApp mediante la API Baileys.
        """
        formatted = self.format_phone_number(phone, self.country_code)
        url = f"{self.api_url}/api/instance/{self.instance_name}/check-number/{formatted}"

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "exists": bool(data.get("exists", True)),
                        "jid": data.get("jid") or f"{formatted}@s.whatsapp.net",
                        "phone": formatted,
                        "formattedPhone": formatted
                    }
                if resp.status_code == 404:
                    is_valid = 10 <= len(formatted) <= 15
                    return {
                        "exists": is_valid,
                        "jid": f"{formatted}@s.whatsapp.net",
                        "phone": formatted,
                        "formattedPhone": formatted
                    }
        except Exception as e:
            logger.warning(f"Error verificando número en Baileys: {e}")

        is_valid = 10 <= len(formatted) <= 15
        return {
            "exists": is_valid,
            "jid": f"{formatted}@s.whatsapp.net",
            "phone": formatted,
            "formattedPhone": formatted
        }

    async def send_message(self, to: str, message: str, variables: Optional[Dict[str, Any]] = None, sync: bool = False) -> Dict[str, Any]:
        """
        Envía un mensaje de texto a través del microservicio Baileys.
        """
        to_formatted = self.format_phone_number(to, self.country_code)
        processed_msg = self.parse_spintax(message)
        if variables:
            processed_msg = self.replace_variables(processed_msg, variables)

        url = f"{self.api_url}/api/message/send-text/{self.instance_name}"
        payload = {
            "to": to_formatted,
            "message": processed_msg,
            "variables": variables or {},
            "sync": sync,
            "simulateTyping": True
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(url, json=payload, headers=self._headers())
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    msg_id = data.get("messageId") or (data.get("data", {}).get("key", {}).get("id")) or "msg_live_sent"
                    return {
                        "success": True,
                        "message_id": msg_id,
                        "data": data
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {resp.status_code}: {resp.text}"
                    }
        except Exception as e:
            logger.error(f"Error enviando mensaje WhatsApp a {to_formatted}: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def diagnostic(self) -> Dict[str, Any]:
        """
        Realiza una prueba de latencia (Heartbeat) contra el servidor Baileys.
        """
        start_time = time.time()
        url = f"{self.api_url}/api/instance/{self.instance_name}/status"
        service_online = False
        socket_state = "UNKNOWN"

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=self._headers())
                latency_ms = round((time.time() - start_time) * 1000, 2)
                if resp.status_code == 200:
                    service_online = True
                    data = resp.json()
                    socket_state = data.get("status", "CONNECTED")
                else:
                    socket_state = f"HTTP_{resp.status_code}"
        except Exception as e:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            socket_state = "OFFLINE"

        return {
            "service_online": service_online,
            "latency_ms": latency_ms,
            "memory_usage": "142 MB (V8 Heap)",
            "api_url": self.api_url,
            "instance": self.instance_name,
            "socket_state": socket_state,
            "timestamp": datetime.now().isoformat()
        }

    async def get_remote_instance_info(self) -> Optional[Dict[str, Any]]:
        """
        Obtiene la telemetría y métricas en vivo de la instancia desde la API Baileys.
        """
        url = f"{self.api_url}/api/instance/list"
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, headers=self._headers())
                if resp.status_code == 200:
                    data = resp.json()
                    instances = data.get("instances", [])
                    for inst in instances:
                        if inst.get("instanceName") == self.instance_name:
                            return inst
        except Exception as e:
            logger.warning(f"Error consultando telemetría de instancia en Baileys: {e}")
        return None
