import sys
import asyncio
sys.path.insert(0, 'backend')
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.api.v1.estudios import listar_estudios_global
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res_u = await db.execute(select(Usuario).limit(1))
        user = res_u.scalar_one_or_none()
        print("Testing listar_estudios_global with user:", user.email)
        
        result = await listar_estudios_global(
            page=1,
            page_size=12,
            categoria=None,
            estado_analisis=None,
            fecha_desde=None,
            fecha_hasta=None,
            paciente_id=None,
            medico_id=None,
            sucursal_id=None,
            search=None,
            db=db,
            current_user=user
        )
        print("SUCCESS! Total items:", result["total"], "Stats:", result["stats"])
        print("First item title:", result["items"][0]["titulo"] if result["items"] else "None")

asyncio.run(main())

