from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.especialidad import Especialidad
from app.models.sucursal import Sucursal
from app.schemas.especialidad import EspecialidadCreate, EspecialidadUpdate, EspecialidadResponse

router = APIRouter(prefix="/especialidades", tags=["Especialidades"])

DEFAULT_CLINICAL_SPECIALTIES = [
    {"nombre": "Medicina General", "codigo": "MED-GEN", "descripcion": "Atención primaria, diagnóstico preventivo y control médico general", "color": "#0ea5e9", "icono": "Stethoscope"},
    {"nombre": "Pediatría", "codigo": "PED-01", "descripcion": "Cuidado integral y desarrollo médico desde la infancia hasta la adolescencia", "color": "#ec4899", "icono": "Baby"},
    {"nombre": "Ginecología y Obstetricia", "codigo": "GIN-01", "descripcion": "Salud integral femenina, control prenatal y salud reproductiva", "color": "#a855f7", "icono": "HeartPulse"},
    {"nombre": "Cardiología", "codigo": "CARD-01", "descripcion": "Diagnóstico y tratamiento de patologías cardiovasculares y ritmo cardíaco", "color": "#ef4444", "icono": "Activity"},
    {"nombre": "Traumatología y Ortopedia", "codigo": "TRAUM-01", "descripcion": "Atención de lesiones músculo-esqueléticas, fracturas y rehabilitación articular", "color": "#f97316", "icono": "Bone"},
    {"nombre": "Odontología", "codigo": "ODONT-01", "descripcion": "Salud bucodental, ortodoncia, endodoncia y estética dental", "color": "#06b6d4", "icono": "Sparkles"},
    {"nombre": "Oftalmología", "codigo": "OFT-01", "descripcion": "Salud visual, fondo de ojo, refracción y tratamientos oculares", "color": "#3b82f6", "icono": "Eye"},
    {"nombre": "Dermatología", "codigo": "DERM-01", "descripcion": "Diagnóstico y cuidado clínico de afecciones de la piel, cabello y uñas", "color": "#14b8a6", "icono": "ShieldCheck"},
    {"nombre": "Neurología", "codigo": "NEUR-01", "descripcion": "Tratamiento de trastornos del sistema nervioso central y periférico", "color": "#6366f1", "icono": "Brain"},
    {"nombre": "Nutrición y Dietética", "codigo": "NUTR-01", "descripcion": "Evaluación nutricional, planes alimenticios y soporte metabólico", "color": "#84cc16", "icono": "Apple"},
    {"nombre": "Psicología y Psiquiatría", "codigo": "PSIC-01", "descripcion": "Salud mental, bienestar emocional, psicoterapia y acompañamiento cognitivo", "color": "#8b5cf6", "icono": "Smile"},
    {"nombre": "Urología", "codigo": "URO-01", "descripcion": "Diagnóstico y tratamiento del sistema urinario y aparato reproductor masculino", "color": "#f59e0b", "icono": "Activity"},
]

