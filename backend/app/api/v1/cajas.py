from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_active_user
from app.models.usuario import Usuario
from app.schemas.caja import (
    CajaCreate,
    CajaResponse,
    TurnoAperturaRequest,
    TurnoCierreRequest,
    TurnoCajaResponse,
    MovimientoCajaCreateRequest,
    MovimientoCajaResponse,
    CobroCreateRequest,
    CobroResponse
)
from app.services.caja_service import CajaService

router = APIRouter(prefix="/cajas", tags=["Cajas & Facturación"])


# ── 1. CAJAS FÍSICAS O PUNTOS DE VENTA ──────────────────────────────
@router.get("", response_model=List[CajaResponse])
async def list_cajas(
    sucursal_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Lista las cajas registradas para la empresa/sucursal."""
    empresa_id = current_user.empresa_id or 1
    target_sucursal = sucursal_id or current_user.sucursal_id
    cajas = await CajaService.get_cajas(empresa_id, target_sucursal, db)
    return cajas


@router.post("", response_model=CajaResponse, status_code=status.HTTP_201_CREATED)
async def create_caja(
    payload: CajaCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una nueva caja para una sucursal."""
    empresa_id = current_user.empresa_id or 1
    return await CajaService.create_caja(empresa_id, payload, db)


# ── 2. GESTIÓN DE TURNOS DE CAJA & ARQUEO ─────────────────────────────
@router.get("/turno-activo", response_model=Optional[TurnoCajaResponse])
async def get_active_turno(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el turno de caja abierto del usuario autenticado, si existe."""
    empresa_id = current_user.empresa_id or 1
    turno = await CajaService.get_active_turno(empresa_id, current_user.id, db)
    if not turno:
        return None

    return TurnoCajaResponse(
        id=turno.id,
        empresa_id=turno.empresa_id,
        sucursal_id=turno.sucursal_id,
        caja_id=turno.caja_id,
        caja_nombre=turno.caja.nombre if turno.caja else "Caja",
        usuario_id=turno.usuario_id,
        cajero_nombre=turno.usuario.nombre if turno.usuario else "Cajero",
        apertura_at=turno.apertura_at,
        cierre_at=turno.cierre_at,
        estado=turno.estado,
        fondo_inicial_usd=float(turno.fondo_inicial_usd),
        fondo_inicial_ves=float(turno.fondo_inicial_ves),
        total_ingresos_usd=float(turno.total_ingresos_usd),
        total_ingresos_ves=float(turno.total_ingresos_ves),
        total_ingresos_eur=float(turno.total_ingresos_eur),
        total_egresos_usd=float(turno.total_egresos_usd),
        total_egresos_ves=float(turno.total_egresos_ves),
        arqueo_declarado_usd=float(turno.arqueo_declarado_usd) if turno.arqueo_declarado_usd is not None else None,
        arqueo_declarado_ves=float(turno.arqueo_declarado_ves) if turno.arqueo_declarado_ves is not None else None,
        diferencia_usd=float(turno.diferencia_usd) if turno.diferencia_usd is not None else None,
        diferencia_ves=float(turno.diferencia_ves) if turno.diferencia_ves is not None else None,
        notas_apertura=turno.notas_apertura,
        notas_cierre=turno.notas_cierre,
        created_at=turno.created_at
    )


@router.post("/turnos/apertura", response_model=TurnoCajaResponse, status_code=status.HTTP_201_CREATED)
async def open_turno(
    payload: TurnoAperturaRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Abre un turno de caja con fondo inicial en USD y Bolívares."""
    empresa_id = current_user.empresa_id or 1
    turno = await CajaService.open_turno(empresa_id, current_user.id, payload, db)

    return TurnoCajaResponse(
        id=turno.id,
        empresa_id=turno.empresa_id,
        sucursal_id=turno.sucursal_id,
        caja_id=turno.caja_id,
        caja_nombre=turno.caja.nombre if turno.caja else "Caja",
        usuario_id=turno.usuario_id,
        cajero_nombre=turno.usuario.nombre if turno.usuario else current_user.nombre,
        apertura_at=turno.apertura_at,
        cierre_at=turno.cierre_at,
        estado=turno.estado,
        fondo_inicial_usd=float(turno.fondo_inicial_usd),
        fondo_inicial_ves=float(turno.fondo_inicial_ves),
        total_ingresos_usd=float(turno.total_ingresos_usd),
        total_ingresos_ves=float(turno.total_ingresos_ves),
        total_ingresos_eur=float(turno.total_ingresos_eur),
        total_egresos_usd=float(turno.total_egresos_usd),
        total_egresos_ves=float(turno.total_egresos_ves),
        notas_apertura=turno.notas_apertura,
        notas_cierre=turno.notas_cierre,
        created_at=turno.created_at
    )


@router.post("/turnos/{turno_id}/cierre", response_model=TurnoCajaResponse)
async def close_turno(
    turno_id: int,
    payload: TurnoCierreRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Cierra el turno de caja con arqueo físico de efectivo y cálculo de diferencias."""
    empresa_id = current_user.empresa_id or 1
    try:
        turno = await CajaService.close_turno(empresa_id, turno_id, current_user.id, payload, db)
        return TurnoCajaResponse(
            id=turno.id,
            empresa_id=turno.empresa_id,
            sucursal_id=turno.sucursal_id,
            caja_id=turno.caja_id,
            caja_nombre=turno.caja.nombre if turno.caja else "Caja",
            usuario_id=turno.usuario_id,
            cajero_nombre=turno.usuario.nombre if turno.usuario else current_user.nombre,
            apertura_at=turno.apertura_at,
            cierre_at=turno.cierre_at,
            estado=turno.estado,
            fondo_inicial_usd=float(turno.fondo_inicial_usd),
            fondo_inicial_ves=float(turno.fondo_inicial_ves),
            total_ingresos_usd=float(turno.total_ingresos_usd),
            total_ingresos_ves=float(turno.total_ingresos_ves),
            total_ingresos_eur=float(turno.total_ingresos_eur),
            total_egresos_usd=float(turno.total_egresos_usd),
            total_egresos_ves=float(turno.total_egresos_ves),
            arqueo_declarado_usd=float(turno.arqueo_declarado_usd) if turno.arqueo_declarado_usd is not None else None,
            arqueo_declarado_ves=float(turno.arqueo_declarado_ves) if turno.arqueo_declarado_ves is not None else None,
            diferencia_usd=float(turno.diferencia_usd) if turno.diferencia_usd is not None else None,
            diferencia_ves=float(turno.diferencia_ves) if turno.diferencia_ves is not None else None,
            notas_apertura=turno.notas_apertura,
            notas_cierre=turno.notas_cierre,
            created_at=turno.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── 3. MOVIMIENTOS EXTRAORDINARIOS DE CAJA ──────────────────────────
@router.post("/movimientos", response_model=MovimientoCajaResponse, status_code=status.HTTP_201_CREATED)
async def create_movimiento(
    payload: MovimientoCajaCreateRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Registra un egreso o ingreso menor de caja chica durante el turno."""
    empresa_id = current_user.empresa_id or 1
    try:
        mov = await CajaService.create_movimiento(empresa_id, current_user.id, payload, db)
        return MovimientoCajaResponse(
            id=mov.id,
            empresa_id=mov.empresa_id,
            sucursal_id=mov.sucursal_id,
            turno_caja_id=mov.turno_caja_id,
            usuario_id=mov.usuario_id,
            usuario_nombre=mov.usuario.nombre if mov.usuario else current_user.nombre,
            tipo=mov.tipo,
            concepto=mov.concepto,
            moneda=mov.moneda,
            monto=float(mov.monto),
            comprobante_adjunto=mov.comprobante_adjunto,
            created_at=mov.created_at
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── 4. COBROS Y EMISIÓN DE RECIBOS ──────────────────────────────────
@router.post("/cobros", response_model=CobroResponse, status_code=status.HTTP_201_CREATED)
async def create_cobro(
    payload: CobroCreateRequest,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Procesa el cobro de una cita médica o servicios clínicos con soporte multimoneda."""
    empresa_id = current_user.empresa_id or 1
    try:
        cobro = await CajaService.create_cobro(empresa_id, current_user.id, payload, db)
        return cobro
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cobros", response_model=List[CobroResponse])
async def list_cobros(
    sucursal_id: Optional[int] = Query(None),
    paciente_id: Optional[int] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el historial de cobros y recibos emitidos con filtros."""
    empresa_id = current_user.empresa_id or 1
    cobros = await CajaService.get_cobros(
        empresa_id=empresa_id,
        sucursal_id=sucursal_id,
        paciente_id=paciente_id,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        limit=limit,
        db=db
    )
    return cobros


@router.get("/cobros/{cobro_id}", response_model=CobroResponse)
async def get_cobro_detail(
    cobro_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el detalle completo de un cobro por su ID."""
    empresa_id = current_user.empresa_id or 1
    cobro = await CajaService.get_cobro_by_id(empresa_id, cobro_id, db)
    if not cobro:
        raise HTTPException(status_code=404, detail="Cobro no encontrado")
    return cobro


@router.post("/cobros/{cobro_id}/anular", response_model=CobroResponse)
async def anular_cobro_endpoint(
    cobro_id: int,
    motivo: str = Query(..., min_length=3, description="Razón de la anulación"),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Anula un recibo de cobro y revierte el estado de pago de la cita asociada."""
    empresa_id = current_user.empresa_id or 1
    try:
        return await CajaService.anular_cobro(empresa_id, cobro_id, current_user.id, motivo, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
