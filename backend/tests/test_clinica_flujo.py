import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_listar_especialidades(client: AsyncClient, superadmin_headers: dict):
    """Verifica que el catálogo de especialidades médicas responda correctamente."""
    response = await client.get("/api/v1/especialidades", headers=superadmin_headers)
    assert response.status_code == 200
    especialidades = response.json()
    assert isinstance(especialidades, list)
    assert len(especialidades) >= 1

@pytest.mark.asyncio
async def test_listar_medicos(client: AsyncClient, superadmin_headers: dict):
    """Verifica consulta del directorio de médicos especialistas."""
    response = await client.get("/api/v1/medicos", headers=superadmin_headers)
    assert response.status_code == 200
    medicos = response.json()
    assert isinstance(medicos, list)

@pytest.mark.asyncio
async def test_crear_y_consultar_paciente(client: AsyncClient, superadmin_headers: dict):
    """Verifica el registro y posterior consulta de un paciente."""
    # Obtener empresas para asociar
    r_emp = await client.get("/api/v1/empresas", headers=superadmin_headers)
    assert r_emp.status_code == 200
    empresas = r_emp.json()
    assert len(empresas) >= 1
    empresa_id = empresas[0]["id"]

    cedula_test = f"V-{uuid.uuid4().hex[:8]}"
    paciente_data = {
        "empresa_id": empresa_id,
        "nombres": "Paciente",
        "apellidos": "Prueba Automatizada",
        "tipo_documento": "V",
        "documento_identidad": cedula_test,
        "email": f"test_{uuid.uuid4().hex[:6]}@paciente.com",
        "telefono": "+584121234567",
        "genero": "M",
        "grupo_sanguineo": "O+",
        "alergias": ["Penicilina", "Polen"],
        "antecedentes_patologicos": "Hipertensión controlada",
        "activo": True
    }

    # Crear paciente
    r_crear = await client.post("/api/v1/pacientes", json=paciente_data, headers=superadmin_headers)
    assert r_crear.status_code in [200, 201], f"Fallo creación paciente: {r_crear.text}"
    creado = r_crear.json()
    assert creado["documento_identidad"] == cedula_test
    paciente_id = creado["id"]

    # Consultar detalle del paciente
    r_get = await client.get(f"/api/v1/pacientes/{paciente_id}", headers=superadmin_headers)
    assert r_get.status_code == 200
    detalle = r_get.json()
    assert detalle["nombres"] == "Paciente"
    assert "Penicilina" in detalle.get("alergias", [])

@pytest.mark.asyncio
async def test_listar_citas_medicas(client: AsyncClient, superadmin_headers: dict):
    """Verifica que el listado de citas médicas opere sin errores."""
    response = await client.get("/api/v1/citas", headers=superadmin_headers)
    assert response.status_code == 200
    citas = response.json()
    assert isinstance(citas, list)

@pytest.mark.asyncio
async def test_listar_consultas_medicas(client: AsyncClient, superadmin_headers: dict):
    """Verifica consulta del registro histórico de atenciones médicas."""
    response = await client.get("/api/v1/consultas", headers=superadmin_headers)
    assert response.status_code == 200
    consultas = response.json()
    assert isinstance(consultas, list)
