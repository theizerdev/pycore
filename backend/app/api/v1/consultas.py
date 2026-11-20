import asyncio
import logging
import time
from datetime import datetime, date, time as dtime
from typing import List, Optional, Dict, Tuple, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from pydantic import BaseModel, Field
from sqlalchemy import or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload

from app.services.clinical_pdf_generator import (
    generate_clinical_document_pdf,
    get_available_documents_for_consulta,
)

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.consulta import ConsultaMedica
from app.models.cita import CitaMedica
from app.models.preconsulta import Preconsulta
from app.models.paciente import Paciente
from app.models.medico import Medico
from app.models.especialidad import Especialidad
from app.models.empresa import Empresa
from app.models.auditoria import AuditoriaLog
from app.schemas.integracion import JitsiSessionResponse
from app.services.jitsi_service import JitsiService
from app.services.plan_quota_service import PlanQuotaService
from app.services.whatsapp_resolver import resolve_whatsapp_service
from app.api.v1.medicos import format_clean_whatsapp_number, get_empresa_codigo_pais
from app.models.sucursal import Sucursal
from app.schemas.consulta import (
    ConsultaCreate,
    ConsultaUpdate,
    ConsultaCambiarEstado,
    ConsultaResponse,
    ConsultaPreviaResumen,
    ConsultaResumenContadores,
    PrimerOdontogramaInfo,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consultas", tags=["Consultas Médicas"])

VALID_ESTADOS_CONSULTA = ["en_espera", "en_curso", "finalizada", "anulada"]

_medico_id_cache: Dict[Tuple[int, int], Tuple[Optional[int], float]] = {}


async def get_medico_id_for_user(db: AsyncSession, user: Usuario) -> Optional[int]:
    """
    Si el usuario logueado es un médico especialista, obtiene su ID de médico para restringir
    la visualización de consultas exclusivamente a sus propios pacientes.
    Con caché en memoria (TTL 60s) para evitar consultas repetitivas.
    """
    if user.es_superadmin:
        return None

    now = time.time()
    cache_key = (user.id, user.empresa_id or 0)
    if cache_key in _medico_id_cache:
        cached_val, ts = _medico_id_cache[cache_key]
        if now - ts < 60:
            return cached_val

    is_doctor_role = bool(user.rol and user.rol.slug == "medico")
    
    stmt = select(Medico.id).where(
        Medico.empresa_id == user.empresa_id,
        or_(
            Medico.usuario_id == user.id,
            func.lower(Medico.email) == user.email.lower()
        )
    )
    res = await db.execute(stmt)
    med_id = res.scalar_one_or_none()

    ret = None
    if is_doctor_role or med_id is not None:
        ret = med_id if med_id is not None else -1

    _medico_id_cache[cache_key] = (ret, now)
    return ret


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
    Si el usuario logueado es un doctor, sus contadores reflejan solo sus propios pacientes.
    Utiliza agregación SQL y rango de fechas indexado para respuesta sub-milisegundo.
    """
    target_date = fecha or date.today()
    start_dt = datetime.combine(target_date, dtime.min)
    end_dt = datetime.combine(target_date, dtime.max)

    # Las consultas activas en espera o en curso representan el flujo operativo en tiempo real
    # y deben permanecer visibles en los contadores operativos aunque hayan iniciado antes de medianoche
    query = (
        select(ConsultaMedica.estado, func.count(ConsultaMedica.id))
        .where(
            or_(
                and_(
                    ConsultaMedica.fecha_consulta >= start_dt,
                    ConsultaMedica.fecha_consulta <= end_dt,
                ),
                ConsultaMedica.estado.in_(["en_espera", "en_curso"])
            )
        )
        .group_by(ConsultaMedica.estado)
    )

    if not current_user.es_superadmin:
        query = query.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    # Restricción obligatoria si el usuario logueado es médico
    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        query = query.where(ConsultaMedica.medico_id == doctor_auto_id)
    elif medico_id:
        query = query.where(ConsultaMedica.medico_id == medico_id)

    if sucursal_id:
        query = query.where(ConsultaMedica.sucursal_id == sucursal_id)

    result = await db.execute(query)
    counts_by_estado = dict(result.all())

    sala_espera = counts_by_estado.get("en_espera", 0)
    en_consulta = counts_by_estado.get("en_curso", 0)
    atendidas = counts_by_estado.get("finalizada", 0)
    total_hoy = sum(counts_by_estado.values())

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
    estado_pago: Optional[str] = Query(None, description="Filtrar por estado de pago: 'pendiente', 'pagado', 'exonerado'"),
    search: Optional[str] = Query(None, description="Búsqueda por código, paciente, médico o motivo"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Lista consultas médicas según filtros de estado, fecha, especialidad, médico o texto de búsqueda.
    Si el usuario logueado es un doctor, solo ve sus propias consultas.
    Optimizado con joinedload para reducir consultas N+1 y filtros de fecha indexados.
    """
    stmt = (
        select(ConsultaMedica)
        .options(
            joinedload(ConsultaMedica.paciente),
            joinedload(ConsultaMedica.medico),
            joinedload(ConsultaMedica.especialidad),
            joinedload(ConsultaMedica.preconsulta),
            joinedload(ConsultaMedica.sucursal),
            joinedload(ConsultaMedica.cita),
        )
        .order_by(ConsultaMedica.fecha_consulta.asc(), ConsultaMedica.id.asc())
    )

    # Multi-tenant
    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    # Restricción obligatoria si el usuario logueado es médico
    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        stmt = stmt.where(ConsultaMedica.medico_id == doctor_auto_id)
    elif medico_id:
        stmt = stmt.where(ConsultaMedica.medico_id == medico_id)

    # Filtro por estado
    if estado:
        estados_list = [e.strip() for e in estado.split(",") if e.strip()]
        if len(estados_list) == 1:
            stmt = stmt.where(ConsultaMedica.estado == estados_list[0])
        elif len(estados_list) > 1:
            stmt = stmt.where(ConsultaMedica.estado.in_(estados_list))

    # Filtro por estado de pago
    if estado_pago:
        estados_pago_list = [ep.strip() for ep in estado_pago.split(",") if ep.strip()]
        if len(estados_pago_list) == 1:
            stmt = stmt.where(ConsultaMedica.estado_pago == estados_pago_list[0])
        elif len(estados_pago_list) > 1:
            stmt = stmt.where(ConsultaMedica.estado_pago.in_(estados_pago_list))

    # Filtro por fecha usando rangos para aprovechar el índice B-tree de MySQL
    if fecha:
        start_dt = datetime.combine(fecha, dtime.min)
        end_dt = datetime.combine(fecha, dtime.max)
        if estado in ("en_curso", "en_espera"):
            # Para estados activos en sala de espera o en consultorio, mantener visibles las consultas activas
            stmt = stmt.where(
                or_(
                    and_(ConsultaMedica.fecha_consulta >= start_dt, ConsultaMedica.fecha_consulta <= end_dt),
                    ConsultaMedica.estado == estado
                )
            )
        else:
            stmt = stmt.where(ConsultaMedica.fecha_consulta >= start_dt, ConsultaMedica.fecha_consulta <= end_dt)
    else:
        if fecha_desde:
            stmt = stmt.where(ConsultaMedica.fecha_consulta >= datetime.combine(fecha_desde, dtime.min))
        if fecha_hasta:
            stmt = stmt.where(ConsultaMedica.fecha_consulta <= datetime.combine(fecha_hasta, dtime.max))

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
    consultas = result.scalars().unique().all()

    # Determinar si cada consulta es primera vez o subsecuente
    paciente_ids = list({c.paciente_id for c in consultas if c.paciente_id})
    if paciente_ids:
        prev_stmt = (
            select(ConsultaMedica.paciente_id, func.count(ConsultaMedica.id))
            .where(
                ConsultaMedica.paciente_id.in_(paciente_ids),
                ConsultaMedica.estado == "finalizada"
            )
            .group_by(ConsultaMedica.paciente_id)
        )
        prev_res = await db.execute(prev_stmt)
        finalizadas_por_paciente = dict(prev_res.all())
        for c in consultas:
            total = finalizadas_por_paciente.get(c.paciente_id, 0)
            consultas_anteriores = total - 1 if c.estado == "finalizada" and total > 0 else total
            c.es_subsecuente = consultas_anteriores > 0
            c.total_consultas_previas = consultas_anteriores
    else:
        for c in consultas:
            c.es_subsecuente = False
            c.total_consultas_previas = 0

    return consultas


@router.get("/{id}", response_model=ConsultaResponse)
async def get_consulta(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Obtiene el detalle completo de una consulta médica por ID, enriquecido con la detección
    automática de consulta subsecuente / control y el resumen estructurado de la consulta previa.
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

    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        stmt = stmt.where(ConsultaMedica.medico_id == doctor_auto_id)

    res = await db.execute(stmt)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    # Contar eficientemente cuántas consultas finalizadas previas tiene este paciente
    stmt_count = select(func.count(ConsultaMedica.id)).where(
        ConsultaMedica.paciente_id == consulta.paciente_id,
        ConsultaMedica.id != consulta.id,
        ConsultaMedica.fecha_consulta <= consulta.fecha_consulta,
        ConsultaMedica.estado == "finalizada"
    )
    res_count = await db.execute(stmt_count)
    total_previas = res_count.scalar() or 0

    consulta.es_subsecuente = total_previas > 0
    consulta.total_consultas_previas = total_previas

    # Si existen consultas previas, cargar únicamente la más reciente (limit 1)
    if total_previas > 0:
        stmt_prev = (
            select(ConsultaMedica)
            .options(
                selectinload(ConsultaMedica.medico),
                selectinload(ConsultaMedica.especialidad)
            )
            .where(
                ConsultaMedica.paciente_id == consulta.paciente_id,
                ConsultaMedica.id != consulta.id,
                ConsultaMedica.fecha_consulta <= consulta.fecha_consulta,
                ConsultaMedica.estado == "finalizada"
            )
            .order_by(ConsultaMedica.fecha_consulta.desc())
            .limit(1)
        )
        res_prev = await db.execute(stmt_prev)
        cp = res_prev.scalar_one_or_none()
        if cp:
            med_nombre = f"{cp.medico.nombres} {cp.medico.apellidos}" if cp.medico else "Médico"
            esp_nombre = cp.especialidad.nombre if cp.especialidad else "Especialidad"
            consulta.consulta_previa = ConsultaPreviaResumen(
                id=cp.id,
                codigo=cp.codigo,
                fecha_consulta=cp.fecha_consulta,
                medico_nombre=med_nombre,
                especialidad_nombre=esp_nombre,
                motivo_consulta=cp.motivo_consulta,
                enfermedad_actual=cp.enfermedad_actual,
                diagnostico_principal=cp.diagnostico_principal,
                diagnosticos_secundarios=cp.diagnosticos_secundarios or [],
                plan_tratamiento=cp.plan_tratamiento,
                indicaciones_generales=cp.indicaciones_generales,
                signos_vitales=cp.signos_vitales or {},
                receta_medica=cp.receta_medica or [],
                estudios_solicitados=cp.estudios_solicitados or [],
                datos_plantilla=cp.datos_plantilla or {},
            )
        else:
            consulta.consulta_previa = None
    else:
        consulta.consulta_previa = None

    # Búsqueda de odontograma de primera consulta e historial dental del paciente
    stmt_odontos = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad)
        )
        .where(
            ConsultaMedica.paciente_id == consulta.paciente_id,
            ConsultaMedica.id != consulta.id,
            ConsultaMedica.datos_plantilla.is_not(None),
            ConsultaMedica.estado.in_(["finalizada", "en_curso"])
        )
        .order_by(ConsultaMedica.fecha_consulta.asc(), ConsultaMedica.id.asc())
    )
    res_odontos = await db.execute(stmt_odontos)
    all_odontos = res_odontos.scalars().all()

    odontos_con_datos = [
        c for c in all_odontos
        if c.datos_plantilla and isinstance(c.datos_plantilla, dict) and c.datos_plantilla.get("odontograma")
    ]

    if odontos_con_datos:
        # 1. El primer odontograma histórico registrado (Línea Base del paciente)
        primero = odontos_con_datos[0]
        med_nom_1 = f"Dr(a). {primero.medico.nombres} {primero.medico.apellidos}" if primero.medico else "Médico Odontólogo"
        esp_nom_1 = primero.especialidad.nombre if primero.especialidad else "Odontología"
        od_data_1 = primero.datos_plantilla.get("odontograma", {})
        consulta.primer_odontograma = PrimerOdontogramaInfo(
            consulta_id=primero.id,
            codigo=primero.codigo,
            fecha_consulta=primero.fecha_consulta,
            medico_nombre=med_nom_1,
            especialidad_nombre=esp_nom_1,
            diagnostico_principal=primero.diagnostico_principal,
            denticion=od_data_1.get("denticion", "adulto") if isinstance(od_data_1, dict) else "adulto",
            odontograma=od_data_1
        )

        # 2. El odontograma previo más reciente
        ultimo_prev = odontos_con_datos[-1]
        med_nom_u = f"Dr(a). {ultimo_prev.medico.nombres} {ultimo_prev.medico.apellidos}" if ultimo_prev.medico else "Médico Odontólogo"
        esp_nom_u = ultimo_prev.especialidad.nombre if ultimo_prev.especialidad else "Odontología"
        od_data_u = ultimo_prev.datos_plantilla.get("odontograma", {})
        consulta.odontograma_previo = PrimerOdontogramaInfo(
            consulta_id=ultimo_prev.id,
            codigo=ultimo_prev.codigo,
            fecha_consulta=ultimo_prev.fecha_consulta,
            medico_nombre=med_nom_u,
            especialidad_nombre=esp_nom_u,
            diagnostico_principal=ultimo_prev.diagnostico_principal,
            denticion=od_data_u.get("denticion", "adulto") if isinstance(od_data_u, dict) else "adulto",
            odontograma=od_data_u
        )
    else:
        consulta.primer_odontograma = None
        consulta.odontograma_previo = None

    return consulta


