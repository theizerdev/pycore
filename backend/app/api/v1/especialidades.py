from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, func

from app.core.database import get_db, ensure_tables_exist
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.especialidad import Especialidad
from app.models.sucursal import Sucursal
from app.models.plantilla_especialidad import EspecialidadPlantilla, EspecialidadPlantillaMedico
from app.schemas.especialidad import EspecialidadCreate, EspecialidadUpdate, EspecialidadResponse
from app.schemas.plantilla_especialidad import (
    PlantillaEspecialidadSave,
    PlantillaEspecialidadResponse,
    PlantillaMedicoSave,
    PlantillaMedicoResponse,
    PlantillaEfectivaResponse,
    SeccionClinica,
    CampoClinico,
)
from app.services.clinical_templates_seed import (
    DEFAULT_CLINICAL_TEMPLATES,
    CATALOGO_ESPECIALIDADES_OFICIALES,
    get_template_for_specialty,
)

router = APIRouter(prefix="/especialidades", tags=["Especialidades"])

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

    # Inicializar automáticamente su plantilla clínica sugerida oficial
    sugerencia = get_template_for_specialty(nueva_esp.nombre)
    nueva_plantilla = EspecialidadPlantilla(
        empresa_id=target_empresa_id,
        especialidad_id=nueva_esp.id,
        esquema_preconsulta=sugerencia.get("esquema_preconsulta", []),
        esquema_consulta=sugerencia.get("esquema_consulta", []),
        widgets_activos=sugerencia.get("widgets_activos", []),
        version=1,
        activo=True
    )
    db.add(nueva_plantilla)
    await _safe_commit(db)

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


@router.post("/seed-catalogo", response_model=List[EspecialidadResponse])
async def seed_catalogo_especialidades(
    request: Request,
    empresa_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.crear"))
):
    """
    Siembra o sincroniza el catálogo oficial de las 14 especialidades médicas requeridas
    junto con sus plantillas clínicas estructuradas para la empresa activa.
    """
    target_empresa_id = empresa_id if (current_user.es_superadmin and empresa_id) else current_user.empresa_id
    if not target_empresa_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Se requiere una empresa activa para registrar el catálogo")

    await ensure_tables_exist()

    for esp_def in CATALOGO_ESPECIALIDADES_OFICIALES:
        stmt = select(Especialidad).where(
            Especialidad.empresa_id == target_empresa_id,
            func.lower(Especialidad.nombre) == esp_def["nombre"].lower()
        )
        res = await db.execute(stmt)
        esp = res.scalar_one_or_none()

        if not esp:
            esp = Especialidad(
                empresa_id=target_empresa_id,
                sucursal_id=None,
                nombre=esp_def["nombre"],
                codigo=esp_def["codigo"],
                descripcion=esp_def["descripcion"],
                color=esp_def["color"],
                icono=esp_def["icono"],
                activo=True
            )
            db.add(esp)
            await db.flush()
        else:
            if not esp.codigo:
                esp.codigo = esp_def["codigo"]
            if not esp.descripcion:
                esp.descripcion = esp_def["descripcion"]
            if esp_def.get("color"):
                esp.color = esp_def["color"]
            if esp_def.get("icono"):
                esp.icono = esp_def["icono"]

        # Asegurar plantilla clínica
        stmt_p = select(EspecialidadPlantilla).where(
            EspecialidadPlantilla.especialidad_id == esp.id,
            EspecialidadPlantilla.empresa_id == target_empresa_id
        )
        res_p = await _safe_execute_select(db, stmt_p)
        plantilla = res_p.scalar_one_or_none()

        sugerencia = get_template_for_specialty(esp.nombre)
        if not plantilla:
            plantilla = EspecialidadPlantilla(
                empresa_id=target_empresa_id,
                especialidad_id=esp.id,
                esquema_preconsulta=sugerencia.get("esquema_preconsulta", []),
                esquema_consulta=sugerencia.get("esquema_consulta", []),
                widgets_activos=sugerencia.get("widgets_activos", []),
                version=1,
                activo=True
            )
            db.add(plantilla)
        else:
            if not plantilla.esquema_consulta or len(plantilla.esquema_consulta) == 0:
                plantilla.esquema_preconsulta = sugerencia.get("esquema_preconsulta", [])
                plantilla.esquema_consulta = sugerencia.get("esquema_consulta", [])
                plantilla.widgets_activos = sugerencia.get("widgets_activos", [])
            else:
                _upgrade_signos_vitales_if_needed(plantilla.esquema_consulta)

    await _safe_commit(db)

    stmt_all = select(Especialidad).where(Especialidad.empresa_id == target_empresa_id).order_by(Especialidad.nombre.asc())
    res_all = await db.execute(stmt_all)
    return res_all.scalars().all()

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


