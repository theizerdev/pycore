import sys
import asyncio
sys.path.insert(0, 'backend')
from app.core.database import AsyncSessionLocal
from app.models.usuario import Usuario
from app.models.medico import Medico
from app.api.v1.honorarios import resumen_calculo_honorarios
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res_u = await db.execute(select(Usuario).limit(1))
        user = res_u.scalar_one_or_none()
        
        res_m = await db.execute(select(Medico).where(Medico.empresa_id == user.empresa_id).limit(1))
        medico = res_m.scalar_one_or_none()
        
        if not medico:
            print("No medico found for company", user.empresa_id)
            return

        print(f"Testing resumen_calculo_honorarios for Medico: {medico.nombres} {medico.apellidos} (ID {medico.id})")
        
        res = await resumen_calculo_honorarios(
            medico_id=medico.id,
            sucursal_id=None,
            fecha_desde=None,
            fecha_hasta=None,
            db=db,
            current_user=user
        )
        print("SUCCESS! Resumen calculado:", res.total_cobros, "cobros pendientes.")
        print("Tasa BCV:", res.tasa_bcv)
        print("Monto honorarios USD:", res.monto_honorarios_usd)

asyncio.run(main())

