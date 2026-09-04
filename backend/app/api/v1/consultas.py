import logging
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.consulta import ConsultaMedica
from app.models.cita import CitaMedica
from app.models.preconsulta import Preconsulta
from app.models.paciente import Paciente
from app.models.medico import Medico
from app.models.especialidad import Especialidad
from app.models.auditoria import AuditoriaLog
from app.schemas.consulta import (
    ConsultaCreate,
    ConsultaUpdate,
    ConsultaCambiarEstado,
    ConsultaResponse,
    ConsultaResumenContadores,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consultas", tags=["Consultas Médicas"])

VALID_ESTADOS_CONSULTA = ["en_espera", "en_curso", "finalizada", "anulada"]


@router.get("/resumen-contadores", response_model=ConsultaResumenContadores)
async def get_resumen_contadores(
    fecha: Optional[date] = Query(None, description="Fecha a filtrar (por defecto hoy)"),
    medico_id: Optional[int] = Query(None, description="Filtrar por médico"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user),
):
    """
    Retorna los contadores rápidos para los badges de navegación:
    - sala_espera (estado = 'en_espera')
    - en_consulta (estado = 'en_curso')
    - atendidas (estado = 'finalizada')
    - total_hoy
    """
    target_date = fecha or date.today()

    query = select(ConsultaMedica).where(
        func.date(ConsultaMedica.fecha_consulta) == target_date
    )

    if not current_user.es_superadmin:
        query = query.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    if sucursal_id:
        query = query.where(ConsultaMedica.sucursal_id == sucursal_id)

    if medico_id:
        query = query.where(ConsultaMedica.medico_id == medico_id)

    result = await db.execute(query)
    consultas = result.scalars().all()

    sala_espera = sum(1 for c in consultas if c.estado == "en_espera")
    en_consulta = sum(1 for c in consultas if c.estado == "en_curso")
    atendidas = sum(1 for c in consultas if c.estado == "finalizada")
    total_hoy = len(consultas)

    return ConsultaResumenContadores(
        sala_espera=sala_espera,
        en_consulta=en_consulta,
        atendidas=atendidas,
        total_hoy=total_hoy,
    )


@router.get("", response_model=List[ConsultaResponse])
async def list_consultas(
    estado: Optional[str] = Query(None, description="Filtrar por estado: 'en_espera', 'en_curso', 'finalizada', 'anulada'"),
    fecha: Optional[date] = Query(None, description="Filtrar por fecha específica"),
    fecha_desde: Optional[date] = Query(None, description="Fecha inicio rango"),
    fecha_hasta: Optional[date] = Query(None, description="Fecha fin rango"),
    medico_id: Optional[int] = Query(None, description="Filtrar por médico especialista"),
    especialidad_id: Optional[int] = Query(None, description="Filtrar por especialidad"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal"),
    paciente_id: Optional[int] = Query(None, description="Filtrar por paciente"),
    search: Optional[str] = Query(None, description="Búsqueda por código, paciente, médico o motivo"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Lista consultas médicas según filtros de estado, fecha, especialidad, médico o texto de búsqueda.
    """
    stmt = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.paciente),
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad),
            selectinload(ConsultaMedica.preconsulta),
            selectinload(ConsultaMedica.sucursal),
            selectinload(ConsultaMedica.cita),
        )
        .order_by(ConsultaMedica.fecha_consulta.asc(), ConsultaMedica.id.asc())
    )

    # Multi-tenant
    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    # Filtro por estado
    if estado:
        estados_list = [e.strip() for e in estado.split(",") if e.strip()]
        if len(estados_list) == 1:
            stmt = stmt.where(ConsultaMedica.estado == estados_list[0])
        elif len(estados_list) > 1:
            stmt = stmt.where(ConsultaMedica.estado.in_(estados_list))

    # Filtro por fecha
    if fecha:
        stmt = stmt.where(func.date(ConsultaMedica.fecha_consulta) == fecha)
    else:
        if fecha_desde:
            stmt = stmt.where(func.date(ConsultaMedica.fecha_consulta) >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(func.date(ConsultaMedica.fecha_consulta) <= fecha_hasta)

    # Filtros relacionales
    if medico_id:
        stmt = stmt.where(ConsultaMedica.medico_id == medico_id)
    if especialidad_id:
        stmt = stmt.where(ConsultaMedica.especialidad_id == especialidad_id)
    if sucursal_id:
        stmt = stmt.where(ConsultaMedica.sucursal_id == sucursal_id)
    if paciente_id:
        stmt = stmt.where(ConsultaMedica.paciente_id == paciente_id)

    # Búsqueda libre
    if search:
        s = f"%{search.strip().lower()}%"
        stmt = stmt.join(ConsultaMedica.paciente).join(ConsultaMedica.medico, isouter=True).where(
            or_(
                func.lower(ConsultaMedica.codigo).like(s),
                func.lower(ConsultaMedica.motivo_consulta).like(s),
                func.lower(Paciente.nombres).like(s),
                func.lower(Paciente.apellidos).like(s),
                func.lower(Paciente.numero_documento).like(s),
                func.lower(Medico.nombres).like(s),
                func.lower(Medico.apellidos).like(s),
            )
        )

    result = await db.execute(stmt)
    consultas = result.scalars().all()
    return consultas


@router.get("/{id}", response_model=ConsultaResponse)
async def get_consulta(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Obtiene el detalle completo de una consulta médica por ID.
    """
    stmt = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.paciente),
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad),
            selectinload(ConsultaMedica.preconsulta),
            selectinload(ConsultaMedica.sucursal),
            selectinload(ConsultaMedica.cita),
        )
        .where(ConsultaMedica.id == id)
    )

    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    return consulta