# ══════════════════════════════════════════════════════════════════════════════
# PLANTILLAS DINÁMICAS (PRECONSULTA, CONSULTA Y PERSONALIZACIÓN DE MÉDICOS)
# ══════════════════════════════════════════════════════════════════════════════

async def _safe_execute_select(db: AsyncSession, stmt):
    """Ejecuta una consulta select asegurando que las tablas existan si hubo migración pendiente."""
    try:
        return await db.execute(stmt)
    except Exception:
        await db.rollback()
        await ensure_tables_exist()
        return await db.execute(stmt)

async def _safe_commit(db: AsyncSession):
    """Realiza commit asegurando que las tablas existan si hubo migración pendiente."""
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        await ensure_tables_exist()
        await db.commit()


def _upgrade_signos_vitales_if_needed(esquema_consulta: list) -> bool:
    """Inserta automáticamente peso, talla, imc y masa muscular si no existen en la sección de signos vitales."""
    if not isinstance(esquema_consulta, list):
        return False
    updated = False
    for sec in esquema_consulta:
        if not isinstance(sec, dict):
            continue
        id_l = str(sec.get("id", "")).lower()
        titulo_l = str(sec.get("titulo", "")).lower()
        if "signo" in id_l or "signo" in titulo_l or "vital" in titulo_l or "hemodinamia" in id_l:
            campos = sec.get("campos", [])
            keys = [c.get("key") for c in campos if isinstance(c, dict)]
            if "peso" not in keys:
                nuevos = [
                    {"key": "peso", "label": "Peso Corporal", "tipo": "number", "unidad": "kg", "min_val": 1.0, "max_val": 350.0, "requerido": True, "grid_cols": 3},
                    {"key": "talla", "label": "Talla / Altura", "tipo": "number", "unidad": "cm", "min_val": 30.0, "max_val": 250.0, "requerido": True, "grid_cols": 3},
                    {"key": "imc", "label": "Índice Masa Corporal (IMC)", "tipo": "calculated", "unidad": "kg/m²", "requerido": False, "grid_cols": 3, "placeholder": "Auto (Peso / Talla²)"},
                    {"key": "masa_muscular", "label": "Masa Muscular / Magra", "tipo": "calculated", "unidad": "kg", "requerido": False, "grid_cols": 3, "placeholder": "Auto Boer"}
                ]
                sec["campos"] = nuevos + campos
                updated = True
    return updated


