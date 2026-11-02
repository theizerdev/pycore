import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

import asyncio
from app.core.database import AsyncSessionLocal
from app.models.honorario import LiquidacionHonorario
from app.models.usuario import Usuario
from app.api.v1.honorarios import obtener_comprobante_retencion_islr
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res_u = await db.execute(select(Usuario).limit(1))
        user = res_u.scalar_one()

        res_liq = await db.execute(select(LiquidacionHonorario).limit(1))
        liq = res_liq.scalar_one_or_none()
        if not liq:
            print("No liquidaciones found to test comprobante-islr endpoint. (Database empty of settlements yet)")
            return

        comprobante = await obtener_comprobante_retencion_islr(id=liq.id, db=db, current_user=user)
        print("COMPROBANTE ISLR SUCCESS:")
        print("Numero comprobante:", comprobante.numero_comprobante)
        print("Agente retencion:", comprobante.agente_retencion)
        print("Sujeto retenido:", comprobante.sujeto_retenido)
        print("Base imponible USD:", comprobante.base_imponible_usd)
        print("Base imponible VES:", comprobante.base_imponible_ves)
        print("Porcentaje retencion:", comprobante.porcentaje_retencion)
        print("Monto retenido VES:", comprobante.monto_retenido_ves)

if __name__ == "__main__":
    asyncio.run(main())

