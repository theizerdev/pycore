import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

import asyncio
from app.core.database import AsyncSessionLocal
from app.models.medico import Medico
from app.models.usuario import Usuario
from app.api.v1.medicos import get_medico
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res_u = await db.execute(select(Usuario).limit(1))
        user = res_u.scalar_one()

        res_m = await db.execute(select(Medico).limit(1))
        medico = res_m.scalar_one()

        response = await get_medico(id=medico.id, db=db, current_user=user)
        print("GET /api/v1/medicos/{id} response successfully formatted:")
        print("Doctor:", response.nombres, response.apellidos)
        print("Tipo comision:", response.tipo_comision)
        print("Porcentaje honorario:", response.porcentaje_honorario)
        print("Monto fijo honorario:", response.monto_fijo_honorario)
        print("Datos bancarios:", response.datos_bancarios)

if __name__ == "__main__":
    asyncio.run(main())

