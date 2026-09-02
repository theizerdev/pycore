from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.schemas.usuario import UsuarioResponse

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioResponse
    permisos: List[str] = []
    sucursal_activa_id: Optional[int] = None
    requires_whatsapp_verification: bool = False
    debug_otp_code: Optional[str] = None

class VerifyWhatsAppOTPRequest(BaseModel):
    code: str

class ChangePasswordRequest(BaseModel):
    password_actual: str
    password_nueva: str

class UpdatePerfilRequest(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None

class SelectSucursalRequest(BaseModel):
    sucursal_id: int

class RegisterPublicRequest(BaseModel):
    company_name: str
    nombre_comercial: Optional[str] = None
    company_document: Optional[str] = None
    representante_legal: str
    email: EmailStr
    password: str
    telefono: Optional[str] = None
    company_phone: Optional[str] = None
    pais_id: Optional[int] = 2
    pais_telefono_id: Optional[int] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str

