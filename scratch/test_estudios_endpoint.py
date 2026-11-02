import sys
import asyncio
sys.path.insert(0, 'backend')
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.models.estudio import EstudioAdjunto
from sqlalchemy import select, func, or_, case
from sqlalchemy.orm import selectinload

async def main():
    async with AsyncSessionLocal() as db:
        res_u = await db.execute(select(Usuario).limit(1))
        user = res_u.scalar_one_or_none()
        current_user = user

        # Check stats query with `case`
        stats_query = select(
            func.count(EstudioAdjunto.id).label("total"),
            func.sum(case((EstudioAdjunto.categoria == "laboratorio", 1), else_=0)).label("laboratorio"),
            func.sum(case((EstudioAdjunto.categoria == "imagenologia", 1), else_=0)).label("imagenologia"),
            func.sum(case((EstudioAdjunto.estado_analisis == "analizado_alterado", 1), else_=0)).label("con_alertas"),
            func.sum(case((EstudioAdjunto.estado_analisis == "pendiente", 1), else_=0)).label("pendientes"),
            func.sum(case((EstudioAdjunto.estado_analisis == "revisado_medico", 1), else_=0)).label("revisados"),
        ).where(EstudioAdjunto.empresa_id == current_user.empresa_id)

        res_stats = await db.execute(stats_query)
        stats_row = res_stats.one_or_none()
        print("Stats row SUCCESS:", stats_row)
        print("total:", getattr(stats_row, "total", 0))
        print("laboratorio:", getattr(stats_row, "laboratorio", 0))

asyncio.run(main())