@router.get("/paciente/{paciente_id}/odontogramas", response_model=List[PrimerOdontogramaInfo])
async def get_odontogramas_paciente(
    paciente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Retorna el historial completo de todos los odontogramas registrados para un paciente ordenados cronológicamente.
    """
    stmt = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad)
        )
        .where(
            ConsultaMedica.paciente_id == paciente_id,
            ConsultaMedica.datos_plantilla.is_not(None)
        )
        .order_by(ConsultaMedica.fecha_consulta.asc(), ConsultaMedica.id.asc())
    )
    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    consultas = res.scalars().all()

    items: List[PrimerOdontogramaInfo] = []
    for c in consultas:
        if c.datos_plantilla and isinstance(c.datos_plantilla, dict) and c.datos_plantilla.get("odontograma"):
            med_nom = f"Dr(a). {c.medico.nombres} {c.medico.apellidos}" if c.medico else "Médico Odontólogo"
            esp_nom = c.especialidad.nombre if c.especialidad else "Odontología"
            od_data = c.datos_plantilla.get("odontograma", {})
            items.append(
                PrimerOdontogramaInfo(
                    consulta_id=c.id,
                    codigo=c.codigo,
                    fecha_consulta=c.fecha_consulta,
                    medico_nombre=med_nom,
                    especialidad_nombre=esp_nom,
                    diagnostico_principal=c.diagnostico_principal,
                    denticion=od_data.get("denticion", "adulto") if isinstance(od_data, dict) else "adulto",
                    odontograma=od_data
                )
            )
    return items


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

    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None and doctor_auto_id != -1:
        payload.medico_id = doctor_auto_id

    fecha_str = datetime.now().strftime("%Y%m%d")
    
    # Generar correlativo
    today_val = date.today()
    count_res = await db.execute(
        select(func.count(ConsultaMedica.id)).where(
            ConsultaMedica.fecha_consulta >= datetime.combine(today_val, dtime.min),
            ConsultaMedica.fecha_consulta <= datetime.combine(today_val, dtime.max)
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

    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        stmt = stmt.where(ConsultaMedica.medico_id == doctor_auto_id)

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
                if not cita.atencion_at:
                    cita.atencion_at = datetime.now()
            elif payload.estado == "finalizada":
                cita.estado = "atendida"
                if not cita.finalizada_at:
                    cita.finalizada_at = datetime.now()
            elif payload.estado == "anulada":
                cita.estado = "cancelada"
                if payload.motivo:
                    cita.motivo_cancelacion = payload.motivo
            elif payload.estado == "en_espera":
                cita.estado = "sala_espera"
                if not cita.llegada_at:
                    cita.llegada_at = datetime.now()
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

    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        stmt = stmt.where(ConsultaMedica.medico_id == doctor_auto_id)

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


@router.post("/{id}/teleconsulta-sesion", response_model=JitsiSessionResponse)
async def crear_sesion_teleconsulta_consulta(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Genera la sesión firmada de Jitsi Meet (Moderador) para el médico directamente
    desde la atención de la Consulta Médica. Si tiene cita vinculada, usa la misma sala virtual.
    """
    stmt = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.paciente),
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad),
            selectinload(ConsultaMedica.empresa),
            selectinload(ConsultaMedica.cita),
        )
        .where(ConsultaMedica.id == id)
    )
    if not current_user.es_superadmin:
        stmt = stmt.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    doctor_auto_id = await get_medico_id_for_user(db, current_user)
    if doctor_auto_id is not None:
        stmt = stmt.where(ConsultaMedica.medico_id == doctor_auto_id)

    res = await db.execute(stmt)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    empresa = consulta.empresa
    if not empresa:
        empresa = await db.get(Empresa, consulta.empresa_id)

    if not empresa or not getattr(empresa, "jitsi_active", True):
        raise HTTPException(
            status_code=400,
            detail="El motor de videoconsulta Jitsi Meet está inactivo en Integraciones.",
        )

    await PlanQuotaService.check_telemedicina_access(db, consulta.empresa_id)

    # Si tiene cita vinculada de telemedicina, asegurar credenciales de la cita
    custom_room = None
    if consulta.cita:
        JitsiService.ensure_cita_credentials(consulta.cita, empresa)
        custom_room = consulta.cita.sala_virtual_id
        await db.commit()

    pac_nombre = (
        f"{consulta.paciente.nombres} {consulta.paciente.apellidos}".strip()
        if consulta.paciente
        else "Paciente"
    )
    esp_nombre = consulta.especialidad.nombre if consulta.especialidad else "Consulta Médica"

    if consulta.medico and current_user.id == consulta.medico.usuario_id:
        display_name = f"Dr(a). {consulta.medico.nombres} {consulta.medico.apellidos}".strip()
    else:
        display_name = f"{current_user.nombre} {current_user.apellido or ''}".strip() or current_user.email

    jitsi = JitsiService.from_empresa(empresa)
    session_data = jitsi.build_session(
        user_id=str(current_user.id),
        display_name=display_name,
        email=current_user.email,
        avatar_url=getattr(current_user, "avatar_url", None),
        is_moderator=True,
        context_type="consulta",
        reference_id=consulta.id,
        custom_room=custom_room,
        subject=f"Consulta #{consulta.codigo or consulta.id} • {pac_nombre} ({esp_nombre})",
    )

    db.add(
        AuditoriaLog(
            empresa_id=consulta.empresa_id,
            usuario_id=current_user.id,
            accion="INICIAR_CABINA_TELECONSULTA_MEDICO",
            modulo="telemedicina",
            detalles={
                "consulta_id": consulta.id,
                "sala_virtual_id": custom_room or session_data.get("room_slug"),
                "paciente_id": consulta.paciente_id,
                "provider": session_data.get("provider"),
            },
        )
    )
    await db.commit()

    return JitsiSessionResponse(**session_data)


