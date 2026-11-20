"""
Servicio Resolver de WhatsApp (Motor Nativo Python / Neonize).
Opera por instancia de Sucursal:
- Si se indica sucursal_id, utiliza esa sucursal.
- Si no se indica sucursal_id, selecciona automáticamente la sucursal principal (o la primera sucursal conectada) de la empresa.
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
    Obtiene la Sucursal de destino para configuración/gestión de WhatsApp.
    Retorna (entidad, es_sucursal).
    Si sucursal_id es None, retorna la primera sucursal activa de la empresa.
    """
    if sucursal_id:
        stmt_suc = (
            select(Sucursal)
            .options(selectinload(Sucursal.pais_telefono), selectinload(Sucursal.empresa))
            .where(Sucursal.id == sucursal_id, Sucursal.empresa_id == empresa_id)
        )
        sucursal = (await db.execute(stmt_suc)).scalar_one_or_none()
        if sucursal:
            if not sucursal.whatsapp_instance:
                sucursal.whatsapp_instance = f"sucursal_{empresa_id}_{sucursal.id}"
            return sucursal, True

    # Seleccionar la primera sucursal activa de la empresa por defecto
    stmt_first_suc = (
        select(Sucursal)
        .options(selectinload(Sucursal.pais_telefono), selectinload(Sucursal.empresa))
        .where(Sucursal.empresa_id == empresa_id, Sucursal.activo == True)
        .order_by(Sucursal.id.asc())
    )
    first_suc = (await db.execute(stmt_first_suc)).scalars().first()
    if first_suc:
        if not first_suc.whatsapp_instance:
            first_suc.whatsapp_instance = f"sucursal_{empresa_id}_{first_suc.id}"
        return first_suc, True

    # Fallback de emergencia solo si la empresa no tuviera ninguna sucursal creada
    stmt_emp = (
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == empresa_id)
    )
    empresa = (await db.execute(stmt_emp)).scalar_one_or_none()
    if empresa and not empresa.whatsapp_instance:
        empresa.whatsapp_instance = f"empresa_{empresa.id}"
    return empresa, False


async def resolve_whatsapp_service(
    db: AsyncSession,
    empresa_id: int,
    sucursal_id: Optional[int] = None,
) -> Tuple[Optional[WhatsAppService], Any, bool, bool]:
    """
    Resuelve la instancia de Sucursal adecuada para el envío de mensajes:
    1. Si sucursal_id está conectada -> Usa esa sucursal.
    2. Si no -> Busca otra sucursal conectada de la misma empresa (respaldo entre sedes).
    3. Si ninguna está conectada -> Retorna la sucursal solicitada (o la primera activa).
    Retorna: (wa_service, entidad_usada, es_sucursal, using_fallback)
    """
    stmt_emp = (
        select(Empresa)
        .options(selectinload(Empresa.pais_telefono), selectinload(Empresa.pais))
        .where(Empresa.id == empresa_id)
    )
    empresa = (await db.execute(stmt_emp)).scalar_one_or_none()
    cod_pais = get_empresa_codigo_pais_resolver(empresa)

    stmt_sucs = (
        select(Sucursal)
        .options(selectinload(Sucursal.pais_telefono))
        .where(Sucursal.empresa_id == empresa_id, Sucursal.activo == True)
        .order_by(Sucursal.id.asc())
    )
    sucursales = (await db.execute(stmt_sucs)).scalars().all()

    def _make_suc_service(suc: Sucursal) -> WhatsAppService:
        inst = suc.whatsapp_instance or f"sucursal_{empresa_id}_{suc.id}"
        cod_suc = (
            suc.pais_telefono.codigo_telefonico
            if suc.pais_telefono and suc.pais_telefono.codigo_telefonico
            else cod_pais
        )
        return build_service_from_entity(suc, inst, empresa_id, cod_suc)

    requested_suc: Optional[Sucursal] = None
    if sucursal_id is not None:
        for s in sucursales:
            if s.id == sucursal_id:
                requested_suc = s
                break

    # 1. Prioridad: sucursal solicitada si está conectada
    if requested_suc:
        inst = requested_suc.whatsapp_instance or f"sucursal_{empresa_id}_{requested_suc.id}"
        live = whatsapp_engine.get_status(inst)
        if live.get("is_connected") or (requested_suc.whatsapp_active and requested_suc.whatsapp_connected):
            return _make_suc_service(requested_suc), requested_suc, True, False

    # 2. Respaldo: otra sucursal conectada de la misma empresa
    for s in sucursales:
        inst = s.whatsapp_instance or f"sucursal_{empresa_id}_{s.id}"
        live = whatsapp_engine.get_status(inst)
        if live.get("is_connected") or (s.whatsapp_active and s.whatsapp_connected):
            using_fallback = bool(requested_suc is not None and s.id != requested_suc.id)
            return _make_suc_service(s), s, True, using_fallback

    # 3. Ninguna conectada aún -> devolver la sucursal solicitada o la primera disponible
    chosen = requested_suc or (sucursales[0] if sucursales else None)
    if chosen:
        return _make_suc_service(chosen), chosen, True, False

    # 4. Fallback extremo si no existe ninguna sucursal
    if empresa:
        inst = empresa.whatsapp_instance or f"empresa_{empresa.id}"
        return build_service_from_entity(empresa, inst, empresa.id, cod_pais), empresa, False, False

    return None, None, False, False
