import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

async def test_full_security_flow():
    print("Iniciando pruebas de integracion de seguridad...")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Test Health
        r_health = await ac.get("/health")
        assert r_health.status_code == 200, f"Error en /health: {r_health.text}"
        print("[OK] Health check OK")

        # 2. Test Login Superadmin
        r_login = await ac.post("/api/v1/auth/login", json={
            "email": "admin@pycore.com",
            "password": "Admin1234*"
        })
        assert r_login.status_code == 200, f"Error en login: {r_login.text}"
        login_data = r_login.json()
        token = login_data["access_token"]
        assert token is not None
        assert login_data["user"]["es_superadmin"] is True
        print(f"[OK] Login Superadmin OK: {login_data['user']['nombre']} {login_data['user']['apellido']}")

        headers = {"Authorization": f"Bearer {token}"}

        # 3. Test Me
        r_me = await ac.get("/api/v1/auth/me", headers=headers)
        assert r_me.status_code == 200
        print("[OK] /auth/me OK")

        # 4. Test List Empresas
        r_emp = await ac.get("/api/v1/empresas", headers=headers)
        assert r_emp.status_code == 200
        empresas = r_emp.json()
        assert len(empresas) >= 1
        print(f"[OK] List Empresas OK ({len(empresas)} encontradas)")

        # 5. Test List Sucursales
        r_suc = await ac.get("/api/v1/sucursales", headers=headers)
        assert r_suc.status_code == 200
        sucursales = r_suc.json()
        assert len(sucursales) >= 1
        print(f"[OK] List Sucursales OK ({len(sucursales)} encontradas)")

        # 6. Test List Roles
        r_rol = await ac.get("/api/v1/roles", headers=headers)
        assert r_rol.status_code == 200
        roles = r_rol.json()
        assert len(roles) >= 5
        print(f"[OK] List Roles OK ({len(roles)} configurados)")

        # 7. Test List Usuarios
        r_usr = await ac.get("/api/v1/usuarios", headers=headers)
        assert r_usr.status_code == 200
        usuarios = r_usr.json()
        assert len(usuarios) >= 3
        print(f"[OK] List Usuarios OK ({len(usuarios)} registrados)")

        # 8. Test List Auditoria
        r_aud = await ac.get("/api/v1/auditoria", headers=headers)
        assert r_aud.status_code == 200
        logs = r_aud.json()
        assert len(logs) >= 1
        print(f"[OK] List Auditoria OK ({len(logs)} eventos registrados)")

        # 9. Test Paises API
        r_paises = await ac.get("/api/v1/paises", headers=headers)
        assert r_paises.status_code == 200
        paises = r_paises.json()
        assert len(paises) >= 10
        print(f"[OK] List Países OK ({len(paises)} países encontrados)")

        # Test single country
        first_pais = paises[0]
        r_single = await ac.get(f"/api/v1/paises/{first_pais['id']}", headers=headers)
        assert r_single.status_code == 200
        assert r_single.json()["codigo_iso2"] == first_pais["codigo_iso2"]
        print(f"[OK] Get País OK: {first_pais['nombre']} ({first_pais['codigo_iso2']})")

    print("\nTODAS LAS PRUEBAS DE SEGURIDAD, PAÍSES Y MULTI-TENANT PASARON CON EXITO!")

if __name__ == "__main__":
    asyncio.run(test_full_security_flow())
