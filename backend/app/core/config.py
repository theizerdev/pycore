from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "PyCore - Enterprise Multi-Tenant SaaS"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Base de Datos
    DATABASE_URL: str = "mysql+aiomysql://root:@127.0.0.1:3307/pycore_db?charset=utf8mb4"
    
    # Seguridad JWT
    SECRET_KEY: str = "pycore_ultra_secure_secret_key_change_in_production_2026_x89f!q"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 horas
    
    # URL del Frontend (Portal Web)
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "https://medisoft.theizerdev.com",
        "http://medisoft.theizerdev.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8002",
        "http://127.0.0.1:8002",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

def get_frontend_base_url(request = None) -> str:
    """
    Retorna la URL base del frontend.
    Prioridad:
    1. Header 'Origin' del request HTTP si existe.
    2. Header 'Referer' del request HTTP si existe.
    3. settings.FRONTEND_URL (por defecto https://medisoft.theizerdev.com o valor en .env).
    """
    if request:
        origin = request.headers.get("origin")
        if origin and origin.strip():
            return origin.strip().rstrip("/")
        referer = request.headers.get("referer")
        if referer and referer.strip():
            from urllib.parse import urlparse
            parsed = urlparse(referer.strip())
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return getattr(settings, "FRONTEND_URL", "https://medisoft.theizerdev.com").rstrip("/")

