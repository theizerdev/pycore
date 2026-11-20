"""
Servicio Resolver de WhatsApp (Motor Nativo Python / Neonize).
Determina si se debe utilizar la instancia local de una Sucursal o
hacer fallback a la instancia central de la Empresa.
"""
import logging
from typing import Optional, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.services.whatsapp_service import WhatsAppService
from app.services.whatsapp_python_engine import whatsapp_engine

logger = logging.getLogger(__name__)


def get_empresa_codigo_pais_resolver(empresa: Optional[Empresa]) -> str:
    """Obtiene el código telefónico internacional del país de la empresa (default: '58')."""
    if empresa:
        if getattr(empresa, "pais_telefono", None) and empresa.pais_telefono.codigo_telefonico:
            return empresa.pais_telefono.codigo_telefonico
        if getattr(empresa, "pais", None) and empresa.pais.codigo_telefonico:
            return empresa.pais.codigo_telefonico
    return "58"


def build_service_from_entity(
    entity: Any,
    instance_name: str,
    empresa_id: int,
    country_code: str,
) -> WhatsAppService:
    return WhatsAppService(
        api_url="python://local",
        api_key=getattr(entity, "whatsapp_api_key", None),
        instance_name=instance_name,
        company_id=empresa_id,
        country_code=country_code,
        proxy_url=getattr(entity, "whatsapp_proxy_url", None),
        simulate_typing=(
            bool(getattr(entity, "whatsapp_simulate_typing", True))
            if getattr(entity, "whatsapp_simulate_typing", None) is not None
            else True
        ),
        typing_min_sec=float(getattr(entity, "whatsapp_typing_min_sec", None) or 2.0),
        typing_max_sec=float(getattr(entity, "whatsapp_typing_max_sec", None) or 6.0),
        verify_number=(
            bool(getattr(entity, "whatsapp_verify_number", True))
            if getattr(entity, "whatsapp_verify_number", None) is not None
            else True
        ),
    )


async def get_whatsapp_target(
    db: AsyncSession,
    empresa_id: int,
    sucursal_id: Optional[int] = None,
) -> Tuple[Any, bool]:
    """
    Obtiene la entidad de destino para configuración/gestión de WhatsApp:
    Retorna (entidad, es_sucursal).
    Si se especifica sucursal_id válida, retorna la Sucursal.
    De lo contrario, retorna la Empresa.
    """
    if sucursal_id:
        stmt_suc = (
            select(Sucursal)
            .options(selectinload(Sucursal.pais_telefono), selectinload(Sucursal.empresa))
            .where(Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id)
        )
        res_suc = await db.execute(stmt_suc)
        sucursal = res_suc.scalar_one_or_none()
        if sucursal:
            if not sucursal.whatsapp_instance:
                sucursal.whatsapp_instance = f"sucursal_{empresa_id}_{sucursal.id}"
            return sucursal, True

    stmt_emp = (
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == empresa_id)
    )
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    if empresa and not empresa.whatsapp_instance:
        empresa.whatsapp_instance = f"empresa_{empresa.id}"
    return empresa, False


async def resolve_whatsapp_service(
    db: AsyncSession,
    empresa_id: int,
    sucursal_id: Optional[int] = None,
) -> Tuple[Optional[WhatsAppService], Any, bool, bool]:
    """
    Resuelve el servicio de WhatsApp adecuado para el envío de mensajes:
    1. Si sucursal_id tiene instancia conectada en el motor Python -> Usa Sucursal.
    2. Fallback -> Usa la Empresa central.
    Retorna: (wa_service, entidad_usada, es_sucursal, using_fallback)
    """
    stmt_emp = (
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == empresa_id)
    )
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)

    if sucursal_id:
        stmt_suc = (
            select(Sucursal)
            .options(selectinload(Sucursal.pais_telefono))
            .where(Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id)
        )
        res_suc = await db.execute(stmt_suc)
        sucursal = res_suc.scalar_one_or_none()

        if sucursal:
            instance = sucursal.whatsapp_instance or f"sucursal_{empresa_id}_{sucursal.id}"
            live = whatsapp_engine.get_status(instance)
            if live.get("is_connected") or (sucursal.whatsapp_active and sucursal.whatsapp_connected):
                cod_pais_suc = (
                    sucursal.pais_telefono.codigo_telefonico
                    if sucursal.pais_telefono and sucursal.pais_telefono.codigo_telefonico
                    else cod_pais
                )
                service = build_service_from_entity(sucursal, instance, empresa_id, cod_pais_suc)
                return service, sucursal, True, False

    if empresa:
        instance = empresa.whatsapp_instance or f"empresa_{empresa.id}"
        service = build_service_from_entity(empresa, instance, empresa.id, cod_pais)
        using_fallback = bool(sucursal_id is not None)
        return service, empresa, False, using_fallback

    return None, None, False, False