@router.post("", response_model=ConsultaResponse, status_code=status.HTTP_201_CREATED)
async def create_consulta(
    payload: ConsultaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.crear")),
):
    """
    Crea una consulta médica directa (ej. urgencia, triaje inmediato o paciente sin cita previa).
    """
    empresa_id = current_user.empresa_id
    if not empresa_id and not current_user.es_superadmin:
        raise HTTPException(status_code=400, detail="Usuario sin empresa asignada")

    fecha_str = datetime.now().strftime("%Y%m%d")
    
    # Generar correlativo
    count_res = await db.execute(
        select(func.count(ConsultaMedica.id)).where(
            func.date(ConsultaMedica.fecha_consulta) == date.today()
        )
    )
    daily_count = (count_res.scalar() or 0) + 1
    codigo_con = f"CON-{fecha_str}-{daily_count:04d}"

    consulta = ConsultaMedica(
        codigo=codigo_con,
        empresa_id=empresa_id,
        sucursal_id=payload.sucursal_id,
        cita_id=payload.cita_id,
        paciente_id=payload.paciente_id,
        medico_id=payload.medico_id,
        especialidad_id=payload.especialidad_id,
        preconsulta_id=payload.preconsulta_id,
        creado_por=current_user.id,
        fecha_consulta=datetime.now(),
        motivo_consulta=payload.motivo_consulta,
        enfermedad_actual=payload.enfermedad_actual,
        signos_vitales=payload.signos_vitales or {},
        datos_plantilla=payload.datos_plantilla or {},
        diagnostico_principal=payload.diagnostico_principal,
        diagnosticos_secundarios=payload.diagnosticos_secundarios or [],
        plan_tratamiento=payload.plan_tratamiento,
        receta_medica=payload.receta_medica or [],
        indicaciones_generales=payload.indicaciones_generales,
        estado=payload.estado or "en_espera",
    )

    db.add(consulta)
    await db.commit()
    await db.refresh(consulta)

    return await get_consulta(consulta.id, db, current_user)


@router.patch("/{id}/estado", response_model=ConsultaResponse)
async def cambiar_estado_consulta(
    id: int,
    payload: ConsultaCambiarEstado,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.atender")),
):
    """
    Transición de estado de la consulta médica:
    - 'en_curso' (Llamar a consultorio / Iniciar atención) -> Cita pasa a 'en_consulta'
    - 'finalizada' (Atendida / Finalizar consulta) -> Cita pasa a 'atendida'
    - 'anulada' (Anulada) -> Cita pasa a 'cancelada'
    - 'en_espera' (Devolver a sala de espera) -> Cita pasa a 'sala_espera'
    """
    if payload.estado not in VALID_ESTADOS_CONSULTA:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Permitidos: {', '.join(VALID_ESTADOS_CONSULTA)}",
        )

    stmt = select(ConsultaMedica).where(ConsultaMedica.id == id)
    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    estado_anterior = consulta.estado
    consulta.estado = payload.estado
    consulta.updated_at = datetime.now()

    # Sincronizar con la cita médica si existe
    if consulta.cita_id:
        res_cita = await db.execute(select(CitaMedica).where(CitaMedica.id == consulta.cita_id))
        cita = res_cita.scalar_one_or_none()
        if cita:
            if payload.estado == "en_curso":
                cita.estado = "en_consulta"
            elif payload.estado == "finalizada":
                cita.estado = "atendida"
            elif payload.estado == "anulada":
                cita.estado = "cancelada"
                if payload.motivo:
                    cita.motivo_cancelacion = payload.motivo
            elif payload.estado == "en_espera":
                cita.estado = "sala_espera"
            cita.updated_at = datetime.now()

    # Auditoría
    db.add(
        AuditoriaLog(
            empresa_id=consulta.empresa_id,
            usuario_id=current_user.id,
            accion="CAMBIAR_ESTADO_CONSULTA",
            modulo="consultas",
            detalles={
                "consulta_id": consulta.id,
                "codigo": consulta.codigo,
                "estado_anterior": estado_anterior,
                "estado_nuevo": payload.estado,
                "motivo": payload.motivo,
            },
        )
    )

    await db.commit()
    return await get_consulta(consulta.id, db, current_user)


@router.put("/{id}", response_model=ConsultaResponse)
async def update_consulta(
    id: int,
    payload: ConsultaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.editar")),
):
    """
    Actualiza la historia, diagnósticos, evolución, signos vitales, plantilla y receta de la consulta médica.
    """
    stmt = select(ConsultaMedica).where(ConsultaMedica.id == id)
    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(consulta, k, v)

    consulta.updated_at = datetime.now()
    await db.commit()

    return await get_consulta(consulta.id, db, current_user)
