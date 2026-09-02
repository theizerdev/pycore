from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import (
    get_current_active_user,
    require_permission,
    get_password_hash,
    registrar_auditoria
)
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.rol import Rol
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.get("", response_model=List[UsuarioResponse])
async def list_usuarios(
    search: Optional[str] = None,
    rol_id: Optional[int] = None,
    sucursal_id: Optional[int] = None,
    activo: Optional[bool] = None,
    empresa_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("usuarios.ver"))
):
    stmt = select(Usuario).options(
        selectinload(Usuario.rol).selectinload(Rol.permisos),
        selectinload(Usuario.empresa),
        selectinload(Usuario.sucursal_defecto),
        selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
    )

    if not current_user.es_superadmin:
        stmt = stmt.where(Usuario.empresa_id == current_user.empresa_id)
    elif empresa_id is not None:
        stmt = stmt.where(Usuario.empresa_id == empresa_id)

    if search:
        search_fmt = f"%{search}%"
        stmt = stmt.where(
            or_(
                Usuario.nombre.ilike(search_fmt),
                Usuario.apellido.ilike(search_fmt),
                Usuario.email.ilike(search_fmt),
                Usuario.telefono.ilike(search_fmt)
            )
        )

    if rol_id is not None:
        stmt = stmt.where(Usuario.rol_id == rol_id)

    if sucursal_id is not None:
        stmt = stmt.where(Usuario.sucursal_defecto_id == sucursal_id)

    if activo is not None:
        stmt = stmt.where(Usuario.activo == activo)

    stmt = stmt.order_by(Usuario.id.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def create_usuario(
    req: UsuarioCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("usuarios.crear"))
):
    # Validar email único
    stmt_check = select(Usuario).where(Usuario.email == req.email)
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario registrado con este correo electrónico"
        )

    empresa_id = req.empresa_id if current_user.es_superadmin else current_user.empresa_id

    usuario = Usuario(
        nombre=req.nombre,
        apellido=req.apellido,
        email=req.email,
        password_hash=get_password_hash(req.password),
        telefono=req.telefono,
        avatar_url=req.avatar_url,
        activo=req.activo,
        empresa_id=empresa_id,
        sucursal_defecto_id=req.sucursal_defecto_id,
        rol_id=req.rol_id,
        es_superadmin=False
    )
    db.add(usuario)
    await db.flush()

    # Asignar sucursales
    if req.sucursales_ids:
        for s_id in req.sucursales_ids:
            asig = UsuarioSucursal(usuario_id=usuario.id, sucursal_id=s_id)
            db.add(asig)
    elif req.sucursal_defecto_id:
        asig = UsuarioSucursal(usuario_id=usuario.id, sucursal_id=req.sucursal_defecto_id)
        db.add(asig)

    await db.commit()
    
    # Recargar con relaciones
    stmt_reload = (
        select(Usuario)
        .where(Usuario.id == usuario.id)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    res_reload = await db.execute(stmt_reload)
    usuario_completo = res_reload.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=usuario.empresa_id,
        accion="CREAR_USUARIO",
        modulo="usuarios",
        request=request,
        detalles={"usuario_id": usuario.id, "email": usuario.email, "nombre": f"{usuario.nombre} {usuario.apellido}"}
    )

    return usuario_completo

@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def get_usuario(
    usuario_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("usuarios.ver"))
):
    stmt = (
        select(Usuario)
        .where(Usuario.id == usuario_id)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    result = await db.execute(stmt)
    usuario = result.scalar_one_or_none()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not current_user.es_superadmin and usuario.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este usuario")

    return usuario

@router.put("/{usuario_id}", response_model=UsuarioResponse)
async def update_usuario(
    usuario_id: int,
    req: UsuarioUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("usuarios.editar"))
):
    stmt = (
        select(Usuario)
        .where(Usuario.id == usuario_id)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    result = await db.execute(stmt)
    usuario = result.scalar_one_or_none()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if not current_user.es_superadmin and usuario.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a este usuario")

    # Actualizar campos simples
    if req.nombre is not None:
        usuario.nombre = req.nombre
    if req.apellido is not None:
        usuario.apellido = req.apellido
    if req.email is not None and req.email != usuario.email:
        # Verificar que no esté en uso
        chk = await db.execute(select(Usuario).where(Usuario.email == req.email))
        if chk.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya está en uso")
        usuario.email = req.email
    if req.telefono is not None:
        usuario.telefono = req.telefono
    if req.activo is not None:
        usuario.activo = req.activo
    if req.rol_id is not None:
        usuario.rol_id = req.rol_id
    if req.sucursal_defecto_id is not None:
        usuario.sucursal_defecto_id = req.sucursal_defecto_id
    if req.password:
        usuario.password_hash = get_password_hash(req.password)

    # Actualizar asignaciones de sucursales si se especifican
    if req.sucursales_ids is not None:
        # Borrar previas
        for asig in list(usuario.sucursales_asignadas):
            await db.delete(asig)
        await db.flush()

        for s_id in req.sucursales_ids:
            asig = UsuarioSucursal(usuario_id=usuario.id, sucursal_id=s_id)
            db.add(asig)

    await db.commit()

    # Recargar usuario
    stmt_reload = (
        select(Usuario)
        .where(Usuario.id == usuario.id)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    res_reload = await db.execute(stmt_reload)
    usuario_completo = res_reload.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=usuario.empresa_id,
        accion="ACTUALIZAR_USUARIO",
        modulo="usuarios",
        request=request,
        detalles={"usuario_id": usuario.id, "email": usuario.email}
    )

    return usuario_completo

@router.delete("/{usuario_id}")
async def delete_usuario(
    usuario_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("usuarios.eliminar"))
):
    if usuario_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes eliminar tu propia cuenta de usuario")

    stmt = select(Usuario).where(Usuario.id == usuario_id)
    result = await db.execute(stmt)
    usuario = result.scalar_one_or_none()

    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")

    if usuario.es_superadmin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se puede eliminar la cuenta de Superadministrador")

    # Eliminación suave o física
    await db.delete(usuario)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=usuario.empresa_id,
        accion="ELIMINAR_USUARIO",
        modulo="usuarios",
        request=request,
        detalles={"usuario_id": usuario_id, "email": usuario.email}
    )

    return {"mensaje": "Usuario eliminado exitosamente"}
