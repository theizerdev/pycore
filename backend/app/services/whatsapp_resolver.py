"""
Servicio Resolver de WhatsApp.
Determina si se debe utilizar la conexión local de una Sucursal o
hacer fallback a la conexión central de la Empresa.
"""
import logging
from typing import Optional, Tuple, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.empresa import Empresa
from app.models.sucursal import Sucursal
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


def get_empresa_codigo_pais_resolver(empresa: Optional[Empresa]) -> str:
    """Obtiene el código telefónico internacional del país de la empresa (default: '58')."""
    if empresa:
        if getattr(empresa, 'pais_telefono', None) and empresa.pais_telefono.codigo_telefonico:
            return empresa.pais_telefono.codigo_telefonico
        if getattr(empresa, 'pais', None) and empresa.pais.codigo_telefonico:
            return empresa.pais.codigo_telefonico
    return "58"


async def get_whatsapp_target(
    db: AsyncSession,
    empresa_id: int,
    sucursal_id: Optional[int] = None
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
            # Asegurar nombre de instancia por defecto si no tiene
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
    return empresa, False


async def resolve_whatsapp_service(
    db: AsyncSession,
    empresa_id: int,
    sucursal_id: Optional[int] = None
) -> Tuple[Optional[WhatsAppService], Any, bool, bool]:
    """
    Resuelve el servicio de WhatsApp adecuado para el envío de mensajes:
    1. Si sucursal_id tiene WhatsApp conectado y activo -> Usa Sucursal (es_sucursal=True, using_fallback=False).
    2. Fallback -> Si la Sucursal no está conectada o no existe, usa la Empresa (es_sucursal=False, using_fallback=True si sucursal_id).
    Retorna: (wa_service, entidad_usada, es_sucursal, using_fallback)
    """
    # 1. Cargar empresa para heredar código de país y api_url base
    stmt_emp = (
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == empresa_id)
    )
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)
    base_api_url = (empresa.whatsapp_api_url if empresa else None) or "https://whatsapp.theizerdev.com"

    # 2. Verificar si la sucursal tiene WhatsApp propio conectado
    if sucursal_id:
        stmt_suc = (
            select(Sucursal)
            .options(selectinload(Sucursal.pais_telefono))
            .where(Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id)
        )
        res_suc = await db.execute(stmt_suc)
        sucursal = res_suc.scalar_one_or_none()

        if sucursal and sucursal.whatsapp_active and sucursal.whatsapp_connected:
            instance = sucursal.whatsapp_instance or f"sucursal_{empresa_id}_{sucursal.id}"
            api_url = sucursal.whatsapp_api_url or base_api_url
            api_key = sucursal.whatsapp_api_key or (empresa.whatsapp_api_key if empresa else None)
            
            # Código de país de la sucursal si tiene
            cod_pais_suc = (
                sucursal.pais_telefono.codigo_telefonico
                if sucursal.pais_telefono and sucursal.pais_telefono.codigo_telefonico
                else cod_pais
            )

            service = WhatsAppService(
                api_url=api_url,
                api_key=api_key,
                instance_name=instance,
                company_id=empresa_id,
                country_code=cod_pais_suc
            )
            return service, sucursal, True, False

    # 3. Fallback a Empresa
    if empresa:
        instance = empresa.whatsapp_instance or f"empresa_{empresa.id}"
        service = WhatsAppService(
            api_url=empresa.whatsapp_api_url or base_api_url,
            api_key=empresa.whatsapp_api_key,
            instance_name=instance,
            company_id=empresa.id,
            country_code=cod_pais
        )
        using_fallback = bool(sucursal_id is not None)
        return service, empresa, False, using_fallback

    return None, None, False, False
