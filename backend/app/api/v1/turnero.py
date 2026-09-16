from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.empresa import Empresa
from app.models.turnero import TurnoLlamado
from app.models.cita import CitaMedica
from app.core.security import get_current_user, require_permission

router = APIRouter(prefix="/turnero", tags=["Turnero y Pantalla de Espera"])


class TurnoLlamarRequest(BaseModel):
    paciente_nombre: str
    medico_nombre: str
    consultorio: str
    especialidad: Optional[str] = None
    numero_turno: Optional[str] = None
    cita_id: Optional[int] = None
    paciente_id: Optional[int] = None
    sucursal_id: Optional[int] = None


class TurnoItemResponse(BaseModel):
    id: int
    empresa_id: int
    sucursal_id: int
    cita_id: Optional[int] = None
    paciente_id: Optional[int] = None
    numero_turno: Optional[str] = None
    paciente_nombre: str
    medico_nombre: str
    consultorio: str
    especialidad: Optional[str] = None
    estado: str
    llamado_at: datetime

    class Config:
        from_attributes = True


@router.post("/llamar", response_model=TurnoItemResponse)
async def llamar_paciente_turnero(
    req: TurnoLlamarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Registra el llamado de un paciente a consulta médica.
    Actualiza la cita médica a 'en_consulta' y despacha el turno para la pantalla de TV.
    """
    sucursal_id = req.sucursal_id
    if not sucursal_id:
        if current_user.sucursal_defecto_id:
            sucursal_id = current_user.sucursal_defecto_id
        elif current_user.sucursales_asignadas:
            sucursal_id = current_user.sucursales_asignadas[0].sucursal_id
        else:
            # Buscar la primera sucursal activa de la empresa
            res_suc = await db.execute(
                select(Sucursal.id).where(Sucursal.empresa_id == current_user.empresa_id, Sucursal.activo == True).limit(1)
            )
            sucursal_id = res_suc.scalar_one_or_none()
            if not sucursal_id:
                raise HTTPException(status_code=400, detail="No se encontró una sucursal activa para emitir el turno.")

    # Si hay cita_id, actualizar estado de la cita a 'en_consulta'
    if req.cita_id:
        res_cita = await db.execute(
            select(CitaMedica).where(CitaMedica.id == req.cita_id, CitaMedica.empresa_id == current_user.empresa_id)
        )
        cita = res_cita.scalar_one_or_none()
        if cita:
            cita.estado = "en_consulta"

    # Marcar los llamados anteriores de ese mismo consultorio/médico como 'atendido' para que no solapen
    res_prev = await db.execute(
        select(TurnoLlamado).where(
            TurnoLlamado.sucursal_id == sucursal_id,
            TurnoLlamado.consultorio == req.consultorio,
            TurnoLlamado.estado == "llamando"
        )
    )
    for prev in res_prev.scalars().all():
        prev.estado = "atendido"

    # Generar código de turno si no vino
    num_turno = req.numero_turno
    if not num_turno:
        count_res = await db.execute(
            select(TurnoLlamado.id).where(
                TurnoLlamado.sucursal_id == sucursal_id,
                TurnoLlamado.llamado_at >= datetime.now().replace(hour=0, minute=0, second=0)
            )
        )
        total_hoy = len(count_res.scalars().all()) + 1
        num_turno = f"T-{total_hoy:03d}"

    nuevo_turno = TurnoLlamado(
        empresa_id=current_user.empresa_id,
        sucursal_id=sucursal_id,
        cita_id=req.cita_id,
        paciente_id=req.paciente_id,
        numero_turno=num_turno,
        paciente_nombre=req.paciente_nombre.strip(),
        medico_nombre=req.medico_nombre.strip(),
        consultorio=req.consultorio.strip(),
        especialidad=req.especialidad.strip() if req.especialidad else None,
        estado="llamando",
        llamado_at=datetime.now()
    )

    db.add(nuevo_turno)
    await db.commit()
    await db.refresh(nuevo_turno)

    return nuevo_turno


@router.get("/public/{codigo_sucursal}")
async def get_turnero_publico(
    codigo_sucursal: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint PÚBLICO para pantallas Smart TV en sala de espera.
    No requiere autenticación. Resuelve por código o ID de sucursal.
    """
    clean_code = codigo_sucursal.strip()
    
    # Buscar sucursal por código o por ID
    query_suc = select(Sucursal).options(selectinload(Sucursal.empresa)).where(
        or_(
            Sucursal.codigo == clean_code,
            Sucursal.id == int(clean_code) if clean_code.isdigit() else False
        )
    )
    res_suc = await db.execute(query_suc)
    sucursal = res_suc.scalar_one_or_none()

    if not sucursal:
        raise HTTPException(
            status_code=404,
            detail=f"Sucursal con identificador '{codigo_sucursal}' no encontrada."
        )

    # Buscar turno llamando más reciente (en los últimos 20 minutos)
    hace_20_min = datetime.now() - timedelta(minutes=20)
    query_activo = (
        select(TurnoLlamado)
        .where(
            TurnoLlamado.sucursal_id == sucursal.id,
            TurnoLlamado.estado == "llamando",
            TurnoLlamado.llamado_at >= hace_20_min
        )
        .order_by(TurnoLlamado.llamado_at.desc())
        .limit(1)
    )
    res_activo = await db.execute(query_activo)
    turno_actual = res_activo.scalar_one_or_none()

    # Buscar últimos 8 turnos llamados hoy
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    query_historial = (
        select(TurnoLlamado)
        .where(
            TurnoLlamado.sucursal_id == sucursal.id,
            TurnoLlamado.llamado_at >= today_start
        )
        .order_by(TurnoLlamado.llamado_at.desc())
        .limit(8)
    )
    res_hist = await db.execute(query_historial)
    ultimos_turnos = res_hist.scalars().all()

    return {
        "sucursal": {
            "id": sucursal.id,
            "nombre": sucursal.nombre,
            "codigo": sucursal.codigo or str(sucursal.id),
            "direccion": sucursal.direccion,
            "ciudad": sucursal.ciudad,
            "empresa_nombre": sucursal.empresa.nombre if sucursal.empresa else "Centro Médico",
            "empresa_logo": getattr(sucursal.empresa, "logo_url", None)
        },
        "turno_actual": {
            "id": turno_actual.id,
            "numero_turno": turno_actual.numero_turno,
            "paciente_nombre": turno_actual.paciente_nombre,
            "medico_nombre": turno_actual.medico_nombre,
            "consultorio": turno_actual.consultorio,
            "especialidad": turno_actual.especialidad,
            "estado": turno_actual.estado,
            "llamado_at": turno_actual.llamado_at.isoformat()
        } if turno_actual else None,
        "ultimos_turnos": [
            {
                "id": t.id,
                "numero_turno": t.numero_turno,
                "paciente_nombre": t.paciente_nombre,
                "medico_nombre": t.medico_nombre,
                "consultorio": t.consultorio,
                "especialidad": t.especialidad,
                "estado": t.estado,
                "llamado_at": t.llamado_at.strftime("%H:%M")
            } for t in ultimos_turnos
        ],
        "hora_servidor": datetime.now().isoformat()
    }


@router.post("/completar/{turno_id}")
async def completar_turno(
    turno_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Marca un turno como 'atendido'."""
    res = await db.execute(
        select(TurnoLlamado).where(
            TurnoLlamado.id == turno_id,
            TurnoLlamado.empresa_id == current_user.empresa_id
        )
    )
    turno = res.scalar_one_or_none()
    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    turno.estado = "atendido"
    await db.commit()
    return {"success": True, "message": "Turno marcado como atendido"}
