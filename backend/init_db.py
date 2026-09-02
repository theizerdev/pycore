import asyncio
from sqlalchemy import text
from app.core.database import engine, Base, AsyncSessionLocal
import app.models
from app.services.seeder import seed_initial_data

async def main():
    print("Iniciando creación de tablas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Migraciones automáticas de columnas para SQLite
        alter_statements = [
            "ALTER TABLE empresas ADD COLUMN pais_id INTEGER REFERENCES pais(id)",
            "ALTER TABLE empresas ADD COLUMN pais_telefono_id INTEGER REFERENCES pais(id)",
            "ALTER TABLE empresas ADD COLUMN latitud FLOAT",
            "ALTER TABLE empresas ADD COLUMN longitud FLOAT",
            "ALTER TABLE empresas ADD COLUMN maptiler_api_key VARCHAR(255)",
            "ALTER TABLE empresas ADD COLUMN maptiler_active BOOLEAN DEFAULT 1",
            "ALTER TABLE sucursales ADD COLUMN pais_id INTEGER REFERENCES pais(id)",
            "ALTER TABLE sucursales ADD COLUMN pais_telefono_id INTEGER REFERENCES pais(id)",
            "ALTER TABLE sucursales ADD COLUMN latitud FLOAT",
            "ALTER TABLE sucursales ADD COLUMN longitud FLOAT",
            "ALTER TABLE usuarios ADD COLUMN pais_telefono_id INTEGER REFERENCES pais(id)",
        ]
        for stmt in alter_statements:
            try:
                await conn.execute(text(stmt))
            except Exception:
                pass  # Columna ya existe
    print("Tablas y columnas sincronizadas.")
    
    print("Ejecutando seeder...")
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
    print("Seeder completado con éxito!")

if __name__ == "__main__":
    asyncio.run(main())
