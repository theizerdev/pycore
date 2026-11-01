import hashlib
import hmac
import logging
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
from jose import jwt

from app.core.config import settings

logger = logging.getLogger(__name__)


class JitsiService:
    """
    Motor central de Jitsi Meet para MediSoft WorkSpace (Telemedicina & Colaboración Clínica).
    Soporta 3 modos de despliegue:
      - 'public': Instancia comunitaria rápida (ej. meet.jit.si) sin JWT.
      - 'self_hosted': Nodo propio Jitsi Docker (ej. meet.theizerdev.com) con autenticación JWT HS256.
      - 'jaas': 8x8 Jitsi as a Service (8x8.vc) con autenticación JWT RS256 y vpaas-magic-cookie.
    """

    DEFAULT_DOMAIN = "meet.jit.si"
    DEFAULT_PREFIX = "medisoft"

    def __init__(
        self,
        active: bool = True,
        provider: str = "public",
        domain: Optional[str] = None,
        app_id: Optional[str] = None,
        jwt_secret: Optional[str] = None,
        key_id: Optional[str] = None,
        room_prefix: Optional[str] = None,
        lobby_enabled: bool = True,
        recording_enabled: bool = False,
        e2ee_enabled: bool = False,
        requiere_pago: bool = True,
        empresa_id: int = 1,
    ):
        self.active = active
        self.provider = (provider or "public").strip().lower()
        if self.provider not in ("public", "self_hosted", "jaas"):
            self.provider = "public"

        raw_domain = domain or ("8x8.vc" if self.provider == "jaas" else self.DEFAULT_DOMAIN)
        self.domain = self.normalize_domain(raw_domain)
        self.app_id = (app_id or "").strip() or None
        self.jwt_secret = (jwt_secret or "").strip() or None
        self.key_id = (key_id or "").strip() or None
        self.room_prefix = self.sanitize_slug(room_prefix or self.DEFAULT_PREFIX) or self.DEFAULT_PREFIX
        self.lobby_enabled = bool(lobby_enabled)
        self.recording_enabled = bool(recording_enabled)
        self.e2ee_enabled = bool(e2ee_enabled)
        self.requiere_pago = bool(requiere_pago)
        self.empresa_id = empresa_id

    @classmethod
    def from_empresa(cls, empresa: Any) -> "JitsiService":
        return cls(
            active=getattr(empresa, "jitsi_active", True) if getattr(empresa, "jitsi_active", None) is not None else True,
            provider=getattr(empresa, "jitsi_provider", "public") or "public",
            domain=getattr(empresa, "jitsi_domain", "meet.jit.si") or "meet.jit.si",
            app_id=getattr(empresa, "jitsi_app_id", None),
            jwt_secret=getattr(empresa, "jitsi_jwt_secret", None),
            key_id=getattr(empresa, "jitsi_key_id", None),
            room_prefix=getattr(empresa, "jitsi_room_prefix", "medisoft") or "medisoft",
            lobby_enabled=getattr(empresa, "jitsi_lobby_enabled", True) if getattr(empresa, "jitsi_lobby_enabled", None) is not None else True,
            recording_enabled=bool(getattr(empresa, "jitsi_recording_enabled", False)),
            e2ee_enabled=bool(getattr(empresa, "jitsi_e2ee_enabled", False)),
            requiere_pago=getattr(empresa, "telemedicina_requiere_pago", True) if getattr(empresa, "telemedicina_requiere_pago", None) is not None else True,
            empresa_id=getattr(empresa, "id", 1) or 1,
        )

    @staticmethod
    def normalize_domain(raw: str) -> str:
        cleaned = (raw or "").strip()
        cleaned = re.sub(r"^https?://", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.split("/")[0].strip().lower()
        return cleaned or JitsiService.DEFAULT_DOMAIN

    @staticmethod
    def sanitize_slug(value: str) -> str:
        cleaned = re.sub(r"[^a-zA-Z0-9_-]", "-", (value or "").strip())
        cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-").lower()
        return cleaned

    @staticmethod
    def get_frontend_base_url() -> str:
        return (getattr(settings, "FRONTEND_URL", None) or "https://medisoft.theizerdev.com").rstrip("/")

    @classmethod
    def build_teleconsulta_url(cls, token: Optional[str]) -> Optional[str]:
        if not token:
            return None
        return f"{cls.get_frontend_base_url()}/teleconsulta/{token}"

    @classmethod
    def ensure_cita_credentials(cls, cita: Any, empresa: Any = None) -> None:
        """
        Asegura que una cita de modalidad 'telemedicina' cuente con token único
        de acceso público y un identificador determinístico/privado de sala Jitsi.
        """
        if (getattr(cita, "modalidad", "presencial") or "presencial").lower() != "telemedicina":
            return

        if not getattr(cita, "teleconsulta_token", None):
            cita.teleconsulta_token = secrets.token_hex(16)

        if not getattr(cita, "sala_virtual_id", None):
            svc = cls.from_empresa(empresa) if empresa is not None else cls(empresa_id=getattr(cita, "empresa_id", 1) or 1)
            cita.sala_virtual_id = svc.generate_room_slug(
                context_type="teleconsulta",
                reference_id=getattr(cita, "id", None),
            )

    @staticmethod
    def is_cita_authorized_for_teleconsulta(cita: Any, empresa: Any = None) -> bool:
        """
        Verifica si la cita cumple con la política financiera de telemedicina de la empresa.
        """
        requiere_pago = True
        if empresa is not None and getattr(empresa, "telemedicina_requiere_pago", None) is not None:
            requiere_pago = bool(empresa.telemedicina_requiere_pago)

        if not requiere_pago:
            return True

        precio = float(getattr(cita, "precio_estimado", 0.0) or 0.0)
        if precio <= 0:
            return True

        estado_pago = (getattr(cita, "estado_pago", "pendiente") or "pendiente").lower()
        return estado_pago in ("pagado", "aseguradora", "exonerado")

    def generate_room_slug(
        self,
        context_type: str = "workspace",
        reference_id: Optional[int] = None,
        custom_room: Optional[str] = None,
    ) -> str:
        """
        Genera un identificador de sala seguro, limpio e impredecible para externos.
        Si se provee `reference_id` (ej. cita_id), deriva un hash determinístico HMAC
        para que médico y paciente converjan siempre en la misma sala privada.
        """
        if custom_room and custom_room.strip():
            slug = self.sanitize_slug(custom_room)
            if slug:
                return slug

        ctx = self.sanitize_slug(context_type or "workspace") or "workspace"
        if reference_id is not None:
            seed = f"emp:{self.empresa_id}|ctx:{ctx}|ref:{reference_id}".encode("utf-8")
            secret_bytes = (self.jwt_secret or settings.SECRET_KEY).encode("utf-8")
            digest = hmac.new(secret_bytes, seed, hashlib.sha256).hexdigest()[:12]
            return f"{self.room_prefix}-e{self.empresa_id}-{ctx}-{reference_id}-{digest}"

        rand_token = secrets.token_hex(5)
        return f"{self.room_prefix}-e{self.empresa_id}-{ctx}-{rand_token}"

    def get_external_api_url(self) -> str:
        if self.provider == "jaas" and self.app_id:
            return f"https://{self.domain}/{self.app_id}/external_api.js"
        return f"https://{self.domain}/external_api.js"

    def sign_jwt(
        self,
        room_slug: str,
        user_id: str,
        display_name: str,
        email: Optional[str] = None,
        avatar_url: Optional[str] = None,
        is_moderator: bool = False,
        expires_minutes: int = 180,
    ) -> tuple[Optional[str], Optional[str]]:
        """
        Firma el token JWT según el proveedor configurado:
          - self_hosted -> HS256 compatible con Prosody Jitsi Token Auth
          - jaas -> RS256 compatible con 8x8 JaaS
          - public -> None (no requiere firma)
        Retorna (jwt_token, warning_message).
        """
        if self.provider == "public":
            return None, None

        now = datetime.now(timezone.utc)
        iat = int(now.timestamp())
        nbf = int((now - timedelta(seconds=15)).timestamp())
        exp = int((now + timedelta(minutes=expires_minutes)).timestamp())

        if self.provider == "self_hosted":
            if not self.app_id or not self.jwt_secret:
                return (
                    None,
                    "Modo Servidor Propio seleccionado sin App ID o JWT Secret; la sala se abrirá sin token firmado.",
                )

            payload: Dict[str, Any] = {
                "aud": "jitsi",
                "iss": self.app_id,
                "sub": self.domain,
                "room": room_slug,
                "iat": iat,
                "nbf": nbf,
                "exp": exp,
                "moderator": bool(is_moderator),
                "context": {
                    "user": {
                        "id": str(user_id),
                        "name": display_name,
                        "email": email or "",
                        "avatar": avatar_url or "",
                        "moderator": bool(is_moderator),
                        "affiliation": "owner" if is_moderator else "member",
                    },
                    "features": {
                        "recording": bool(is_moderator and self.recording_enabled),
                        "livestreaming": False,
                        "transcription": False,
                        "outbound-call": False,
                        "screen-sharing": True,
                    },
                },
            }
            try:
                token = jwt.encode(payload, self.jwt_secret, algorithm="HS256")
                return token, None
            except Exception as exc:
                logger.error(f"Error firmando JWT HS256 para Jitsi: {exc}")
                return None, f"No se pudo firmar el JWT HS256: {exc}"

        if self.provider == "jaas":
            if not self.app_id or not self.jwt_secret:
                return (
                    None,
                    "Modo 8x8 JaaS requiere App ID (vpaas-magic-cookie-...) y Private Key PEM.",
                )

            headers: Dict[str, Any] = {}
            if self.key_id:
                headers["kid"] = self.key_id

            payload_jaas: Dict[str, Any] = {
                "aud": "jitsi",
                "iss": "chat",
                "sub": self.app_id,
                "room": "*",
                "iat": iat,
                "nbf": nbf,
                "exp": exp,
                "context": {
                    "user": {
                        "id": str(user_id),
                        "name": display_name,
                        "email": email or "",
                        "avatar": avatar_url or "",
                        "moderator": "true" if is_moderator else "false",
                    },
                    "features": {
                        "recording": "true" if (is_moderator and self.recording_enabled) else "false",
                        "livestreaming": "false",
                        "transcription": "false",
                        "outbound-call": "false",
                    },
                },
            }
            try:
                token = jwt.encode(
                    payload_jaas,
                    self.jwt_secret,
                    algorithm="RS256",
                    headers=headers or None,
                )
                return token, None
            except Exception as exc:
                logger.error(f"Error firmando JWT RS256 para JaaS: {exc}")
                return None, f"Clave privada PEM inválida para JaaS RS256: {exc}"

        return None, None

    def build_session(
        self,
        user_id: str,
        display_name: str,
        email: Optional[str] = None,
        avatar_url: Optional[str] = None,
        is_moderator: bool = True,
        context_type: str = "workspace",
        reference_id: Optional[int] = None,
        custom_room: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Construye la configuración completa lista para montar JitsiMeetExternalAPI en el frontend.
        """
        room_slug = self.generate_room_slug(
            context_type=context_type,
            reference_id=reference_id,
            custom_room=custom_room,
        )
        full_room_name = (
            f"{self.app_id}/{room_slug}"
            if (self.provider == "jaas" and self.app_id)
            else room_slug
        )

        warnings: List[str] = []
        jwt_token, jwt_warning = self.sign_jwt(
            room_slug=room_slug,
            user_id=user_id,
            display_name=display_name,
            email=email,
            avatar_url=avatar_url,
            is_moderator=is_moderator,
        )
        if jwt_warning:
            warnings.append(jwt_warning)

        if self.provider == "public" and self.domain == "meet.jit.si":
            warnings.append(
                "Usando nodo público comunitario meet.jit.si: ideal para pruebas rápidas, "
                "pero en modo embebido (iframe) aplica límite de tiempo y puede solicitar autenticación al anfitrión. "
                "Para producción clínica continua se recomienda el modo Servidor Propio + JWT."
            )

        toolbar_doctor = [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "participants-pane",
            "tileview",
            "fullscreen",
            "settings",
            "videoquality",
            "hangup",
        ]
        if self.recording_enabled and is_moderator:
            toolbar_doctor.insert(-2, "recording")
        if is_moderator:
            toolbar_doctor.insert(-2, "security")

        toolbar_patient = [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "tileview",
            "fullscreen",
            "hangup",
        ]

        resolved_subject = subject or (
            "Cabina de Prueba — MediSoft WorkSpace"
            if context_type == "test"
            else "Teleconsulta Médica — MediSoft WorkSpace"
        )

        config_overwrite: Dict[str, Any] = {
            "startWithAudioMuted": False,
            "startWithVideoMuted": False,
            "prejoinPageEnabled": self.lobby_enabled,
            "prejoinConfig": {
                "enabled": self.lobby_enabled,
            },
            "disableDeepLinking": True,
            "defaultLanguage": "es",
            "subject": resolved_subject,
            "hideConferenceSubject": False,
            "enableNoisyMicDetection": True,
            "enableClosePage": False,
            "disableThirdPartyRequests": self.provider == "self_hosted",
            "toolbarButtons": toolbar_doctor if is_moderator else toolbar_patient,
        }

        interface_config_overwrite: Dict[str, Any] = {
            "SHOW_JITSI_WATERMARK": False,
            "SHOW_WATERMARK_FOR_GUESTS": False,
            "SHOW_BRAND_WATERMARK": False,
            "SHOW_POWERED_BY": False,
            "SHOW_PROMOTIONAL_CLOSE_PAGE": False,
            "MOBILE_APP_PROMO": False,
            "DISABLE_JOIN_LEAVE_NOTIFICATIONS": False,
            "DEFAULT_LOCAL_DISPLAY_NAME": display_name,
            "DEFAULT_REMOTE_DISPLAY_NAME": "Participante Clínico",
        }

        base_meeting_url = f"https://{self.domain}/{full_room_name}"
        meeting_url = f"{base_meeting_url}?jwt={jwt_token}" if jwt_token else base_meeting_url

        return {
            "active": self.active,
            "provider": self.provider,
            "domain": self.domain,
            "external_api_url": self.get_external_api_url(),
            "room_name": full_room_name,
            "room_slug": room_slug,
            "meeting_url": meeting_url,
            "jwt": jwt_token,
            "is_moderator": is_moderator,
            "subject": resolved_subject,
            "user_info": {
                "displayName": display_name,
                "email": email or "",
                "avatarURL": avatar_url or "",
            },
            "config_overwrite": config_overwrite,
            "interface_config_overwrite": interface_config_overwrite,
            "warnings": warnings,
        }

    async def diagnose(self) -> Dict[str, Any]:
        """
        Ejecuta diagnóstico real contra el servidor Jitsi configurado:
        1. Verifica disponibilidad HTTPS y descarga de `external_api.js`
        2. Mide latencia de red en milisegundos
        3. Valida configuración criptográfica JWT si aplica
        """
        api_script_url = self.get_external_api_url()
        start = time.perf_counter()
        script_reachable = False
        status_code: Optional[int] = None
        error_detail: Optional[str] = None

        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(api_script_url)
                status_code = resp.status_code
                body_preview = resp.text[:4000] if resp.text else ""
                script_reachable = resp.status_code == 200 and (
                    "JitsiMeetExternalAPI" in body_preview
                    or "external_api" in body_preview
                    or len(body_preview) > 200
                )
                if not script_reachable and resp.status_code != 200:
                    error_detail = f"HTTP {resp.status_code} al consultar {api_script_url}"
        except Exception as exc:
            error_detail = f"No se pudo conectar con {api_script_url}: {exc}"

        latency_ms = round((time.perf_counter() - start) * 1000, 1)

        # Probar firma JWT en seco
        jwt_ready = False
        jwt_message = "Modo público (no requiere firma JWT)"
        if self.provider in ("self_hosted", "jaas"):
            test_token, warn = self.sign_jwt(
                room_slug=f"{self.room_prefix}-diag-check",
                user_id="diag",
                display_name="Diagnóstico MediSoft",
                is_moderator=True,
                expires_minutes=5,
            )
            jwt_ready = bool(test_token) and warn is None
            jwt_message = (
                f"Firma JWT ({'HS256' if self.provider == 'self_hosted' else 'RS256'}) verificada correctamente"
                if jwt_ready
                else (warn or "Credenciales JWT incompletas")
            )

        healthy = script_reachable and (self.provider == "public" or jwt_ready)

        return {
            "healthy": healthy,
            "service_online": script_reachable,
            "provider": self.provider,
            "domain": self.domain,
            "external_api_url": api_script_url,
            "http_status": status_code,
            "latency_ms": latency_ms,
            "jwt_configured": jwt_ready,
            "jwt_status_message": jwt_message,
            "error": error_detail,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    @classmethod
    async def ensure_preconsulta_for_cita(cls, db: Any, cita: Any) -> Any:
        """Garantiza que exista un registro Preconsulta vinculado a la cita para precargar historia."""
        import uuid
        from sqlalchemy import select
        from app.models.preconsulta import Preconsulta

        res = await db.execute(select(Preconsulta).where(Preconsulta.cita_id == cita.id))
        pre = res.scalar_one_or_none()
        if not pre:
            pre = Preconsulta(
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
            db.add(pre)
            await db.flush()
        return pre

    @classmethod
    async def dispatch_teleconsulta_magic_link(
        cls,
        db: Any,
        cita: Any,
        force_even_if_unpaid: bool = False,
    ) -> Dict[str, Any]:
        """
        Envía por WhatsApp el Enlace Mágico de Teleconsulta (/teleconsulta/:token)
        junto con el acceso a la Preconsulta (/preconsulta/:token).
        """
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload
        from app.models.empresa import Empresa
        from app.models.paciente import Paciente
        from app.models.medico import Medico
        from app.models.especialidad import Especialidad
        from app.models.integracion import WhatsAppMessage
        from app.services.whatsapp_resolver import resolve_whatsapp_service
        from app.api.v1.medicos import format_clean_whatsapp_number

        res_emp = await db.execute(
            select(Empresa)
            .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
            .where(Empresa.id == cita.empresa_id)
        )
        empresa = res_emp.scalar_one_or_none()

        cls.ensure_cita_credentials(cita, empresa)
        preconsulta = await cls.ensure_preconsulta_for_cita(db, cita)

        if not force_even_if_unpaid and not cls.is_cita_authorized_for_teleconsulta(cita, empresa):
            return {
                "success": False,
                "reason": "payment_pending",
                "detail": "La clínica exige pago validado antes de despachar el enlace de teleconsulta.",
                "teleconsulta_url": cls.build_teleconsulta_url(cita.teleconsulta_token),
            }

        res_pac = await db.execute(select(Paciente).where(Paciente.id == cita.paciente_id))
        paciente = res_pac.scalar_one_or_none()
        if not paciente or not paciente.telefono:
            return {
                "success": False,
                "reason": "no_phone",
                "detail": "El paciente no posee número telefónico registrado.",
                "teleconsulta_url": cls.build_teleconsulta_url(cita.teleconsulta_token),
            }

        cod_pais = "58"
        if empresa:
            if empresa.pais_telefono and empresa.pais_telefono.codigo_telefonico:
                cod_pais = empresa.pais_telefono.codigo_telefonico
            elif empresa.pais and empresa.pais.codigo_telefonico:
                cod_pais = empresa.pais.codigo_telefonico

        clean_phone = format_clean_whatsapp_number(paciente.telefono, cod_pais)
        if not clean_phone:
            return {
                "success": False,
                "reason": "invalid_phone",
                "detail": "El teléfono del paciente no tiene formato válido para WhatsApp.",
                "teleconsulta_url": cls.build_teleconsulta_url(cita.teleconsulta_token),
            }

        res_med = await db.execute(select(Medico).where(Medico.id == cita.medico_id))
        medico = res_med.scalar_one_or_none()
        nombre_doc = f"{medico.nombres} {medico.apellidos}" if medico else "Especialista"

        res_esp = await db.execute(select(Especialidad.nombre).where(Especialidad.id == cita.especialidad_id))
        esp_nombre = res_esp.scalar() or "Medicina"

        nombre_clinica = empresa.nombre if empresa else "Centro Médico"
        fecha_str = cita.fecha.strftime("%d/%m/%Y")
        base_url = cls.get_frontend_base_url()
        teleconsulta_url = f"{base_url}/teleconsulta/{cita.teleconsulta_token}"
        preconsulta_url = f"{base_url}/preconsulta/{preconsulta.token}"

        mensaje = (
            f"👋 ¡Hola *{paciente.nombres}*!\n\n"
            f"📹 Su *Videoconsulta Médica Online* en *{nombre_clinica}* está habilitada:\n\n"
            f"🩺 *Especialidad:* {esp_nombre}\n"
            f"👨‍⚕️ *Especialista:* Dr(a). {nombre_doc}\n"
            f"📅 *Fecha:* {fecha_str}\n"
            f"⏰ *Hora:* {cita.hora_inicio}\n\n"
            f"🔗 *1. Enlace Mágico a su Sala de Teleconsulta (Sin instalar apps):*\n"
            f"👉 {teleconsulta_url}\n\n"
            f"📋 *2. Formulario previo de Preconsulta (Opcional, agiliza su atención):*\n"
            f"👉 {preconsulta_url}\n\n"
            f"Le sugerimos conectarse 5 minutos antes para verificar su cámara y micrófono.\n\n"
            f"¡Cuidamos de su salud donde quiera que esté! ✨"
        )

        wa_service, resolved_target, is_sucursal, _ = await resolve_whatsapp_service(
            db, cita.empresa_id, cita.sucursal_id
        )

        now_local = datetime.now()
        send_res = await wa_service.send_message(
            to=clean_phone,
            message=mensaje,
            sync=False,
            simulate_typing=False,
        )
        ok = bool(send_res.get("success"))

        if ok:
            cita.link_teleconsulta_enviado = True
            cita.link_teleconsulta_enviado_at = now_local
            cita.whatsapp_notificado = True
            cita.whatsapp_notificado_at = now_local

        db.add(
            WhatsAppMessage(
                empresa_id=cita.empresa_id,
                sucursal_id=resolved_target.id if is_sucursal else None,
                recipient_phone=clean_phone,
                recipient_name=f"{paciente.nombres} {paciente.apellidos}",
                message_content=mensaje,
                status="sent" if ok else "failed",
                error_message=None if ok else str(send_res.get("error") or send_res.get("message") or ""),
                sent_at=now_local if ok else None,
            )
        )

        import urllib.parse
        direct_url = f"https://wa.me/{clean_phone}?text={urllib.parse.quote(mensaje)}"
        return {
            "success": ok,
            "destinatario": clean_phone,
            "mensaje_enviado": mensaje,
            "teleconsulta_url": teleconsulta_url,
            "whatsapp_direct_url": direct_url,
            "detail": (
                "Enlace mágico de teleconsulta enviado exitosamente por WhatsApp."
                if ok
                else str(send_res.get("message") or "No se pudo despachar por servidor WhatsApp; puede usar el enlace directo.")
            ),
        }


