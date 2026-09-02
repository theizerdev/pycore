from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import require_permission
from app.models.usuario import Usuario
from app.models.auditoria import AuditoriaLog
from app.schemas.auditoria import AuditoriaResponse

router = APIRouter(prefix="/auditoria", tags=["Auditoría"])

@router.get("", response_model=List[AuditoriaResponse])
async def list_auditoria_logs(
    modulo: Optional[str] = None,
    accion: Optional[str] = None,
    usuario_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("auditoria.ver"))
):
    stmt = select(AuditoriaLog)

    if not current_user.es_superadmin:
        stmt = stmt.where(AuditoriaLog.empresa_id == current_user.empresa_id)

    if modulo:
        stmt = stmt.where(AuditoriaLog.modulo == modulo)
    if accion:
        stmt = stmt.where(AuditoriaLog.accion == accion)
    if usuario_id:
        stmt = stmt.where(AuditoriaLog.usuario_id == usuario_id)

    stmt = stmt.order_by(AuditoriaLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()
