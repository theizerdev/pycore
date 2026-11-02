with open('backend/app/api/v1/medicos.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    return clean

router = APIRouter(prefix="/medicos", tags=["Médicos / Especialistas"])'''

replacement = '''    return clean


def get_empresa_codigo_pais(empresa: Any) -> str:
    """Obtiene el código telefónico internacional del país de la empresa (default: '58')."""
    if empresa:
        if hasattr(empresa, "pais_telefono") and empresa.pais_telefono and getattr(empresa.pais_telefono, "codigo_telefonico", None):
            return str(empresa.pais_telefono.codigo_telefonico).replace("+", "").strip()
        if hasattr(empresa, "pais") and empresa.pais and getattr(empresa.pais, "codigo_telefonico", None):
            return str(empresa.pais.codigo_telefonico).replace("+", "").strip()
    return "58"


router = APIRouter(prefix="/medicos", tags=["Médicos / Especialistas"])'''

if target in text:
    text = text.replace(target, replacement)
elif target.replace('\n', '\r\n') in text:
    text = text.replace(target.replace('\n', '\r\n'), replacement.replace('\n', '\r\n'))

with open('backend/app/api/v1/medicos.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("get_empresa_codigo_pais added to medicos.py")

