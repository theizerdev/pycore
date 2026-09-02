from datetime import datetime, timedelta
from typing import Optional, List, Any, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.rol import Rol
from app.models.auditoria import AuditoriaLog

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales de acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    stmt = (
        select(Usuario)
        .where(Usuario.id == user_id)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    if not current_user.activo:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo en el sistema")
    return current_user

async def require_superadmin(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    if not current_user.es_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido: requiere permisos de Superadministrador"
        )
    return current_user

def require_permission(required_slug: str):
    async def permission_dependency(
        current_user: Usuario = Depends(get_current_active_user)
    ) -> Usuario:
        if current_user.es_superadmin:
            return current_user
        
        user_permissions = []
        if current_user.rol and current_user.rol.permisos:
            user_permissions = [p.slug for p in current_user.rol.permisos]
            
        if required_slug not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permiso denegado: se requiere el permiso '{required_slug}'"
            )
        return current_user
    return permission_dependency

async def registrar_auditoria(
    db: AsyncSession,
    usuario_id: Optional[int],
    empresa_id: Optional[int],
    accion: str,
    modulo: str,
    request: Optional[Request] = None,
    detalles: Optional[Dict[str, Any]] = None
):
    ip = None
    user_agent = None
    if request:
        ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")

    log = AuditoriaLog(
        usuario_id=usuario_id,
        empresa_id=empresa_id,
        accion=accion,
        modulo=modulo,
        ip=ip,
        user_agent=user_agent,
        detalles=detalles
    )
    db.add(log)
    await db.commit()
