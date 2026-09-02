from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.paises import router as paises_router
from app.api.v1.empresas import router as empresas_router
from app.api.v1.sucursales import router as sucursales_router
from app.api.v1.roles import router as roles_router
from app.api.v1.permisos import router as permisos_router
from app.api.v1.usuarios import router as usuarios_router
from app.api.v1.auditoria import router as auditoria_router
from app.api.v1.integraciones import router as integraciones_router
from app.api.v1.monitoreo import router as monitoreo_router
from app.api.v1.planes import router as planes_router
from app.api.v1.suscripciones import router as suscripciones_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(paises_router)
api_router.include_router(empresas_router)
api_router.include_router(sucursales_router)
api_router.include_router(roles_router)
api_router.include_router(permisos_router)
api_router.include_router(usuarios_router)
api_router.include_router(auditoria_router)
api_router.include_router(integraciones_router)
api_router.include_router(monitoreo_router)
api_router.include_router(planes_router)
api_router.include_router(suscripciones_router)
