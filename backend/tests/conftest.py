import pytest
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport
import app.core.database as db_module
from app.core.config import settings
from app.main import app

# Configurar motor con NullPool para evitar conflictos de event loop entre pruebas en Windows
test_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    connect_args={"charset": "utf8mb4"} if "mysql" in settings.DATABASE_URL else {}
)
db_module.engine = test_engine
db_module.AsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def superadmin_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@pycore.com",
        "password": "Admin1234*"
    })
    assert resp.status_code == 200, f"Fallo login superadmin: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture
async def superadmin_headers(superadmin_token: str):
    return {"Authorization": f"Bearer {superadmin_token}"}

@pytest.fixture
async def company_admin_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@plataforma.com",
        "password": "Admin1234*"
    })
    assert resp.status_code == 200, f"Fallo login admin empresa: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture
async def company_admin_headers(company_admin_token: str):
    return {"Authorization": f"Bearer {company_admin_token}"}
