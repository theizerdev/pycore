import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        dialect_name = conn.dialect.name
        print("Connected with dialect:", dialect_name)
        
        liquidaciones_columns = [
            ("porcentaje_retencion_islr", "DECIMAL(5, 2) DEFAULT 3.00"),
            ("monto_retencion_islr_usd", "DECIMAL(12, 2) DEFAULT 0.00"),
            ("monto_retencion_islr_ves", "DECIMAL(12, 2) DEFAULT 0.00"),
            ("numero_comprobante_islr", "VARCHAR(50) NULL"),
        ]

        if dialect_name == "mysql":
            for col_name, col_type in liquidaciones_columns:
                res = await conn.execute(text(
                    f"SELECT COUNT(*) FROM information_schema.columns "
                    f"WHERE table_schema = DATABASE() AND table_name = 'liquidaciones_honorarios' AND column_name = '{col_name}'"
                ))
                exists = res.scalar() > 0
                if not exists:
                    print(f"Adding column {col_name} to liquidaciones_honorarios...")
                    await conn.execute(text(f"ALTER TABLE liquidaciones_honorarios ADD COLUMN {col_name} {col_type}"))
                else:
                    print(f"Column {col_name} already exists.")
        else:
            res = await conn.execute(text("PRAGMA table_info(liquidaciones_honorarios)"))
            existing_cols = [row[1] for row in res.fetchall()]
            for col_name, col_type in liquidaciones_columns:
                if col_name not in existing_cols:
                    print(f"Adding SQLite column {col_name}...")
                    await conn.execute(text(f"ALTER TABLE liquidaciones_honorarios ADD COLUMN {col_name} {col_type}"))
                else:
                    print(f"Column {col_name} already exists.")

    print("Migration finished successfully!")

if __name__ == "__main__":
    asyncio.run(main())

