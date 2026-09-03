from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback

from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal, ensure_database_exists
from app.services.seeder import seed_initial_data
from app.api.router import api_router

# Importar modelos para que Base.metadata los reconozca
import app.models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 0. Asegurar que la base de datos exista en el motor MySQL
    await ensure_database_exists()

    # 1. Crear tablas en la base de datos si no existen
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 2. Ejecutar Seeder de Seguridad y Multi-tenant
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)

    yield
    # Limpieza al apagar el servidor si fuera necesario

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST asíncrona para el Sistema Base Multi-Tenant PyCore",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("❌ ERROR NO CONTROLADO EN FASTAPI:")
    traceback.print_exc()
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno del servidor: {str(exc)}"},
        headers=headers
    )

# Incluir Rutas
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["General"])
async def root():
    return {
        "sistema": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "documentacion": "/docs",
        "estado": "Operativo 🟢"
    }

@app.get("/health", tags=["General"])
async def health_check():
    return {"status": "ok", "timestamp": "2026-08-31T11:00:00Z"}
