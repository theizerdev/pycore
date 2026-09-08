from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, func

from app.core.database import get_db, ensure_tables_exist
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.especialidad import Especialidad
from app.models.servicio import Servicio
from app.models.sucursal import Sucursal
from app.models.medico import Medico
from app.schemas.servicio import ServicioCreate, ServicioUpdate, ServicioResponse
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/servicios", tags=["Servicios Médicos"])

async def get_medico_for_user(db: AsyncSession, user: Usuario) -> Optional[Medico]:
    """Obtiene la ficha médica asociada al usuario autenticado dentro de su empresa."""
    if user.es_superadmin:
        return None
    stmt = select(Medico).where(
        Medico.empresa_id == user.empresa_id,
        or_(
            Medico.usuario_id == user.id,
            func.lower(Medico.email) == user.email.lower()
        )
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()

# Catálogo por defecto de servicios recomendados según especialidad médica
DEFAULT_SERVICIOS_POR_ESPECIALIDAD = {
    "Medicina General": [
        {"nombre": "Consulta Médica General", "codigo": "CONS-MED-GEN", "categoria": "Consulta", "precio_base": 20.00, "duracion": 30, "desc": "Evaluación clínica integral y diagnóstico general."},
        {"nombre": "Control y Seguimiento Médico", "codigo": "CTRL-MED-GEN", "categoria": "Consulta", "precio_base": 15.00, "duracion": 20, "desc": "Revisión de evolución, ajuste de tratamiento y exámenes."},
        {"nombre": "Curación y Sutura Menor", "codigo": "PROC-CURA-01", "categoria": "Procedimiento", "precio_base": 25.00, "duracion": 30, "desc": "Limpieza, desinfección y curación de heridas superficiales."},
        {"nombre": "Certificado de Salud Integral", "codigo": "CERT-SAL-01", "categoria": "Consulta", "precio_base": 15.00, "duracion": 20, "desc": "Examen físico para expedición de certificado médico oficial."},
    ],
    "Cardiología": [
        {"nombre": "Consulta Cardiológica Especializada", "codigo": "CONS-CARDIO", "categoria": "Consulta", "precio_base": 40.00, "duracion": 40, "desc": "Valoración cardiovascular y riesgo coronario."},
        {"nombre": "Electrocardiograma (ECG) 12 Derivaciones", "codigo": "EST-ECG-12D", "categoria": "Estudio Diagnóstico", "precio_base": 25.00, "duracion": 20, "desc": "Registro de la actividad eléctrica del corazón."},
        {"nombre": "Ecocardiograma Transtorácico Doppler", "codigo": "EST-ECO-CARD", "categoria": "Estudio Diagnóstico", "precio_base": 70.00, "duracion": 45, "desc": "Evaluación ultrasonográfica de cavidades y válvulas cardíacas."},
        {"nombre": "Monitoreo Holter de Ritmo 24 Horas", "codigo": "EST-HOLTER-24", "categoria": "Estudio Diagnóstico", "precio_base": 65.00, "duracion": 30, "desc": "Registro continuo ambulatorio del ritmo cardíaco."},
        {"nombre": "Mapa Presión Arterial (MAPA 24h)", "codigo": "EST-MAPA-24", "categoria": "Estudio Diagnóstico", "precio_base": 55.00, "duracion": 30, "desc": "Monitoreo ambulatorio de presión arterial continua."},
    ],
    "Pediatría": [
        {"nombre": "Consulta Pediátrica y Control de Crecimiento", "codigo": "CONS-PED-01", "categoria": "Consulta", "precio_base": 30.00, "duracion": 30, "desc": "Evaluación del desarrollo infantil, nutrición y vacunas."},
        {"nombre": "Consulta Pediátrica de Urgencia Menor", "codigo": "CONS-PED-URG", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Atención facultativa para cuadros febriles o respiratorios."},
        {"nombre": "Nebulización Terapéutica Pediátrica", "codigo": "PROC-NEB-PED", "categoria": "Terapia / Rehabilitación", "precio_base": 15.00, "duracion": 20, "desc": "Terapia respiratoria asistida con broncodilatadores."},
        {"nombre": "Control de Niño Sano", "codigo": "CTRL-NINO-SANO", "categoria": "Consulta", "precio_base": 25.00, "duracion": 30, "desc": "Chequeo periódico de hitos del desarrollo psicomotor."},
    ],
    "Ginecología y Obstetricia": [
        {"nombre": "Consulta Ginecológica Integral", "codigo": "CONS-GIN-INT", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Revisión ginecológica y salud preventiva femenina."},
        {"nombre": "Citología Cervicovaginal (Papanicolaou)", "codigo": "EST-PAP-01", "categoria": "Estudio Diagnóstico", "precio_base": 20.00, "duracion": 15, "desc": "Toma de muestra para despistaje oncológico cervical."},
        {"nombre": "Ecografía Transvaginal / Pélvica", "codigo": "EST-ECO-GIN", "categoria": "Estudio Diagnóstico", "precio_base": 40.00, "duracion": 30, "desc": "Evaluación ecográfica de útero y anexos."},
        {"nombre": "Control Prenatal Obstétrico", "codigo": "CTRL-PRENATAL", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Seguimiento periódico de la gestación y bienestar fetal."},
        {"nombre": "Colposcopia Diagnóstica", "codigo": "PROC-COLPOSC", "categoria": "Procedimiento", "precio_base": 50.00, "duracion": 30, "desc": "Inspección microscópica del cuello uterino."},
    ],
    "Traumatología y Ortopedia": [
        {"nombre": "Consulta Traumatológica y Articular", "codigo": "CONS-TRAUMA", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Valoración de lesiones óseas, articulares y musculares."},
        {"nombre": "Infiltración Articular / Terapéutica", "codigo": "PROC-INFILT", "categoria": "Procedimiento", "precio_base": 45.00, "duracion": 25, "desc": "Inyección intraarticular de analgésicos o corticoides."},
        {"nombre": "Inmovilización con Férula o Yeso", "codigo": "PROC-YESO-01", "categoria": "Procedimiento", "precio_base": 40.00, "duracion": 30, "desc": "Colocación de inmovilización para fracturas o esguinces."},
    ],
    "Dermatología": [
        {"nombre": "Consulta Dermatológica Especializada", "codigo": "CONS-DERMA", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Evaluación de patologías cutáneas, cabello y uñas."},
        {"nombre": "Dermatoscopia de Lunares y Lesiones", "codigo": "EST-DERMATOS", "categoria": "Estudio Diagnóstico", "precio_base": 30.00, "duracion": 20, "desc": "Mapeo y análisis óptico de lesiones pigmentadas."},
        {"nombre": "Cauterización / Crioterapia de Lesiones", "codigo": "PROC-CRIO-DERM", "categoria": "Procedimiento", "precio_base": 45.00, "duracion": 30, "desc": "Eliminación de verrugas o queratosis superficiales."},
        {"nombre": "Biopsia de Piel por Sacabocados (Punch)", "codigo": "PROC-BIO-PIEL", "categoria": "Procedimiento", "precio_base": 60.00, "duracion": 30, "desc": "Toma de tejido cutáneo para estudio histopatológico."},
    ],
    "Odontología General": [
        {"nombre": "Evaluación y Diagnóstico Odontológico", "codigo": "CONS-ODONT-01", "categoria": "Consulta", "precio_base": 20.00, "duracion": 30, "desc": "Examen bucodental completo con odontograma."},
        {"nombre": "Limpieza Dental con Ultrasonido y Profilaxis", "codigo": "PROC-PROFILAX", "categoria": "Procedimiento", "precio_base": 30.00, "duracion": 40, "desc": "Eliminación de tártaro, placa bacteriana y pulido dental."},
        {"nombre": "Restauración con Resina Fotocurada", "codigo": "PROC-RESINA", "categoria": "Procedimiento", "precio_base": 35.00, "duracion": 45, "desc": "Tratamiento de caries y obturación estética."},
        {"nombre": "Extracción Dental Simple", "codigo": "PROC-EXTRAC", "categoria": "Cirugía / Ambulatorio", "precio_base": 35.00, "duracion": 40, "desc": "Exodoncia de pieza dental erupcionada no compleja."},
    ],
    "Oftalmología": [
        {"nombre": "Consulta Oftalmológica y Refracción", "codigo": "CONS-OFTALMO", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Agudeza visual, examen de fondo de ojo y refracción."},
        {"nombre": "Tonometría Ocular (Presión Intraocular)", "codigo": "EST-TONOMETRIA", "categoria": "Estudio Diagnóstico", "precio_base": 20.00, "duracion": 15, "desc": "Medición de presión intraocular para descarte de glaucoma."},
        {"nombre": "Biomicroscopía con Lámpara de Hendidura", "codigo": "EST-LAMP-HEND", "categoria": "Estudio Diagnóstico", "precio_base": 25.00, "duracion": 20, "desc": "Examen detallado de córnea, iris y cristalino."},
    ],
    "Otorrinolaringología": [
        {"nombre": "Consulta Otorrinolaringológica", "codigo": "CONS-ORL-01", "categoria": "Consulta", "precio_base": 35.00, "duracion": 30, "desc": "Examen de oídos, nariz, senos paranasales y laringe."},
        {"nombre": "Lavado de Oído / Extracción de Cerumen", "codigo": "PROC-LAV-OIDO", "categoria": "Procedimiento", "precio_base": 25.00, "duracion": 20, "desc": "Irrigación o aspiración de tapón de cerumen unilateral o bilateral."},
        {"nombre": "Nasofibrolaringoscopia Diagnóstica", "codigo": "EST-NASOFIBRO", "categoria": "Estudio Diagnóstico", "precio_base": 60.00, "duracion": 30, "desc": "Exploración endoscópica de vías aéreas superiores."},
    ],
    "Gastroenterología": [
        {"nombre": "Consulta Gastroenterológica", "codigo": "CONS-GASTRO", "categoria": "Consulta", "precio_base": 40.00, "duracion": 35, "desc": "Evaluación del aparato digestivo, reflujo y colon irritable."},
        {"nombre": "Endoscopia Digestiva Superior", "codigo": "EST-ENDOSCOPIA", "categoria": "Estudio Diagnóstico", "precio_base": 120.00, "duracion": 45, "desc": "Exploración endoscópica de esófago, estómago y duodeno."},
        {"nombre": "Colonoscopia Diagnóstica", "codigo": "EST-COLONOSC", "categoria": "Estudio Diagnóstico", "precio_base": 150.00, "duracion": 60, "desc": "Estudio endoscópico del colon y recto."},
    ],
}

@router.get("", response_model=List[ServicioResponse])
async def list_servicios(
    especialidad_id: Optional[int] = Query(None, description="Filtrar por especialidad médica"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal específica"),
    include_global: bool = Query(True, description="Incluir servicios globales de la empresa"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría (Consulta, Procedimiento, etc.)"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    search: Optional[str] = Query(None, description="Búsqueda por nombre o código"),
    empresa_id: Optional[int] = Query(None, description="Filtrar por empresa (solo superadmin)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    await ensure_tables_exist()
    stmt = select(Servicio).options(selectinload(Servicio.especialidad), selectinload(Servicio.sucursal))

    # 1. Filtro Multi-Tenant
    if not current_user.es_superadmin:
        stmt = stmt.where(Servicio.empresa_id == current_user.empresa_id)
    elif empresa_id is not None:
        stmt = stmt.where(Servicio.empresa_id == empresa_id)

    # 2. Restricción por Perfil Médico: Si el usuario es médico, filtrar exclusivamente por su especialidad
    medico = await get_medico_for_user(db, current_user)
    is_doctor = bool(current_user.rol and current_user.rol.slug == "medico") or (medico is not None)

    if is_doctor:
        if medico and medico.especialidad_id:
            stmt = stmt.where(Servicio.especialidad_id == medico.especialidad_id)
        else:
            # Médico sin especialidad asignada: no mostrar servicios de otras especialidades
            stmt = stmt.where(Servicio.especialidad_id == -1)
    elif especialidad_id is not None:
        stmt = stmt.where(Servicio.especialidad_id == especialidad_id)

    # 3. Filtro por Sucursal
    if sucursal_id is not None:
        if include_global:
            stmt = stmt.where(or_(Servicio.sucursal_id == sucursal_id, Servicio.sucursal_id.is_(None)))
        else:
            stmt = stmt.where(Servicio.sucursal_id == sucursal_id)

    # 4. Filtro por Categoría
    if categoria:
        stmt = stmt.where(Servicio.categoria == categoria)

    # 5. Filtro por Estado
    if activo is not None:
        stmt = stmt.where(Servicio.activo == activo)

    # 6. Filtro por Búsqueda
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            Servicio.nombre.ilike(term),
            Servicio.codigo.ilike(term),
            Servicio.descripcion.ilike(term)
        ))

    stmt = stmt.order_by(Servicio.especialidad_id.asc(), Servicio.categoria.asc(), Servicio.nombre.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{servicio_id}", response_model=ServicioResponse)
async def get_servicio(
    servicio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    await ensure_tables_exist()
    stmt = select(Servicio).options(selectinload(Servicio.especialidad), selectinload(Servicio.sucursal)).where(Servicio.id == servicio_id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Servicio.empresa_id == current_user.empresa_id)
    
    result = await db.execute(stmt)
    servicio = result.scalar_one_or_none()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio médico no encontrado")

    # Validación de especialidad si el usuario es médico
    medico = await get_medico_for_user(db, current_user)
    is_doctor = bool(current_user.rol and current_user.rol.slug == "medico") or (medico is not None)
    if is_doctor:
        doctor_esp_id = medico.especialidad_id if medico else None
        if not doctor_esp_id or servicio.especialidad_id != doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene autorización para acceder a servicios de otra especialidad médica."
            )

    return servicio

@router.post("", response_model=ServicioResponse, status_code=status.HTTP_201_CREATED)
async def create_servicio(
    payload: ServicioCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("servicios.crear"))
):
    await ensure_tables_exist()
    empresa_id = current_user.empresa_id

    # Validación de especialidad si el usuario es médico
    medico = await get_medico_for_user(db, current_user)
    is_doctor = bool(current_user.rol and current_user.rol.slug == "medico") or (medico is not None)
    if is_doctor:
        doctor_esp_id = medico.especialidad_id if medico else None
        if not doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Su perfil médico no tiene una especialidad asignada en el sistema."
            )
        if payload.especialidad_id != doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo tiene autorización para crear servicios para su propia especialidad médica."
            )

    # Verificar que la especialidad exista y pertenezca a la empresa
    stmt_esp = select(Especialidad).where(Especialidad.id == payload.especialidad_id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=400, detail="La especialidad médica especificada no existe o no pertenece a la empresa")

    # Si se especificó sucursal, validar existencia
    if payload.sucursal_id:
        stmt_suc = select(Sucursal).where(Sucursal.id == payload.sucursal_id, Sucursal.empresa_id == empresa_id)
        res_suc = await db.execute(stmt_suc)
        if not res_suc.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="La sucursal especificada no existe o no pertenece a la empresa")

    nuevo_servicio = Servicio(
        empresa_id=empresa_id,
        especialidad_id=payload.especialidad_id,
        sucursal_id=payload.sucursal_id,
        codigo=payload.codigo.strip() if payload.codigo else None,
        nombre=payload.nombre.strip(),
        descripcion=payload.descripcion.strip() if payload.descripcion else None,
        categoria=payload.categoria.strip(),
        precio_base=payload.precio_base,
        duracion_estimada_minutos=payload.duracion_estimada_minutos,
        preparacion_requerida=payload.preparacion_requerida.strip() if payload.preparacion_requerida else None,
        requiere_medico=payload.requiere_medico,
        color=payload.color or esp.color or "#0ea5e9",
        activo=payload.activo
    )

    db.add(nuevo_servicio)
    await db.commit()

    stmt_reload = select(Servicio).options(selectinload(Servicio.especialidad), selectinload(Servicio.sucursal)).where(Servicio.id == nuevo_servicio.id)
    res_reload = await db.execute(stmt_reload)
    servicio_obj = res_reload.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="CREAR_SERVICIO",
        modulo="servicios",
        request=request,
        detalles={
            "servicio_id": servicio_obj.id,
            "nombre": servicio_obj.nombre,
            "codigo": servicio_obj.codigo,
            "precio_base": float(servicio_obj.precio_base) if servicio_obj.precio_base else 0.0
        }
    )

    return servicio_obj

@router.put("/{servicio_id}", response_model=ServicioResponse)
async def update_servicio(
    servicio_id: int,
    payload: ServicioUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("servicios.editar"))
):
    await ensure_tables_exist()
    stmt = select(Servicio).where(Servicio.id == servicio_id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Servicio.empresa_id == current_user.empresa_id)

    result = await db.execute(stmt)
    servicio = result.scalar_one_or_none()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio médico no encontrado")

    # Validación de especialidad si el usuario es médico
    medico = await get_medico_for_user(db, current_user)
    is_doctor = bool(current_user.rol and current_user.rol.slug == "medico") or (medico is not None)
    if is_doctor:
        doctor_esp_id = medico.especialidad_id if medico else None
        if not doctor_esp_id or servicio.especialidad_id != doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene autorización para modificar servicios de otra especialidad médica."
            )
        if payload.especialidad_id is not None and payload.especialidad_id != doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puede reasignar un servicio a una especialidad distinta a la suya."
            )

    update_data = payload.dict(exclude_unset=True)

    # Validar especialidad si se cambia
    if "especialidad_id" in update_data and update_data["especialidad_id"] is not None:
        stmt_esp = select(Especialidad).where(Especialidad.id == update_data["especialidad_id"])
        if not current_user.es_superadmin:
            stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
        res_esp = await db.execute(stmt_esp)
        if not res_esp.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="La especialidad especificada no es válida")

    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
        setattr(servicio, field, value)

    await db.commit()

    stmt_reload = select(Servicio).options(selectinload(Servicio.especialidad), selectinload(Servicio.sucursal)).where(Servicio.id == servicio.id)
    res_reload = await db.execute(stmt_reload)
    servicio_obj = res_reload.scalar_one()

    # Convertir Decimals en update_data para serialización JSON segura en auditoría
    detalles_dict = {}
    for k, v in update_data.items():
        detalles_dict[k] = float(v) if hasattr(v, '__float__') and not isinstance(v, (int, float, bool)) else v

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="EDITAR_SERVICIO",
        modulo="servicios",
        request=request,
        detalles={
            "servicio_id": servicio_obj.id,
            "nombre": servicio_obj.nombre,
            "cambios": detalles_dict
        }
    )

    return servicio_obj

