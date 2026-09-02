from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.rol import Rol
from app.models.permiso import Permiso
from app.schemas.rol import RolCreate, RolUpdate, RolResponse

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("", response_model=List[RolResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Rol).options(selectinload(Rol.permisos)).order_by(Rol.id.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
async def create_rol(
    req: RolCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("roles.crear"))
):
    # Validar slug único
    stmt_check = select(Rol).where((Rol.slug == req.slug) | (Rol.nombre == req.nombre))
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un rol con ese nombre o identificador (slug)"
        )

    rol = Rol(
        nombre=req.nombre,
        slug=req.slug,
        descripcion=req.descripcion,
        es_sistema=False,
        activo=req.activo
    )

    if req.permisos_ids:
        stmt_p = select(Permiso).where(Permiso.id.in_(req.permisos_ids))
        res_p = await db.execute(stmt_p)
        rol.permisos = list(res_p.scalars().all())

    db.add(rol)
    await db.commit()
    await db.refresh(rol)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="CREAR_ROL",
        modulo="roles",
        request=request,
        detalles={"rol_id": rol.id, "nombre": rol.nombre, "permisos_count": len(rol.permisos)}
    )

    return rol

@router.get("/{rol_id}", response_model=RolResponse)
async def get_rol(
    rol_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Rol).where(Rol.id == rol_id).options(selectinload(Rol.permisos))
    result = await db.execute(stmt)
    rol = result.scalar_one_or_none()

    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return rol

@router.put("/{rol_id}", response_model=RolResponse)
async def update_rol(
    rol_id: int,
    req: RolUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("roles.editar"))
):
    stmt = select(Rol).where(Rol.id == rol_id).options(selectinload(Rol.permisos))
    result = await db.execute(stmt)
    rol = result.scalar_one_or_none()

    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")

    if req.nombre is not None:
        rol.nombre = req.nombre
    if req.descripcion is not None:
        rol.descripcion = req.descripcion
    if req.activo is not None:
        if rol.es_sistema and not req.activo:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede desactivar un rol del sistema")
        rol.activo = req.activo

    if req.permisos_ids is not None:
        stmt_p = select(Permiso).where(Permiso.id.in_(req.permisos_ids))
        res_p = await db.execute(stmt_p)
        rol.permisos = list(res_p.scalars().all())

    await db.commit()
    await db.refresh(rol)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ACTUALIZAR_ROL",
        modulo="roles",
        request=request,
        detalles={"rol_id": rol.id, "nombre": rol.nombre, "permisos_count": len(rol.permisos)}
    )

    return rol

@router.delete("/{rol_id}")
async def delete_rol(
    rol_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("roles.eliminar"))
):
    stmt = select(Rol).where(Rol.id == rol_id)
    result = await db.execute(stmt)
    rol = result.scalar_one_or_none()

    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")

    if rol.es_sistema:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Los roles base del sistema no pueden ser eliminados")

    # Verificar si hay usuarios con este rol
    stmt_u = select(Usuario).where(Usuario.rol_id == rol_id)
    res_u = await db.execute(stmt_u)
    if res_u.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede eliminar el rol porque tiene usuarios asignados. Reasigna los usuarios primero."
        )

    await db.delete(rol)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ELIMINAR_ROL",
        modulo="roles",
        request=request,
        detalles={"rol_id": rol_id, "nombre": rol.nombre}
    )

    return {"mensaje": "Rol eliminado exitosamente"}
