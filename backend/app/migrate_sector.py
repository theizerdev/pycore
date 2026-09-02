import asyncio
from sqlalchemy import text
from app.core.database import engine, AsyncSessionLocal
from app.services.seeder import seed_initial_data

async def migrate_and_seed():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE permisos ADD COLUMN sector VARCHAR(50) DEFAULT 'seguridad'"))
            print("Columna sector agregada a permisos")
        except Exception as e:
            print("Info columna:", e)

    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
        print("Seeder ejecutado con exito con sectores")

if __name__ == "__main__":
    asyncio.run(migrate_and_seed())
