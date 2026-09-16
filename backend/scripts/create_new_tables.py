import sys
import os
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.core.database import engine, Base
from sqlalchemy import text
import app.models

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE estudios_adjuntos MODIFY COLUMN archivo_url LONGTEXT NOT NULL"))
            print("[SUCCESS] Columna archivo_url actualizada a LONGTEXT.")
        except Exception as e:
            print(f"[AVISO] Alter column: {e}")
    print("[SUCCESS] Nuevas tablas verificadas y creadas en MySQL.")

if __name__ == "__main__":
    asyncio.run(main())