@router.get("/{id}/plantilla", response_model=PlantillaEspecialidadResponse)
async def get_plantilla_especialidad(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtiene la plantilla base institucional de una especialidad (preguntas de preconsulta,
    campos de examen clínico y widgets activos). Si no existe, genera la sugerencia oficial.
    """
    stmt_esp = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    stmt_p = select(EspecialidadPlantilla).where(
        EspecialidadPlantilla.especialidad_id == id,
        EspecialidadPlantilla.empresa_id == esp.empresa_id
    )
    res_p = await _safe_execute_select(db, stmt_p)
    plantilla = res_p.scalar_one_or_none()

    if not plantilla:
        sugerencia = get_template_for_specialty(esp.nombre)
        plantilla = EspecialidadPlantilla(
            empresa_id=esp.empresa_id,
            especialidad_id=esp.id,
            esquema_preconsulta=sugerencia.get("esquema_preconsulta", []),
            esquema_consulta=sugerencia.get("esquema_consulta", []),
            widgets_activos=sugerencia.get("widgets_activos", []),
            version=1,
            activo=True
        )
        db.add(plantilla)
        await _safe_commit(db)
        await db.refresh(plantilla)
    else:
        if plantilla.esquema_consulta and _upgrade_signos_vitales_if_needed(plantilla.esquema_consulta):
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(plantilla, "esquema_consulta")
            await _safe_commit(db)
            await db.refresh(plantilla)

    return plantilla


@router.put("/{id}/plantilla", response_model=PlantillaEspecialidadResponse)
async def update_plantilla_especialidad(
    id: int,
    req: PlantillaEspecialidadSave,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.editar"))
):
    """
    Guarda o actualiza la plantilla clínica base institucional de la especialidad.
    """
    stmt_esp = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    stmt_p = select(EspecialidadPlantilla).where(
        EspecialidadPlantilla.especialidad_id == id,
        EspecialidadPlantilla.empresa_id == esp.empresa_id
    )
    res_p = await _safe_execute_select(db, stmt_p)
    plantilla = res_p.scalar_one_or_none()

    preconsulta_data = [s.model_dump() for s in req.esquema_preconsulta]
    consulta_data = [s.model_dump() for s in req.esquema_consulta]
    widgets_data = req.widgets_activos or []

    if not plantilla:
        plantilla = EspecialidadPlantilla(
            empresa_id=esp.empresa_id,
            especialidad_id=esp.id,
            esquema_preconsulta=preconsulta_data,
            esquema_consulta=consulta_data,
            widgets_activos=widgets_data,
            version=1,
            activo=True
        )
        db.add(plantilla)
    else:
        plantilla.esquema_preconsulta = preconsulta_data
        plantilla.esquema_consulta = consulta_data
        plantilla.widgets_activos = widgets_data
        plantilla.version += 1

    await _safe_commit(db)
    await db.refresh(plantilla)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=esp.empresa_id,
        accion="ACTUALIZAR_PLANTILLA_CLINICA",
        modulo="especialidades",
        request=request,
        detalles={
            "mensaje": f"Plantilla clínica de '{esp.nombre}' actualizada (Versión {plantilla.version})",
            "especialidad_id": id,
            "version": plantilla.version
        }
    )

    return plantilla


@router.post("/{id}/plantilla/seed-defaults", response_model=PlantillaEspecialidadResponse)
async def seed_plantilla_defaults(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("especialidades.editar"))
):
    """
    Restaura o inicializa la plantilla de la especialidad con el catálogo clínico sugerido.
    """
    stmt_esp = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    sugerencia = get_template_for_specialty(esp.nombre)

    stmt_p = select(EspecialidadPlantilla).where(
        EspecialidadPlantilla.especialidad_id == id,
        EspecialidadPlantilla.empresa_id == esp.empresa_id
    )
    res_p = await _safe_execute_select(db, stmt_p)
    plantilla = res_p.scalar_one_or_none()

    if not plantilla:
        plantilla = EspecialidadPlantilla(
            empresa_id=esp.empresa_id,
            especialidad_id=esp.id,
            esquema_preconsulta=sugerencia.get("esquema_preconsulta", []),
            esquema_consulta=sugerencia.get("esquema_consulta", []),
            widgets_activos=sugerencia.get("widgets_activos", []),
            version=1,
            activo=True
        )
        db.add(plantilla)
    else:
        plantilla.esquema_preconsulta = sugerencia.get("esquema_preconsulta", [])
        plantilla.esquema_consulta = sugerencia.get("esquema_consulta", [])
        plantilla.widgets_activos = sugerencia.get("widgets_activos", [])
        plantilla.version += 1

    await _safe_commit(db)
    await db.refresh(plantilla)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=esp.empresa_id,
        accion="RESTAURAR_PLANTILLA_SUGERIDA",
        modulo="especialidades",
        request=request,
        detalles={
            "mensaje": f"Plantilla sugerida restablecida para '{esp.nombre}'",
            "especialidad_id": id
        }
    )

    return plantilla


@router.get("/{id}/plantilla/medico", response_model=PlantillaMedicoResponse)
async def get_plantilla_medico(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtiene la configuración personalizada de preguntas y campos de consulta del médico en sesión.
    """
    stmt_esp = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    stmt_m = select(EspecialidadPlantillaMedico).where(
        EspecialidadPlantillaMedico.especialidad_id == id,
        EspecialidadPlantillaMedico.empresa_id == esp.empresa_id,
        EspecialidadPlantillaMedico.usuario_id == current_user.id
    )
    res_m = await _safe_execute_select(db, stmt_m)
    p_medico = res_m.scalar_one_or_none()

    if not p_medico:
        return PlantillaMedicoResponse(
            id=None,
            empresa_id=esp.empresa_id,
            especialidad_id=esp.id,
            usuario_id=current_user.id,
            campos_preconsulta=[],
            campos_consulta=[],
            campos_ocultos=[],
            activo=True
        )

    return p_medico


@router.put("/{id}/plantilla/medico", response_model=PlantillaMedicoResponse)
async def update_plantilla_medico(
    id: int,
    req: PlantillaMedicoSave,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Permite al médico en sesión guardar o actualizar sus campos personalizados para esta especialidad.
    """
    stmt_esp = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    stmt_m = select(EspecialidadPlantillaMedico).where(
        EspecialidadPlantillaMedico.especialidad_id == id,
        EspecialidadPlantillaMedico.empresa_id == esp.empresa_id,
        EspecialidadPlantillaMedico.usuario_id == current_user.id
    )
    res_m = await _safe_execute_select(db, stmt_m)
    p_medico = res_m.scalar_one_or_none()

    campos_pre = [c.model_dump() for c in req.campos_preconsulta]
    campos_con = [c.model_dump() for c in req.campos_consulta]
    ocultos = req.campos_ocultos or []

    if not p_medico:
        p_medico = EspecialidadPlantillaMedico(
            empresa_id=esp.empresa_id,
            especialidad_id=esp.id,
            usuario_id=current_user.id,
            campos_preconsulta=campos_pre,
            campos_consulta=campos_con,
            campos_ocultos=ocultos,
            activo=True
        )
        db.add(p_medico)
    else:
        p_medico.campos_preconsulta = campos_pre
        p_medico.campos_consulta = campos_con
        p_medico.campos_ocultos = ocultos

    await _safe_commit(db)
    await db.refresh(p_medico)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=esp.empresa_id,
        accion="PERSONALIZAR_PLANTILLA_MEDICO",
        modulo="especialidades",
        request=request,
        detalles={
            "mensaje": f"El Dr(a). {current_user.nombre} {current_user.apellido} actualizó sus campos personalizados para '{esp.nombre}'",
            "especialidad_id": id,
            "cant_campos_pre": len(campos_pre),
            "cant_campos_con": len(campos_con)
        }
    )

    return p_medico


@router.get("/{id}/plantilla/efectiva", response_model=PlantillaEfectivaResponse)
async def get_plantilla_efectiva(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Retorna la plantilla unificada efectiva (Plantilla base institucional + Campos personalizados del médico actual).
    Esta es la respuesta que consume el formulario clínico para renderizar la pantalla en vivo.
    """
    stmt_esp = select(Especialidad).where(Especialidad.id == id)
    if not current_user.es_superadmin:
        stmt_esp = stmt_esp.where(Especialidad.empresa_id == current_user.empresa_id)
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Especialidad no encontrada")

    # 1. Obtener plantilla base institucional
    stmt_p = select(EspecialidadPlantilla).where(
        EspecialidadPlantilla.especialidad_id == id,
        EspecialidadPlantilla.empresa_id == esp.empresa_id
    )
    res_p = await _safe_execute_select(db, stmt_p)
    plantilla = res_p.scalar_one_or_none()

    if not plantilla:
        sugerencia = get_template_for_specialty(esp.nombre)
        base_pre = sugerencia.get("esquema_preconsulta", [])
        base_con = sugerencia.get("esquema_consulta", [])
        widgets = sugerencia.get("widgets_activos", [])
        tiene_base = False
    else:
        if plantilla.esquema_consulta and _upgrade_signos_vitales_if_needed(plantilla.esquema_consulta):
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(plantilla, "esquema_consulta")
            await _safe_commit(db)
            await db.refresh(plantilla)
        base_pre = plantilla.esquema_preconsulta or []
        base_con = plantilla.esquema_consulta or []
        widgets = plantilla.widgets_activos or []
        tiene_base = True

    # 2. Obtener personalización del médico
    stmt_m = select(EspecialidadPlantillaMedico).where(
        EspecialidadPlantillaMedico.especialidad_id == id,
        EspecialidadPlantillaMedico.empresa_id == esp.empresa_id,
        EspecialidadPlantillaMedico.usuario_id == current_user.id
    )
    res_m = await _safe_execute_select(db, stmt_m)
    p_medico = res_m.scalar_one_or_none()

    medico_pre = p_medico.campos_preconsulta if p_medico else []
    medico_con = p_medico.campos_consulta if p_medico else []
    ocultos = set(p_medico.campos_ocultos if p_medico else [])

    nombre_medico = f"Dr(a). {current_user.nombre} {current_user.apellido}"

    # 3. Fusionar Preconsulta
    merged_pre: List[SeccionClinica] = []
    total_pre_count = 0
    for sec in base_pre:
        sec_dict = sec if isinstance(sec, dict) else (sec.model_dump() if hasattr(sec, "model_dump") else sec.__dict__)
        campos_filtrados = []
        for c in sec_dict.get("campos", []):
            c_dict = dict(c if isinstance(c, dict) else (c.model_dump() if hasattr(c, "model_dump") else c.__dict__))
            if c_dict.get("key") in ocultos and not c_dict.get("requerido", False):
                continue
            c_dict["es_medico"] = False
            campo_obj = CampoClinico(**c_dict)
            campos_filtrados.append(campo_obj)
            total_pre_count += 1
        sec_obj = SeccionClinica(
            id=sec_dict.get("id", "sec_pre"),
            titulo=sec_dict.get("titulo", "Preconsulta"),
            descripcion=sec_dict.get("descripcion"),
            icono=sec_dict.get("icono", "ClipboardList"),
            campos=campos_filtrados
        )
        merged_pre.append(sec_obj)

    # Añadir sección de campos adicionales del médico en preconsulta si existen
    if medico_pre:
        campos_med_pre = []
        for c in medico_pre:
            c_dict = dict(c if isinstance(c, dict) else (c.model_dump() if hasattr(c, "model_dump") else c.__dict__))
            c_dict["es_medico"] = True
            c_dict["medico_nombre"] = nombre_medico
            campos_med_pre.append(CampoClinico(**c_dict))
            total_pre_count += 1
        merged_pre.append(
            SeccionClinica(
                id="sec_medico_preconsulta",
                titulo=f"Preguntas Personales - {nombre_medico}",
                descripcion="Preguntas adicionales configuradas exclusivamente para sus pacientes",
                icono="UserCheck",
                campos=campos_med_pre
            )
        )

    # 4. Fusionar Consulta
    merged_con: List[SeccionClinica] = []
    total_con_count = 0
    for sec in base_con:
        sec_dict = sec if isinstance(sec, dict) else (sec.model_dump() if hasattr(sec, "model_dump") else sec.__dict__)
        campos_filtrados = []
        for c in sec_dict.get("campos", []):
            c_dict = dict(c if isinstance(c, dict) else (c.model_dump() if hasattr(c, "model_dump") else c.__dict__))
            if c_dict.get("key") in ocultos and not c_dict.get("requerido", False):
                continue
            c_dict["es_medico"] = False
            campo_obj = CampoClinico(**c_dict)
            campos_filtrados.append(campo_obj)
            total_con_count += 1
        sec_obj = SeccionClinica(
            id=sec_dict.get("id", "sec_con"),
            titulo=sec_dict.get("titulo", "Examen de Consulta"),
            descripcion=sec_dict.get("descripcion"),
            icono=sec_dict.get("icono", "Stethoscope"),
            campos=campos_filtrados
        )
        merged_con.append(sec_obj)

    # Añadir sección de campos adicionales del médico en consulta si existen
    if medico_con:
        campos_med_con = []
        for c in medico_con:
            c_dict = dict(c if isinstance(c, dict) else (c.model_dump() if hasattr(c, "model_dump") else c.__dict__))
            c_dict["es_medico"] = True
            c_dict["medico_nombre"] = nombre_medico
            campos_med_con.append(CampoClinico(**c_dict))
            total_con_count += 1
        merged_con.append(
            SeccionClinica(
                id="sec_medico_consulta",
                titulo=f"Campos Adicionales - {nombre_medico}",
                descripcion="Variables de evaluación médica añadidas por su preferencia clínica",
                icono="UserCheck",
                campos=campos_med_con
            )
        )

    total_medico_count = len(medico_pre) + len(medico_con)

    return PlantillaEfectivaResponse(
        especialidad_id=esp.id,
        especialidad_nombre=esp.nombre,
        especialidad_color=esp.color,
        especialidad_icono=esp.icono,
        tiene_plantilla_base=tiene_base,
        widgets_activos=widgets,
        preconsulta_secciones=merged_pre,
        consulta_secciones=merged_con,
        total_campos_preconsulta=total_pre_count,
        total_campos_consulta=total_con_count,
        total_campos_medico=total_medico_count
    )
