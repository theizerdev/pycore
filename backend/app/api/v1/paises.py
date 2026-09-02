from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_active_user, require_permission, registrar_auditoria
from app.models.usuario import Usuario
from app.models.pais import Pais
from app.schemas.pais import PaisCreate, PaisUpdate, PaisResponse

router = APIRouter(prefix="/paises", tags=["Países"])

@router.get("", response_model=List[PaisResponse])
async def list_paises(
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    search: Optional[str] = Query(None, description="Buscar por nombre, código ISO o prefijo"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Pais)

    if activo is not None:
        stmt = stmt.where(Pais.activo == activo)

    if search:
        search_filter = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Pais.nombre.ilike(search_filter),
                Pais.codigo_iso2.ilike(search_filter),
                Pais.codigo_iso3.ilike(search_filter),
                Pais.codigo_telefonico.ilike(search_filter),
                Pais.moneda_principal.ilike(search_filter)
            )
        )

    stmt = stmt.order_by(Pais.nombre.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=PaisResponse, status_code=status.HTTP_201_CREATED)
async def create_pais(
    req: PaisCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("paises.crear"))
):
    # Validar duplicados de ISO2 o ISO3
    iso2_clean = req.codigo_iso2.strip().upper()
    iso3_clean = req.codigo_iso3.strip().upper()

    stmt_check = select(Pais).where(
        or_(
            Pais.codigo_iso2 == iso2_clean,
            Pais.codigo_iso3 == iso3_clean
        )
    )
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un país registrado con ese código ISO2 o ISO3"
        )

    data = req.model_dump()
    data["codigo_iso2"] = iso2_clean
    data["codigo_iso3"] = iso3_clean

    pais = Pais(**data)
    db.add(pais)
    await db.commit()
    await db.refresh(pais)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="CREAR_PAIS",
        modulo="paises",
        request=request,
        detalles={"pais_id": pais.id, "nombre": pais.nombre, "iso2": pais.codigo_iso2}
    )

    return pais

@router.get("/{pais_id}", response_model=PaisResponse)
async def get_pais(
    pais_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    stmt = select(Pais).where(Pais.id == pais_id)
    result = await db.execute(stmt)
    pais = result.scalar_one_or_none()

    if not pais:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="País no encontrado")
    return pais

@router.put("/{pais_id}", response_model=PaisResponse)
async def update_pais(
    pais_id: int,
    req: PaisUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("paises.editar"))
):
    stmt = select(Pais).where(Pais.id == pais_id)
    result = await db.execute(stmt)
    pais = result.scalar_one_or_none()

    if not pais:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="País no encontrado")

    update_data = req.model_dump(exclude_unset=True)

    # Validar unicidad si se actualiza código ISO
    if "codigo_iso2" in update_data:
        update_data["codigo_iso2"] = update_data["codigo_iso2"].strip().upper()
        stmt_dup = select(Pais).where(Pais.codigo_iso2 == update_data["codigo_iso2"], Pais.id != pais_id)
        if (await db.execute(stmt_dup)).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El código ISO2 ya está en uso por otro país")

    if "codigo_iso3" in update_data:
        update_data["codigo_iso3"] = update_data["codigo_iso3"].strip().upper()
        stmt_dup = select(Pais).where(Pais.codigo_iso3 == update_data["codigo_iso3"], Pais.id != pais_id)
        if (await db.execute(stmt_dup)).scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El código ISO3 ya está en uso por otro país")

    for field, value in update_data.items():
        setattr(pais, field, value)

    await db.commit()
    await db.refresh(pais)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ACTUALIZAR_PAIS",
        modulo="paises",
        request=request,
        detalles={"pais_id": pais.id, "cambios": update_data}
    )

    return pais

@router.patch("/{pais_id}/toggle-status", response_model=PaisResponse)
async def toggle_pais_status(
    pais_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("paises.editar"))
):
    stmt = select(Pais).where(Pais.id == pais_id)
    result = await db.execute(stmt)
    pais = result.scalar_one_or_none()

    if not pais:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="País no encontrado")

    pais.activo = not pais.activo
    await db.commit()
    await db.refresh(pais)

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="TOGGLE_ESTADO_PAIS",
        modulo="paises",
        request=request,
        detalles={"pais_id": pais.id, "activo": pais.activo}
    )

    return pais

@router.delete("/{pais_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pais(
    pais_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("paises.eliminar"))
):
    stmt = select(Pais).where(Pais.id == pais_id)
    result = await db.execute(stmt)
    pais = result.scalar_one_or_none()

    if not pais:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="País no encontrado")

    nombre = pais.nombre
    await db.delete(pais)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ELIMINAR_PAIS",
        modulo="paises",
        request=request,
        detalles={"pais_id": pais_id, "nombre": nombre}
    )

    return None
