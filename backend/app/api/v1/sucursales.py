from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.schemas.sucursal import SucursalCreate, SucursalUpdate, SucursalResponse

router = APIRouter(prefix="/sucursales", tags=["Sucursales"])

@router.get("", response_model=List[SucursalResponse])
async def list_sucursales(
    empresa_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Sucursal)
    if not current_user.es_superadmin:
        stmt = stmt.where(Sucursal.empresa_id == current_user.empresa_id)
    elif empresa_id is not None:
        stmt = stmt.where(Sucursal.empresa_id == empresa_id)

    stmt = stmt.order_by(Sucursal.nombre.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=SucursalResponse, status_code=status.HTTP_201_CREATED)
async def create_sucursal(
    req: SucursalCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("sucursales.crear"))
):
    from app.models.empresa import Empresa
    from app.models.suscripcion import Suscripcion
    from sqlalchemy import func

    target_empresa_id = req.empresa_id if current_user.es_superadmin else current_user.empresa_id

    if not current_user.es_superadmin and req.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes crear sucursales en otra empresa")

    # Validación Estricta de Límite de Sucursales según Suscripción Aprobada (FixSale POS)
    stmt_emp = select(Empresa).where(Empresa.id == target_empresa_id)
    res_emp = await db.execute(stmt_emp)
    empresa = res_emp.scalar_one_or_none()

    if empresa and not empresa.is_exempt_from_subscription():
        stmt_sub = (
            select(Suscripcion)
            .where(Suscripcion.empresa_id == empresa.id, Suscripcion.estado == "aprobado")
            .order_by(Suscripcion.id.desc())
            .limit(1)
        )
        res_sub = await db.execute(stmt_sub)
        sub_aprobada = res_sub.scalar_one_or_none()

        if sub_aprobada and sub_aprobada.sucursales_contratadas:
            max_allowed = sub_aprobada.sucursales_contratadas
        elif empresa.plan and empresa.plan.sucursales_incluidas:
            max_allowed = empresa.plan.sucursales_incluidas
        else:
            max_allowed = 1

        stmt_count = select(func.count(Sucursal.id)).where(Sucursal.empresa_id == empresa.id)
        res_count = await db.execute(stmt_count)
        current_count = res_count.scalar() or 0

        if current_count >= max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Límite de sucursales alcanzado. Tu suscripción o plan actual permite un máximo de {max_allowed} sucursal(es). Para agregar más, actualiza tu suscripción en el sistema."
            )

    sucursal = Sucursal(**req.model_dump())
    db.add(sucursal)
    await db.commit()
    await db.refresh(sucursal)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=sucursal.empresa_id,
        accion="CREAR_SUCURSAL",
        modulo="sucursales",
        request=request,
        detalles={"sucursal_id": sucursal.id, "nombre": sucursal.nombre}
    )

    return sucursal

@router.get("/{sucursal_id}", response_model=SucursalResponse)
async def get_sucursal(
    sucursal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Sucursal).where(Sucursal.id == sucursal_id)
    result = await db.execute(stmt)
    sucursal = result.scalar_one_or_none()

    if not sucursal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

    if not current_user.es_superadmin and sucursal.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sucursal")

    return sucursal

@router.put("/{sucursal_id}", response_model=SucursalResponse)
async def update_sucursal(
    sucursal_id: int,
    req: SucursalUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("sucursales.editar"))
):
    stmt = select(Sucursal).where(Sucursal.id == sucursal_id)
    result = await db.execute(stmt)
    sucursal = result.scalar_one_or_none()

    if not sucursal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

    if not current_user.es_superadmin and sucursal.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sucursal")

    update_data = req.model_dump(exclude_unset=True)

    # Si se intenta activar una sucursal inactiva, validar límite
    if update_data.get("activo") is True and sucursal.activo is False:
        from app.models.empresa import Empresa
        from app.models.suscripcion import Suscripcion
        from sqlalchemy import func

        stmt_emp = select(Empresa).where(Empresa.id == sucursal.empresa_id)
        res_emp = await db.execute(stmt_emp)
        empresa = res_emp.scalar_one_or_none()

        if empresa and not empresa.is_exempt_from_subscription():
            stmt_sub = (
                select(Suscripcion)
                .where(Suscripcion.empresa_id == empresa.id, Suscripcion.estado == "aprobado")
                .order_by(Suscripcion.id.desc())
                .limit(1)
            )
            res_sub = await db.execute(stmt_sub)
            sub_aprobada = res_sub.scalar_one_or_none()

            max_allowed = sub_aprobada.sucursales_contratadas if (sub_aprobada and sub_aprobada.sucursales_contratadas) else (empresa.plan.sucursales_incluidas if empresa.plan else 1)

            stmt_count = select(func.count(Sucursal.id)).where(Sucursal.empresa_id == sucursal.empresa_id, Sucursal.activo == True)
            res_count = await db.execute(stmt_count)
            active_count = res_count.scalar() or 0

            if active_count >= max_allowed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Límite de sucursales activas alcanzado ({max_allowed}). Para activar esta sede, debes desactivar otra o contratar más sucursales."
                )

    for field, value in update_data.items():
        setattr(sucursal, field, value)

    await db.commit()
    await db.refresh(sucursal)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=sucursal.empresa_id,
        accion="ACTUALIZAR_SUCURSAL",
        modulo="sucursales",
        request=request,
        detalles={"sucursal_id": sucursal.id, "cambios": update_data}
    )

    return sucursal

@router.delete("/{sucursal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sucursal(
    sucursal_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("sucursales.eliminar"))
):
    stmt = select(Sucursal).where(Sucursal.id == sucursal_id)
    result = await db.execute(stmt)
    sucursal = result.scalar_one_or_none()

    if not sucursal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sucursal no encontrada")

    if not current_user.es_superadmin and sucursal.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta sucursal")

    nombre = sucursal.nombre
    empresa_id = sucursal.empresa_id
    await db.delete(sucursal)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="ELIMINAR_SUCURSAL",
        modulo="sucursales",
        request=request,
        detalles={"sucursal_id": sucursal_id, "nombre": nombre}
    )

    return None
