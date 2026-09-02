from typing import List, Dict
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.usuario import Usuario
from app.models.permiso import Permiso
from app.schemas.permiso import PermisoResponse, PermisosPorModulo, PermisosPorSector

router = APIRouter(prefix="/permisos", tags=["Permisos"])

SECTOR_INFO = {
    "seguridad": {
        "titulo": "Seguridad & Multi-tenant",
        "descripcion": "Gestión de empresas, sucursales, países, roles, permisos, usuarios y auditoría"
    },
    "clinico": {
        "titulo": "Módulos Clínicos & HCE",
        "descripcion": "Gestión de pacientes, agenda de citas, consultas médicas, evolución y recetas"
    },
    "turnero": {
        "titulo": "Turnero & Sala de Espera",
        "descripcion": "Pantallas públicas de llamados en TV y control de turnos en consultorios"
    },
    "teleconsulta": {
        "titulo": "Teleconsulta Médica",
        "descripcion": "Salas de videollamadas médicas y telemedicina en tiempo real"
    },
    "reportes": {
        "titulo": "Reportes & Estadísticas",
        "descripcion": "Informes ejecutivos, métricas clínicas y exportaciones de datos"
    },
    "integraciones": {
        "titulo": "Integraciones & Servicios Externos",
        "descripcion": "Conexión con WhatsApp Business, mapas, pasarelas de pago y monitor de tasa BCV"
    }
}

@router.get("", response_model=List[PermisoResponse])
async def list_todos_los_permisos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Permiso).order_by(Permiso.sector.asc(), Permiso.modulo.asc(), Permiso.accion.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/sectores", response_model=List[PermisosPorSector])
async def list_permisos_por_sectores(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Permiso).order_by(Permiso.sector.asc(), Permiso.modulo.asc(), Permiso.accion.asc())
    result = await db.execute(stmt)
    permisos = result.scalars().all()

    # Agrupar por sector y luego por módulo
    sector_modulos: Dict[str, Dict[str, List[PermisoResponse]]] = defaultdict(lambda: defaultdict(list))
    for p in permisos:
        sector_modulos[p.sector][p.modulo].append(PermisoResponse.model_validate(p))

    orden_sectores = ["seguridad", "clinico", "turnero", "teleconsulta", "reportes", "integraciones"]
    resultado: List[PermisosPorSector] = []

    for sec in orden_sectores:
        if sec in sector_modulos:
            info = SECTOR_INFO.get(sec, {"titulo": sec.capitalize(), "descripcion": ""})
            modulos_list = [
                PermisosPorModulo(modulo=mod_nombre, permisos=mod_permisos)
                for mod_nombre, mod_permisos in sector_modulos[sec].items()
            ]
            resultado.append(
                PermisosPorSector(
                    sector=sec,
                    titulo=info["titulo"],
                    descripcion=info["descripcion"],
                    modulos=modulos_list
                )
            )

    # Agregar cualquier otro sector no listado en el orden preferente
    for sec, mods in sector_modulos.items():
        if sec not in orden_sectores:
            modulos_list = [
                PermisosPorModulo(modulo=mod_nombre, permisos=mod_permisos)
                for mod_nombre, mod_permisos in mods.items()
            ]
            resultado.append(
                PermisosPorSector(
                    sector=sec,
                    titulo=sec.capitalize(),
                    descripcion=None,
                    modulos=modulos_list
                )
            )

    return resultado
