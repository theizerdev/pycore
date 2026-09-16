"""
⚡ Script de inicialización y sincronización de Planes de Suscripción SaaS
MediSoftSuite / PyCore Platform
"""
import asyncio
import sys
import os

# Configurar codificación para consola Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ajustar path al directorio backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal, ensure_tables_exist
from app.models.plan import Plan
from app.models.empresa import Empresa
from app.services.seeder import seed_planes_data

async def seed_planes_standalone():
    print("\n* [1/3] Verificando tablas de la base de datos...")
    await ensure_tables_exist()

    async with AsyncSessionLocal() as db:
        print("* [2/3] Sembrando catálogo oficial de planes SaaS...")
        planes_map = await seed_planes_data(db)
        
        for codigo, plan in planes_map.items():
            promo_info = f" (Promo: ${plan.precio_promocional_mensual}/mes)" if plan.tiene_promocion else ""
            print(f"  [+] [{plan.codigo.upper()}] {plan.nombre} - ${plan.precio_regular_mensual}/mes{promo_info} | Max Usuarios: {plan.max_usuarios} | Max Sucursales: {plan.max_sucursales}")

        # Sincronizar Empresa 1 (Empresa Matriz / Dueña del SaaS)
        print("* [3/3] Asociando Plan Enterprise a la Empresa Matriz (Owner ID: 1)...")
        plan_enterprise = planes_map.get("enterprise")
        if plan_enterprise:
            stmt_emp = select(Empresa).where(Empresa.id == 1)
            res_emp = await db.execute(stmt_emp)
            empresa_master = res_emp.scalar_one_or_none()
            if empresa_master:
                empresa_master.plan_id = plan_enterprise.id
                empresa_master.plan_estado = "activo"
                empresa_master.plan_vencimiento = None  # Acceso ilimitado vitalicio
                print(f"  [+] Empresa '{empresa_master.nombre}' vinculada al plan '{plan_enterprise.nombre}' con acceso vitalicio.")

        # Asegurar que cualquier otra empresa tenga plan por defecto
        stmt_otras = select(Empresa).where(Empresa.id != 1, Empresa.plan_id.is_(None))
        res_otras = await db.execute(stmt_otras)
        plan_prueba = planes_map.get("prueba") or planes_map.get("basico") or list(planes_map.values())[0]
        otras = res_otras.scalars().all()
        if otras:
            print(f"* Asignando plan por defecto a {len(otras)} empresa(s) sin plan...")
            for emp in otras:
                emp.plan_id = plan_prueba.id
                emp.plan_estado = "prueba"
                print(f"  [+] Empresa ID {emp.id} ('{emp.nombre}') asignada al plan '{plan_prueba.nombre}'")

        await db.commit()
        print("\n[SUCCESS] Catálogo de planes sembrado y empresas sincronizadas con éxito.\n")

if __name__ == "__main__":
    asyncio.run(seed_planes_standalone())
