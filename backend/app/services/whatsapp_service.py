"""
Fachada compatible de WhatsAppService sobre el Motor Nativo en Python (Neonize).
Mantiene compatibilidad total con auth.py, citas, telemedicina y scheduler,
eliminando por completo intermediarios HTTP y servidores Node.js/Baileys externos.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.services.whatsapp_python_engine import (
    format_phone_number,
    parse_spintax,
    replace_variables,
    sanitize_instance_name,
    whatsapp_engine,
)

logger = logging.getLogger(__name__)


class WhatsAppService:
    def __init__(
        self,
        api_url: str = "python://local",
        api_key: Optional[str] = None,
        instance_name: str = "empresa_1",
        company_id: int = 1,
        country_code: str = "+58",
        proxy_url: Optional[str] = None,
        simulate_typing: bool = True,
        typing_min_sec: float = 2.0,
        typing_max_sec: float = 6.0,
        verify_number: bool = True,
    ):
        self.api_url = "python://local"
        self.api_key = api_key or ""
        self.instance_name = sanitize_instance_name(instance_name or f"empresa_{company_id}")
        self.company_id = company_id
        self.country_code = country_code or "+58"
        self.proxy_url = proxy_url
        self.simulate_typing = simulate_typing
        self.typing_min_sec = typing_min_sec
        self.typing_max_sec = typing_max_sec
        self.verify_number = verify_number

    @staticmethod
    def format_phone_number(phone: str, default_country_code: str = "+58") -> str:
        return format_phone_number(phone, default_country_code)

    @staticmethod
    def parse_spintax(text: str) -> str:
        return parse_spintax(text)

    @staticmethod
    def replace_variables(text: str, variables: Dict[str, Any]) -> str:
        return replace_variables(text, variables)

    def preview_spintax(
        self, text: str, count: int = 4, variables: Optional[Dict[str, Any]] = None
    ) -> List[str]:
        vars_dict = variables or {}
        variations = []
        for _ in range(count):
            processed = parse_spintax(text)
            processed = replace_variables(processed, vars_dict)
            variations.append(processed)
        return variations

    async def get_status(
        self,
        db_status: Optional[str] = None,
        db_phone: Optional[str] = None,
        db_connected: bool = False,
    ) -> Dict[str, Any]:
        return whatsapp_engine.get_status(self.instance_name)

    async def connect_instance(self) -> Dict[str, Any]:
        return await whatsapp_engine.connect_instance(
            self.instance_name,
            proxy_url=self.proxy_url,
            wait_seconds=10.0,
        )

    async def pair_phone(self, phone: str) -> Dict[str, Any]:
        return await whatsapp_engine.pair_phone(
            self.instance_name,
            phone=phone,
            country_code=self.country_code,
            proxy_url=self.proxy_url,
        )

    async def disconnect_instance(self, clear_session: bool = True) -> Dict[str, Any]:
        return await whatsapp_engine.disconnect_instance(
            self.instance_name, clear_session=clear_session
        )

    async def check_number(self, phone: str) -> Dict[str, Any]:
        return await whatsapp_engine.check_number(
            self.instance_name, phone, country_code=self.country_code
        )

    async def send_message(
        self,
        to: str,
        message: str,
        variables: Optional[Dict[str, Any]] = None,
        sync: bool = False,
        simulate_typing: Optional[bool] = None,
        verify_number: Optional[bool] = None,
    ) -> Dict[str, Any]:
        use_typing = self.simulate_typing if simulate_typing is None else bool(simulate_typing)
        use_verify = self.verify_number if verify_number is None else bool(verify_number)
        return await whatsapp_engine.send_text_humanized(
            instance_name=self.instance_name,
            to=to,
            message=message,
            country_code=self.country_code,
            variables=variables,
            simulate_typing=use_typing,
            typing_min_sec=self.typing_min_sec,
            typing_max_sec=self.typing_max_sec,
            verify_number=use_verify,
            anti_fingerprint=True,
            enforce_cooldown=not sync,
        )

    async def send_document(
        self,
        to: str,
        file_bytes: Any,
        filename: str,
        caption: Optional[str] = None,
        mimetype: str = "application/pdf",
        simulate_typing: bool = True,
    ) -> Dict[str, Any]:
        """Despacha un documento binario (PDF/imagen) vía el motor nativo de WhatsApp."""
        return await whatsapp_engine.send_document_humanized(
            instance_name=self.instance_name,
            to=to,
            file_bytes=file_bytes,
            filename=filename,
            caption=caption,
            country_code=self.country_code,
            mimetype=mimetype,
            simulate_typing=simulate_typing,
        )

    async def diagnostic(self) -> Dict[str, Any]:
        return await whatsapp_engine.diagnostic(self.instance_name)

    async def get_remote_instance_info(self) -> Optional[Dict[str, Any]]:
        status = whatsapp_engine.get_status(self.instance_name)
        return {
            "instanceName": self.instance_name,
            "status": "open" if status.get("is_connected") else "close",
            "hourlySentCount": whatsapp_engine.get_hourly_count(self.instance_name),
        }
