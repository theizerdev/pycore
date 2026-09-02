from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, require_superadmin, registrar_auditoria
from app.models.usuario import Usuario
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaCreate, EmpresaUpdate, EmpresaResponse

router = APIRouter(prefix="/empresas", tags=["Empresas"])

@router.get("", response_model=List[EmpresaResponse])
async def list_empresas(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    if current_user.es_superadmin:
        stmt = select(Empresa).order_by(Empresa.nombre.asc())
    else:
        stmt = select(Empresa).where(Empresa.id == current_user.empresa_id)
    
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
async def create_empresa(
    req: EmpresaCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("empresas.crear"))
):
    from datetime import datetime, timedelta
    from app.models.plan import Plan

    empresa = Empresa(**req.model_dump())
    
    # Asignar Plan Prueba por defecto (7 Días Gratis) si no es la Empresa 1
    stmt_prueba = select(Plan).where(Plan.codigo == 'prueba', Plan.activo == True)
    res_prueba = await db.execute(stmt_prueba)
    plan_prueba = res_prueba.scalar_one_or_none()
    
    if plan_prueba:
        empresa.plan_id = plan_prueba.id
        empresa.plan_estado = 'prueba'
        empresa.plan_vencimiento = datetime.now() + timedelta(days=7)

    db.add(empresa)
    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="CREAR_EMPRESA",
        modulo="empresas",
        request=request,
        detalles={"empresa_id": empresa.id, "nombre": empresa.nombre}
    )

    return empresa

@router.get("/{empresa_id}", response_model=EmpresaResponse)
async def get_empresa(
    empresa_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    if not current_user.es_superadmin and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta empresa")

    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")
    return empresa

@router.put("/{empresa_id}", response_model=EmpresaResponse)
async def update_empresa(
    empresa_id: int,
    req: EmpresaUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    if not current_user.es_superadmin and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para editar esta empresa")

    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")

    update_data = req.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(empresa, field, value)

    await db.commit()
    await db.refresh(empresa)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa.id,
        accion="ACTUALIZAR_EMPRESA",
        modulo="empresas",
        request=request,
        detalles={"empresa_id": empresa.id, "cambios": update_data}
    )

    return empresa

@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_empresa(
    empresa_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("empresas.eliminar"))
):
    if not current_user.es_superadmin and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permisos para eliminar esta empresa")

    stmt = select(Empresa).where(Empresa.id == empresa_id)
    result = await db.execute(stmt)
    empresa = result.scalar_one_or_none()

    if not empresa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Empresa no encontrada")

    # Prevenir eliminación si el usuario está asignado a esta empresa
    if current_user.empresa_id == empresa_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes eliminar la empresa a la que estás asignado actualmente. Desactívala si deseas deshabilitarla."
        )

    nombre = empresa.nombre
    try:
        await db.delete(empresa)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar esta empresa porque contiene usuarios, sucursales o registros activos asociados. Se recomienda desactivarla."
        )

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ELIMINAR_EMPRESA",
        modulo="empresas",
        request=request,
        detalles={"empresa_id_eliminada": empresa_id, "nombre": nombre}
    )

    return None
