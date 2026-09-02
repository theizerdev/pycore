from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "PyCore - Enterprise Multi-Tenant SaaS"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Base de Datos
    DATABASE_URL: str = "mysql+aiomysql://root:@127.0.0.1:3307/pycore_db"
    
    # Seguridad JWT
    SECRET_KEY: str = "pycore_ultra_secure_secret_key_change_in_production_2026_x89f!q"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 horas
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
