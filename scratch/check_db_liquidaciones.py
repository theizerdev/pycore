import sys
from pathlib import Path
sys.path.insert(0, str(Path("backend").resolve()))

import asyncio
from app.core.database import engine
from sqlalchemy import text

async def check():
    async with engine.begin() as conn:
        res = await conn.execute(text("DESCRIBE liquidaciones_honorarios"))
        columns = [row[0] for row in res.fetchall()]
        print("COLUMNS IN liquidaciones_honorarios:", columns)

if __name__ == "__main__":
    asyncio.run(check())