class EnviarDocumentoWhatsAppRequest(BaseModel):
    tipo_documento: str = "todos"  # "todos", "receta", "estudios", "reposo", "constancia", "informe"
    telefono_personalizado: Optional[str] = None
    incluir_indicaciones: Optional[bool] = True
    texto_personalizado: Optional[str] = None
    acompanante: Optional[Dict[str, Any]] = None
    enviar_como_pdf: Optional[bool] = True
    documentos_seleccionados: Optional[List[str]] = None


@router.post("/{id}/enviar-documento-whatsapp")
async def enviar_documento_consulta_whatsapp(
    id: int,
    payload: EnviarDocumentoWhatsAppRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Despacha los documentos clínicos oficiales de la consulta (receta médica,
    orden de estudios, informe médico, reposo o constancia) directamente en
    formato PDF al WhatsApp verificado del paciente.
    """
    query = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.paciente),
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad),
            selectinload(ConsultaMedica.sucursal),
            selectinload(ConsultaMedica.empresa),
        )
        .where(ConsultaMedica.id == id)
    )
    if not current_user.es_superadmin:
        query = query.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(query)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    paciente = consulta.paciente
    if not paciente:
        raise HTTPException(status_code=400, detail="La consulta no tiene un paciente vinculado")

    raw_phone = payload.telefono_personalizado or paciente.telefono
    if not raw_phone or not str(raw_phone).strip():
        raise HTTPException(
            status_code=400,
            detail="El paciente no tiene un número telefónico registrado para despacho de WhatsApp",
        )

    empresa = consulta.empresa
    if not empresa:
        res_emp = await db.execute(select(Empresa).where(Empresa.id == consulta.empresa_id))
        empresa = res_emp.scalar_one_or_none()

    cod_pais = get_empresa_codigo_pais(empresa)
    clean_phone = format_clean_whatsapp_number(raw_phone, cod_pais)
    if not clean_phone:
        raise HTTPException(
            status_code=400,
            detail=f"El formato del número ({raw_phone}) no es válido para WhatsApp con código país {cod_pais}",
        )

    nombre_clinica = empresa.nombre if empresa else "Centro Médico"
    sucursal_nombre = consulta.sucursal.nombre if consulta.sucursal else "Sede Principal"
    nombre_doc = (
        f"{consulta.medico.nombres} {consulta.medico.apellidos}"
        if consulta.medico
        else current_user.nombre
    )
    esp_nombre = consulta.especialidad.nombre if consulta.especialidad else "Medicina General"
    pac_nombre = f"{paciente.nombres} {paciente.apellidos}".strip()
    pac_doc = f"{getattr(paciente, 'tipo_documento', 'V')}-{getattr(paciente, 'documento_identidad', '')}"
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"

    fecha_dt = getattr(consulta, "fecha_consulta", None) or getattr(consulta, "fecha", None)
    fecha_str = fecha_dt.strftime("%d/%m/%Y") if isinstance(fecha_dt, (datetime, date)) else datetime.now().strftime("%d/%m/%Y")

    wa_service, resolved_target, is_sucursal, using_fallback = await resolve_whatsapp_service(
        db, consulta.empresa_id, consulta.sucursal_id
    )

    # Determinar qué documentos deben enviarse
    tipo_solicitado = (payload.tipo_documento or "todos").lower().strip()
    doc_types: List[str] = []

    if tipo_solicitado == "todos":
        if payload.documentos_seleccionados and len(payload.documentos_seleccionados) > 0:
            doc_types = [d.lower().strip() for d in payload.documentos_seleccionados]
        else:
            # Documentos aplicables automáticos
            doc_types.append("informe")
            meds = getattr(consulta, "receta_medica", None) or getattr(consulta, "medicamentos_prescritos", None) or []
            if meds and len(meds) > 0:
                doc_types.append("receta")
            est = getattr(consulta, "estudios_solicitados", None) or []
            if est and len(est) > 0:
                doc_types.append("estudios")
            rep = getattr(consulta, "reposo_medico", {}) or {}
            if rep and (rep.get("requiere_reposo") or rep.get("dias_reposo")):
                doc_types.append("reposo")
            if payload.acompanante:
                doc_types.append("constancia")
    else:
        doc_types = [tipo_solicitado]

    # Metadatos para nombres de archivo y captions
    info_map = {
        "informe": ("Informe Médico Clínico", f"Informe_Medico_{folio}.pdf"),
        "receta": ("Receta Médica y Prescripción", f"Receta_Medica_{folio}.pdf"),
        "estudios": ("Orden de Estudios Médicos", f"Orden_Estudios_{folio}.pdf"),
        "reposo": ("Certificado de Reposo Médico", f"Reposo_Medico_{folio}.pdf"),
        "constancia": ("Constancia de Asistencia", f"Constancia_Asistencia_{folio}.pdf"),
    }

    doc_items = []
    for dt in doc_types:
        meta = info_map.get(dt, ("Documento Clínico", f"Documento_{folio}.pdf"))
        pdf_bytes = generate_clinical_document_pdf(
            tipo_documento=dt,
            consulta=consulta,
            empresa=empresa,
            sucursal=consulta.sucursal,
            acompanante=payload.acompanante,
        )
        doc_items.append({
            "tipo": dt,
            "titulo": meta[0],
            "filename": meta[1],
            "pdf_bytes": pdf_bytes,
        })

    # 1. Mensaje de cortesía e introducción formal en WhatsApp
    bullet_list = "\n".join([f"• 📄 *{d['titulo']}*" for d in doc_items])
    sep = "━━━━━━━━━━━━━━━━━━━━━━"
    mensaje_intro = (
        f"👋 Estimado(a) *{pac_nombre}*,\n\n"
        f"Desde *{nombre_clinica}* ({sucursal_nombre}) le hacemos entrega de sus documentos clínicos en formato PDF oficial emitidos por el(la) Dr(a). *{nombre_doc}*:\n\n"
        f"{sep}\n"
        f"📁 *DOCUMENTOS ADJUNTOS EN PDF:*\n"
        f"{bullet_list}\n"
        f"{sep}\n"
        f"🩺 *Especialidad:* {esp_nombre}\n"
        f"📅 *Fecha:* {fecha_str}\n"
        f"🆔 *Doc. Paciente:* {pac_doc}\n"
        f"📋 *Folio:* {folio}\n"
    )

    if payload.texto_personalizado and payload.texto_personalizado.strip():
        mensaje_intro += f"\n💬 *Nota del Especialista:*\n{payload.texto_personalizado.strip()}\n"

    mensaje_intro += (
        f"\n🔒 _Documentos oficiales digitales generados y autenticados en MediSoft Suite._\n"
        f"📞 Ante cualquier consulta sobre su tratamiento, no dude en contactarnos."
    )

    # Despachar mensaje de saludo inicial
    await wa_service.send_message(to=clean_phone, message=mensaje_intro)

    # 2. Despachar cada documento PDF de forma nativa por WhatsApp
    enviados = []
    errores = []
    for doc in doc_items:
        try:
            res_doc = await wa_service.send_document(
                to=clean_phone,
                file_bytes=doc["pdf_bytes"],
                filename=doc["filename"],
                caption=f"📄 {doc['titulo']} • Folio {folio}",
                mimetype="application/pdf",
                simulate_typing=True,
            )
            success = bool(res_doc.get("success", True))
            enviados.append({
                "tipo": doc["tipo"],
                "titulo": doc["titulo"],
                "filename": doc["filename"],
                "message_id": res_doc.get("message_id"),
                "success": success,
            })
            if not success:
                errores.append(f"{doc['titulo']}: {res_doc.get('error', 'Error en despacho')}")
        except Exception as doc_err:
            logger.error(f"Error enviando PDF {doc['filename']} a {clean_phone}: {doc_err}")
            errores.append(f"{doc['titulo']}: {str(doc_err)}")
        await asyncio.sleep(0.6)

    # Registro de Auditoría
    db.add(
        AuditoriaLog(
            empresa_id=consulta.empresa_id,
            usuario_id=current_user.id,
            accion="ENVIAR_DOCUMENTOS_PDF_WHATSAPP",
            modulo="consultas",
            detalles={
                "consulta_id": consulta.id,
                "paciente_id": paciente.id,
                "destinatario": clean_phone,
                "documentos": [d["tipo"] for d in doc_items],
                "total_enviados": len(enviados),
                "errores": errores,
            },
        )
    )
    await db.commit()

    total_exitos = sum(1 for d in enviados if d.get("success"))
    res_msg = (
        f"{total_exitos} documento(s) en formato PDF despachados exitosamente por WhatsApp."
        if total_exitos > 1
        else f"Documento PDF ({doc_items[0]['titulo']}) despachado exitosamente por WhatsApp."
    )

    return {
        "success": total_exitos > 0,
        "message": res_msg,
        "destinatario": clean_phone,
        "total_documentos": len(doc_items),
        "documentos_enviados": [d["titulo"] for d in enviados if d.get("success")],
        "enviados_detalle": enviados,
        "preview_mensaje": mensaje_intro,
        "errores": errores if errores else None,
    }


@router.get("/{id}/documento-pdf")
async def descargar_documento_consulta_pdf(
    id: int,
    tipo: str = Query("informe", description="Tipo de documento: informe, receta, estudios, reposo, constancia"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("consultas.ver")),
):
    """
    Descarga o previsualiza en el navegador el PDF clínico oficial del documento
    especificado con membrete institucional, datos del médico y paciente.
    """
    query = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.paciente),
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.especialidad),
            selectinload(ConsultaMedica.sucursal),
            selectinload(ConsultaMedica.empresa),
        )
        .where(ConsultaMedica.id == id)
    )
    if not current_user.es_superadmin:
        query = query.where(ConsultaMedica.empresa_id == current_user.empresa_id)

    res = await db.execute(query)
    consulta = res.scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    empresa = consulta.empresa
    if not empresa:
        res_emp = await db.execute(select(Empresa).where(Empresa.id == consulta.empresa_id))
        empresa = res_emp.scalar_one_or_none()

    clean_tipo = (tipo or "informe").lower().strip()
    folio = getattr(consulta, "codigo", None) or f"CON-{consulta.id}"
    pdf_bytes = generate_clinical_document_pdf(
        tipo_documento=clean_tipo,
        consulta=consulta,
        empresa=empresa,
        sucursal=consulta.sucursal,
    )
    filename = f"{clean_tipo.capitalize()}_{folio}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
