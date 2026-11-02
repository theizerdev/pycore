import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

import asyncio
from app.core.database import AsyncSessionLocal
from app.models.medico import Medico
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Medico).limit(1))
        m = res.scalar_one_or_none()
        if not m:
            print("No medicos found")
            return
        print(f"OK: Medico ID {m.id}: {m.nombres} {m.apellidos}")
        print(f"Tipo comision: {m.tipo_comision}")
        print(f"Porcentaje honorario: {m.porcentaje_honorario}")
        print(f"Monto fijo: {m.monto_fijo_honorario}")
        print(f"Datos bancarios: {m.datos_bancarios}")

if __name__ == "__main__":
    asyncio.run(main())