@router.delete("/{servicio_id}")
async def delete_servicio(
    servicio_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("servicios.eliminar"))
):
    await ensure_tables_exist()
    stmt = select(Servicio).where(Servicio.id == servicio_id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Servicio.empresa_id == current_user.empresa_id)

    result = await db.execute(stmt)
    servicio = result.scalar_one_or_none()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio médico no encontrado")

    # Validación de especialidad si el usuario es médico
    medico = await get_medico_for_user(db, current_user)
    is_doctor = bool(current_user.rol and current_user.rol.slug == "medico") or (medico is not None)
    if is_doctor:
        doctor_esp_id = medico.especialidad_id if medico else None
        if not doctor_esp_id or servicio.especialidad_id != doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene autorización para eliminar servicios de otra especialidad médica."
            )

    nombre_srv = servicio.nombre
    codigo_srv = servicio.codigo

    await db.delete(servicio)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ELIMINAR_SERVICIO",
        modulo="servicios",
        request=request,
        detalles={
            "servicio_id": servicio_id,
            "nombre": nombre_srv,
            "codigo": codigo_srv
        }
    )

    return {"message": "Servicio médico eliminado exitosamente", "id": servicio_id}

@router.post("/seed-defaults", response_model=List[ServicioResponse])
async def seed_default_servicios(
    sucursal_id: Optional[int] = Query(None, description="Sucursal a asociar (opcional)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("servicios.crear"))
):
    """Puebla automáticamente servicios sugeridos para las especialidades activas de la empresa."""
    await ensure_tables_exist()
    empresa_id = current_user.empresa_id

    # Si es médico, restringir sincronización a su especialidad asignada
    medico = await get_medico_for_user(db, current_user)
    is_doctor = bool(current_user.rol and current_user.rol.slug == "medico") or (medico is not None)
    doctor_esp_id = None
    if is_doctor:
        doctor_esp_id = medico.especialidad_id if medico else None
        if not doctor_esp_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Su perfil médico no tiene una especialidad asignada para sincronizar servicios."
            )

    # Obtener todas las especialidades activas de la empresa (o restringidas a la del médico)
    stmt_esp = select(Especialidad).where(
        Especialidad.empresa_id == empresa_id,
        Especialidad.activo == True
    )
    if is_doctor and doctor_esp_id:
        stmt_esp = stmt_esp.where(Especialidad.id == doctor_esp_id)

    res_esp = await db.execute(stmt_esp)
    especialidades = res_esp.scalars().all()

    if not especialidades:
        raise HTTPException(status_code=400, detail="No hay especialidades registradas en la empresa para generar servicios.")

    servicios_creados = []

    for esp in especialidades:
        plantillas = DEFAULT_SERVICIOS_POR_ESPECIALIDAD.get(esp.nombre)
        if not plantillas:
            # Plantilla genérica para cualquier otra especialidad
            plantillas = [
                {
                    "nombre": f"Consulta de {esp.nombre}",
                    "codigo": f"CONS-{esp.codigo or esp.nombre[:4].upper()}",
                    "categoria": "Consulta",
                    "precio_base": 30.00,
                    "duracion": 30,
                    "desc": f"Evaluación y valoración médica en {esp.nombre}."
                },
                {
                    "nombre": f"Control y Evolución de {esp.nombre}",
                    "codigo": f"CTRL-{esp.codigo or esp.nombre[:4].upper()}",
                    "categoria": "Consulta",
                    "precio_base": 20.00,
                    "duracion": 20,
                    "desc": f"Seguimiento y control clínico en {esp.nombre}."
                }
            ]

        for s_def in plantillas:
            # Verificar si ya existe un servicio con ese nombre para esta especialidad
            stmt_check = select(Servicio).where(
                Servicio.empresa_id == empresa_id,
                Servicio.especialidad_id == esp.id,
                Servicio.nombre == s_def["nombre"]
            )
            res_check = await db.execute(stmt_check)
            if res_check.scalar_one_or_none():
                continue

            nuevo = Servicio(
                empresa_id=empresa_id,
                especialidad_id=esp.id,
                sucursal_id=sucursal_id,
                codigo=s_def["codigo"],
                nombre=s_def["nombre"],
                descripcion=s_def.get("desc"),
                categoria=s_def.get("categoria", "Consulta"),
                precio_base=s_def.get("precio_base", 0.00),
                duracion_estimada_minutos=s_def.get("duracion", 30),
                color=esp.color or "#0ea5e9",
                activo=True
            )
            db.add(nuevo)
            servicios_creados.append(nuevo)

    if servicios_creados:
        await db.commit()
        for s in servicios_creados:
            await db.refresh(s)

    # Retornar lista completa actualizada (o filtrada si es médico)
    stmt_all = select(Servicio).options(selectinload(Servicio.especialidad), selectinload(Servicio.sucursal)).where(Servicio.empresa_id == empresa_id)
    if is_doctor and doctor_esp_id:
        stmt_all = stmt_all.where(Servicio.especialidad_id == doctor_esp_id)
    stmt_all = stmt_all.order_by(Servicio.especialidad_id.asc(), Servicio.nombre.asc())
    res_all = await db.execute(stmt_all)
    return res_all.scalars().all()