@router.get("", response_model=List[EspecialidadResponse])
async def list_especialidades(
    sucursal_id: Optional[int] = Query(None, description="Filtrar por ID de sucursal específica"),
    include_global: bool = Query(True, description="Si es True y se pasa sucursal_id, incluye también las especialidades globales"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    search: Optional[str] = Query(None, description="Búsqueda por nombre o código"),
    empresa_id: Optional[int] = Query(None, description="Filtrar por empresa (solo superadmin)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Especialidad)

    # 1. Filtro Multi-Tenant por Empresa
    if not current_user.es_superadmin:
        stmt = stmt.where(Especialidad.empresa_id == current_user.empresa_id)
    elif empresa_id is not None:
        stmt = stmt.where(Especialidad.empresa_id == empresa_id)

    # 2. Filtro por Sucursal
    if sucursal_id is not None:
        if include_global:
            stmt = stmt.where(or_(Especialidad.sucursal_id == sucursal_id, Especialidad.sucursal_id.is_(None)))
        else:
            stmt = stmt.where(Especialidad.sucursal_id == sucursal_id)

    # 3. Filtro por Estado
    if activo is not None:
        stmt = stmt.where(Especialidad.activo == activo)

    # 4. Filtro por Texto / Búsqueda
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Especialidad.nombre.ilike(search_pattern),
                Especialidad.codigo.ilike(search_pattern),
                Especialidad.descripcion.ilike(search_pattern),
            )
        )

    stmt = stmt.order_by(Especialidad.nombre.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{id}", response_model=EspecialidadResponse)
async def get_especialidad(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Especialidad.empresa_id == current_user.empresa_id)

    result = await db.execute(stmt)
    especialidad = result.scalar_one_or_none()
    if not especialidad:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad médica no encontrada")
    return especialidad

@router.post("", response_model=EspecialidadResponse, status_code=status.HTTP_201_CREATED)
async def create_especialidad(
    req: EspecialidadCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.crear"))
):
    target_empresa_id = req.empresa_id if (current_user.es_superadmin and req.empresa_id) else current_user.empresa_id

    if not target_empresa_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere una empresa para registrar la especialidad")

    # Si se especifica sucursal, validar que pertenezca a la misma empresa
    if req.sucursal_id:
        stmt_suc = select(Sucursal).where(Sucursal.id == req.sucursal_id, Sucursal.empresa_id == target_empresa_id)
        res_suc = await db.execute(stmt_suc)
        if not res_suc.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La sucursal indicada no pertenece a la empresa seleccionada")

    nueva_esp = Especialidad(
        empresa_id=target_empresa_id,
        sucursal_id=req.sucursal_id,
        nombre=req.nombre.strip(),
        codigo=req.codigo.strip() if req.codigo else None,
        descripcion=req.descripcion.strip() if req.descripcion else None,
        color=req.color or "#0ea5e9",
        icono=req.icono or "Stethoscope",
        activo=req.activo
    )

    db.add(nueva_esp)
    await db.commit()
    await db.refresh(nueva_esp)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=target_empresa_id,
        accion="CREAR_ESPECIALIDAD",
        modulo="especialidades",
        request=request,
        detalles={
            "mensaje": f"Especialidad médica '{nueva_esp.nombre}' creada con código {nueva_esp.codigo or 'N/A'}",
            "especialidad_id": nueva_esp.id
        }
    )

    return nueva_esp

@router.put("/{id}", response_model=EspecialidadResponse)
async def update_especialidad(
    id: int,
    req: EspecialidadUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.editar"))
):
    stmt = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Especialidad.empresa_id == current_user.empresa_id)

    result = await db.execute(stmt)
    esp = result.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad médica no encontrada")

    # Validar sucursal si se está actualizando
    if req.sucursal_id is not None:
        if req.sucursal_id > 0:
            stmt_suc = select(Sucursal).where(Sucursal.id == req.sucursal_id, Sucursal.empresa_id == esp.empresa_id)
            res_suc = await db.execute(stmt_suc)
            if not res_suc.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La sucursal indicada no pertenece a la empresa de esta especialidad")
            esp.sucursal_id = req.sucursal_id
        else:
            esp.sucursal_id = None

    if req.nombre is not None:
        esp.nombre = req.nombre.strip()
    if req.codigo is not None:
        esp.codigo = req.codigo.strip() if req.codigo else None
    if req.descripcion is not None:
        esp.descripcion = req.descripcion.strip() if req.descripcion else None
    if req.color is not None:
        esp.color = req.color
    if req.icono is not None:
        esp.icono = req.icono
    if req.activo is not None:
        esp.activo = req.activo

    await db.commit()
    await db.refresh(esp)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=esp.empresa_id,
        accion="ACTUALIZAR_ESPECIALIDAD",
        modulo="especialidades",
        request=request,
        detalles={
            "mensaje": f"Especialidad médica '{esp.nombre}' (ID {esp.id}) actualizada",
            "especialidad_id": esp.id
        }
    )

    return esp

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_especialidad(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.eliminar"))
):
    stmt = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Especialidad.empresa_id == current_user.empresa_id)

    result = await db.execute(stmt)
    esp = result.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    nombre_esp = esp.nombre
    empresa_id = esp.empresa_id

    await db.delete(esp)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="ELIMINAR_ESPECIALIDAD",
        modulo="especialidades",
        request=request,
        detalles={
            "mensaje": f"Especialidad médica '{nombre_esp}' (ID {id}) eliminada del sistema",
            "especialidad_id": id
        }
    )

    return {"message": f"Especialidad '{nombre_esp}' eliminada correctamente"}

@router.post("/seed-defaults", response_model=List[EspecialidadResponse])
async def seed_default_especialidades(
    request: Request,
    sucursal_id: Optional[int] = Query(None, description="Sucursal a la que asociar las especialidades (opcional)"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.crear"))
):
    target_empresa_id = current_user.empresa_id
    if not target_empresa_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El usuario no tiene una empresa asignada")

    # Si se pasa sucursal_id, verificarla
    if sucursal_id:
        stmt_suc = select(Sucursal).where(Sucursal.id == sucursal_id, Sucursal.empresa_id == target_empresa_id)
        res_suc = await db.execute(stmt_suc)
        if not res_suc.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La sucursal indicada no existe o no pertenece a tu empresa")

    # Obtener nombres existentes para evitar duplicados
    stmt_exist = select(Especialidad.nombre).where(Especialidad.empresa_id == target_empresa_id)
    if sucursal_id:
        stmt_exist = stmt_exist.where(or_(Especialidad.sucursal_id == sucursal_id, Especialidad.sucursal_id.is_(None)))
    res_exist = await db.execute(stmt_exist)
    existentes = set(name.lower() for name in res_exist.scalars().all())

    creadas = []
    for item in DEFAULT_CLINICAL_SPECIALTIES:
        if item["nombre"].lower() not in existentes:
            esp = Especialidad(
                empresa_id=target_empresa_id,
                sucursal_id=sucursal_id,
                nombre=item["nombre"],
                codigo=item["codigo"],
                descripcion=item["descripcion"],
                color=item["color"],
                icono=item["icono"],
                activo=True
            )
            db.add(esp)
            creadas.append(esp)

    if creadas:
        await db.commit()
        for esp in creadas:
            await db.refresh(esp)

        await registrar_auditoria(
            db=db,
            usuario_id=current_user.id,
            empresa_id=target_empresa_id,
            accion="POBLAR_ESPECIALIDADES",
            modulo="especialidades",
            request=request,
            detalles={
                "mensaje": f"Cargado catálogo sugerido de {len(creadas)} especialidades médicas predeterminadas",
                "cantidad": len(creadas)
            }
        )

    # Retornar lista completa actualizada
    stmt_all = select(Especialidad).where(Especialidad.empresa_id == target_empresa_id).order_by(Especialidad.nombre.asc())
    res_all = await db.execute(stmt_all)
    return res_all.scalars().all()
