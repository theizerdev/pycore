import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Verifica que el endpoint de health responda status 200."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"

@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient):
    """Verifica rechazo con credenciales incorrectas."""
    response = await client.post("/api/v1/auth/login", json={
        "email": "noexiste@pycore.com",
        "password": "WrongPassword123"
    })
    assert response.status_code in [400, 401, 404]

@pytest.mark.asyncio
async def test_auth_me_superadmin(client: AsyncClient, superadmin_headers: dict):
    """Verifica obtención de perfil del superadministrador autenticado."""
    response = await client.get("/api/v1/auth/me", headers=superadmin_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "admin@pycore.com"
    assert data["user"]["es_superadmin"] is True

@pytest.mark.asyncio
async def test_unauthorized_access(client: AsyncClient):
    """Verifica que las rutas protegidas no sean accesibles sin Bearer token."""
    response = await client.get("/api/v1/empresas")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_list_empresas_superadmin(client: AsyncClient, superadmin_headers: dict):
    """Verifica que el superadministrador pueda listar empresas."""
    response = await client.get("/api/v1/empresas", headers=superadmin_headers)
    assert response.status_code == 200
    empresas = response.json()
    assert isinstance(empresas, list)
    assert len(empresas) >= 1

@pytest.mark.asyncio
async def test_list_roles_and_permisos(client: AsyncClient, superadmin_headers: dict):
    """Verifica catálogo de roles del sistema."""
    response = await client.get("/api/v1/roles", headers=superadmin_headers)
    assert response.status_code == 200
    roles = response.json()
    assert isinstance(roles, list)
    assert len(roles) >= 1
