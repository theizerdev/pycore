import asyncio
import logging
import random
import secrets
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user,
    registrar_auditoria
)
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.rol import Rol
from app.models.empresa import Empresa
from app.models.suscripcion import Suscripcion
from app.models.sucursal import Sucursal
from app.models.integracion import WhatsAppMessage
from app.services.whatsapp_service import WhatsAppService
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    ChangePasswordRequest,
    SelectSucursalRequest,
    UpdatePerfilRequest,
    RegisterPublicRequest,
    ForgotPasswordRequest,
    VerifyWhatsAppOTPRequest,
    ResetPasswordOTPRequest,
    VerifyOTPRequest
)
from app.schemas.usuario import UsuarioResponse

router = APIRouter(prefix="/auth", tags=["Autenticación"])

@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Usuario)
        .where(Usuario.email == req.email)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash):
        await registrar_auditoria(
            db=db,
            usuario_id=user.id if user else None,
            empresa_id=user.empresa_id if user else None,
            accion="LOGIN_FALLIDO",
            modulo="auth",
            request=request,
            detalles={"email": req.email, "motivo": "Credenciales inválidas"}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos"
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta de usuario se encuentra inactiva. Contacta al administrador."
        )

    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    await db.commit()

    # Extraer permisos
    permisos = []
    if user.es_superadmin:
        permisos = ["*"]
    elif user.rol and user.rol.permisos:
        permisos = [p.slug for p in user.rol.permisos]

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "es_superadmin": user.es_superadmin,
        "empresa_id": user.empresa_id,
        "rol_slug": user.rol.slug if user.rol else None
    }
    access_token = create_access_token(data=token_data)

    await registrar_auditoria(
        db=db,
        usuario_id=user.id,
        empresa_id=user.empresa_id,
        accion="LOGIN_EXITOSO",
        modulo="auth",
        request=request,
        detalles={"usuario": f"{user.nombre} {user.apellido}", "email": user.email}
    )

    requires_otp = (not user.es_superadmin) and (not getattr(user, 'whatsapp_verified', False))

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UsuarioResponse.model_validate(user),
        permisos=permisos,
        sucursal_activa_id=user.sucursal_defecto_id,
        requires_whatsapp_verification=requires_otp,
        debug_otp_code=getattr(user, 'whatsapp_otp_code', None)
    )

@router.get("/me", response_model=TokenResponse)
async def get_my_profile(
    current_user: Usuario = Depends(get_current_active_user)
):
    permisos = []
    if current_user.es_superadmin:
        permisos = ["*"]
    elif current_user.rol and current_user.rol.permisos:
        permisos = [p.slug for p in current_user.rol.permisos]

    token_data = {
        "sub": str(current_user.id),
        "email": current_user.email,
        "es_superadmin": current_user.es_superadmin,
        "empresa_id": current_user.empresa_id,
        "rol_slug": current_user.rol.slug if current_user.rol else None
    }
    access_token = create_access_token(data=token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UsuarioResponse.model_validate(current_user),
        permisos=permisos,
        sucursal_activa_id=current_user.sucursal_defecto_id
    )

@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(req.password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta"
        )

    if len(req.password_nueva) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )

    current_user.password_hash = get_password_hash(req.password_nueva)
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="CAMBIO_PASSWORD",
        modulo="auth",
        request=request,
        detalles={"usuario_id": current_user.id}
    )

    return {"mensaje": "Contraseña actualizada exitosamente"}

@router.put("/perfil", response_model=UsuarioResponse)
async def update_profile(
    req: UpdatePerfilRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    if req.nombre is not None:
        current_user.nombre = req.nombre.strip()
    if req.apellido is not None:
        current_user.apellido = req.apellido.strip()
    if req.telefono is not None:
        current_user.telefono = req.telefono.strip()

    await db.commit()
    await db.refresh(current_user)

    # Re-cargar relaciones para la respuesta
    stmt = (
        select(Usuario)
        .where(Usuario.id == current_user.id)
        .options(
            selectinload(Usuario.rol).selectinload(Rol.permisos),
            selectinload(Usuario.empresa),
            selectinload(Usuario.sucursal_defecto),
            selectinload(Usuario.sucursales_asignadas).selectinload(UsuarioSucursal.sucursal)
        )
    )
    result = await db.execute(stmt)
    updated_user = result.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="ACTUALIZAR_PERFIL",
        modulo="auth",
        request=request,
        detalles={"usuario_id": current_user.id, "nombre": current_user.nombre, "apellido": current_user.apellido}
    )

    return UsuarioResponse.model_validate(updated_user)


@router.post("/register-public", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_public_empresa(
    req: RegisterPublicRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Permite el auto-registro de una nueva empresa/clínica con Plan Prueba de 7 Días ($0.00)."""
    stmt_usr = select(Usuario).where(Usuario.email == req.email)
    res_usr = await db.execute(stmt_usr)
    if res_usr.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Este correo electrónico ya se encuentra registrado en el sistema."
        )

    import secrets, re, random
    from datetime import timedelta
    from app.models.empresa import Empresa
    from app.models.sucursal import Sucursal
    from app.models.plan import Plan
    from app.models.suscripcion import Suscripcion
    from app.models.integracion import WhatsAppMessage

    now = datetime.now()
    vencimiento_prueba = now + timedelta(days=7)

    stmt_prueba = select(Plan).where(Plan.codigo == 'prueba', Plan.activo == True)
    res_prueba = await db.execute(stmt_prueba)
    plan_prueba = res_prueba.scalar_one_or_none()

    # 0. Resolver teléfono (soporta req.telefono y req.company_phone de FixSale POS)
    phone_number = (req.telefono or req.company_phone or "").strip() or None

    # 1. Documento Fiscal (RIF/DNI)
    doc_fiscal = req.company_document.strip() if req.company_document else f"S/D-{secrets.token_hex(3).upper()}"

    # 2. Instancia WhatsApp limpia (ej. "centro-medico" -> "centromedicosalud")
    base_name = req.nombre_comercial or req.company_name
    clean_instance = re.sub(r'[^a-zA-Z0-9_-]', '', base_name.replace(' ', '').lower())
    if not clean_instance:
        clean_instance = f"empresa_wa_{secrets.token_hex(4)}"

    # 3. Generar API Keys de 32 caracteres y código OTP de 8 dígitos
    api_key_str = f"mf_{secrets.token_hex(16)}"
    wa_api_key_str = f"wa_{secrets.token_hex(16)}"
    otp_code_str = str(random.randint(10000000, 99999999))

    empresa = Empresa(
        nombre=req.company_name,
        identificacion_fiscal=doc_fiscal,
        email=req.email,
        telefono=phone_number,
        pais_id=req.pais_id or 2,
        pais_telefono_id=req.pais_id or 2,
        plan_id=plan_prueba.id if plan_prueba else None,
        plan_estado="prueba",
        plan_vencimiento=vencimiento_prueba,
        whatsapp_active=True,
        whatsapp_status="disconnected",
        whatsapp_instance=clean_instance,
        whatsapp_api_key=wa_api_key_str,
        activo=True
    )
    db.add(empresa)
    await db.flush()

    # 4. Crear Registro en Suscripción
    sub_prueba = Suscripcion(
        empresa_id=empresa.id,
        plan_id=plan_prueba.id if plan_prueba else None,
        nombre_plan="Prueba Gratuita",
        ciclo_meses=0,
        max_sucursales=1,
        monto_total=0.00,
        fecha_inicio=now,
        fecha_vencimiento=vencimiento_prueba,
        estado="trial"
    )
    db.add(sub_prueba)
    await db.flush()

    # 5. Crear Sucursal Principal
    sucursal = Sucursal(
        empresa_id=empresa.id,
        nombre="Sucursal Principal",
        direccion="Sede Principal",
        telefono=phone_number,
        pais_id=req.pais_id or 2,
        activo=True
    )
    db.add(sucursal)
    await db.flush()

    # 6. Crear Usuario Administrador (Rol ID 2, whatsapp_verified = False)
    stmt_rol = select(Rol).where(Rol.id == 2)
    res_rol = await db.execute(stmt_rol)
    rol_admin = res_rol.scalar_one_or_none()

    partes_nombre = req.representante_legal.strip().split(' ', 1)
    nombre = partes_nombre[0]
    apellido = partes_nombre[1] if len(partes_nombre) > 1 else "Administrador"

    user = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=req.email,
        password_hash=get_password_hash(req.password),
        telefono=phone_number,
        empresa_id=empresa.id,
        sucursal_defecto_id=sucursal.id,
        rol_id=rol_admin.id if rol_admin else 2,
        es_superadmin=False,
        whatsapp_otp_code=otp_code_str,
        whatsapp_otp_expires_at=now + timedelta(minutes=15),
        whatsapp_verified=False,
        activo=True
    )
    db.add(user)
    await db.flush()

    usr_suc = UsuarioSucursal(
        usuario_id=user.id,
        sucursal_id=sucursal.id
    )
    db.add(usr_suc)

    # 7. Registrar Mensaje Oficial de Bienvenida de WhatsApp con OTP de 8 Dígitos en BD
    if phone_number:
        msg_welcome = (
            f"🔐 *Bienvenido a PyCore SaaS*\n\n"
            f"Estimado(a) *{req.representante_legal}*,\n"
            f"¡Gracias por registrar la empresa *{req.company_name}*!\n\n"
            f"Su Plan Prueba de 7 Días ha sido activado exitosamente.\n\n"
            f"🔑 *Su código de verificación OTP de 8 dígitos es:* *{otp_code_str}*\n\n"
            f"Para vincular su instancia de WhatsApp y enviar notificaciones a sus clientes, ingrese a: /integraciones/whatsapp\n\n"
            f"¡Muchas gracias por su confianza!"
        )
        msg_obj = WhatsAppMessage(
            empresa_id=1,  # Enviado desde la Empresa Matriz (ID 1 - Dueña del SaaS)
            recipient_phone=phone_number,
            recipient_name=req.representante_legal,
            message_content=msg_welcome,
            status="sent",
            direction="outbound"
        )
        db.add(msg_obj)

    await db.commit()

    # 8. Creación de instancia en el motor WhatsApp & Envío HTTP en Vivo
    import asyncio, logging
    from app.services.whatsapp_service import WhatsAppService
    try:
        wa_service_new = WhatsAppService(
            instance_name=clean_instance,
            company_id=empresa.id,
            api_key=wa_api_key_str
        )
        asyncio.create_task(wa_service_new.connect_instance())
    except Exception as e:
        logging.getLogger(__name__).warning(f"No se pudo crear la instancia inicial en el motor WhatsApp: {e}")

    if phone_number:
        try:
            stmt_emp1 = select(Empresa).where(Empresa.id == 1)
            res_emp1 = await db.execute(stmt_emp1)
            emp1 = res_emp1.scalar_one_or_none()

            master_api_url = (emp1 and emp1.whatsapp_api_url) or "https://whatsapp.theizerdev.com"
            master_api_key = (emp1 and emp1.whatsapp_api_key) or "9e3adb33-1574-499d-85c4-1711aed8849d"
            master_instance = (emp1 and emp1.whatsapp_instance) or "theizerdev"

            clean_phone = WhatsAppService.format_phone_number(phone_number, "+58")

            wa_service_master = WhatsAppService(
                api_url=master_api_url,
                api_key=master_api_key,
                instance_name=master_instance,
                company_id=1,
                country_code="+58"
            )
            send_res = await wa_service_master.send_message(to=clean_phone, message=msg_welcome)
            logging.getLogger(__name__).info(f"Envío WhatsApp registro OTP a {clean_phone}: {send_res}")
        except Exception as e:
            logging.getLogger(__name__).warning(f"No se pudo enviar el mensaje en vivo de WhatsApp: {e}")

    return await login(req=LoginRequest(email=req.email, password=req.password), request=request, db=db)


@router.post("/forgot-password")
async def forgot_password_request(
    req: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Solicita la recuperación de contraseña enviando un código OTP de 8 dígitos al WhatsApp del usuario."""
    clean_email = req.email.strip().lower()
    stmt = (
        select(Usuario)
        .where(func.lower(func.trim(Usuario.email)) == clean_email)
        .options(selectinload(Usuario.empresa))
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe ninguna cuenta registrada con este correo electrónico."
        )

    # 1. Obtener número de teléfono registrado
    raw_phone = (user.telefono or (user.empresa.telefono if user.empresa else None) or "").strip()
    if not raw_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El usuario no posee un número de teléfono / WhatsApp registrado para enviar el código de recuperación."
        )

    # 2. Formatear teléfono
    formatted_phone = WhatsAppService.format_phone_number(raw_phone, "+58")

    # 3. Generar código OTP de 8 dígitos y vencimiento a 15 min
    now = datetime.now()
    otp_code_str = str(random.randint(10000000, 99999999))
    user.whatsapp_otp_code = otp_code_str
    user.whatsapp_otp_expires_at = now + timedelta(minutes=15)
    await db.commit()

    # 4. Registrar auditoría
    await registrar_auditoria(
        db=db,
        usuario_id=user.id,
        empresa_id=user.empresa_id,
        accion="SOLICITUD_RECUPERACION_PASSWORD_OTP",
        modulo="auth",
        request=request,
        detalles={"email": clean_email, "telefono": formatted_phone}
    )

    # 5. Enviar mensaje de recuperación de OTP desde la conexión de la Empresa Matriz (ID 1)
    msg_recovery = (
        f"🔐 *Recuperación de Contraseña - PyCore*\n\n"
        f"Estimado(a) *{user.nombre}*,\n\n"
        f"Hemos recibido una solicitud para restablecer la contraseña de su cuenta (*{user.email}*).\n\n"
        f"🔑 *Su código de recuperación OTP de 8 dígitos es:* *{otp_code_str}*\n\n"
        f"Este código expira en 15 minutos. Si usted no solicitó este cambio, por favor ignore este mensaje."
    )

    # Registrar mensaje en la BD (empresa_id = 1)
    msg_obj = WhatsAppMessage(
        empresa_id=1,
        recipient_phone=formatted_phone,
        recipient_name=f"{user.nombre} {user.apellido}",
        message_content=msg_recovery,
        status="sent",
        direction="outbound"
    )
    db.add(msg_obj)
    await db.commit()

    try:
        stmt_emp1 = select(Empresa).where(Empresa.id == 1)
        res_emp1 = await db.execute(stmt_emp1)
        emp1 = res_emp1.scalar_one_or_none()

        master_api_url = (emp1 and emp1.whatsapp_api_url) or "https://whatsapp.theizerdev.com"
        master_api_key = (emp1 and emp1.whatsapp_api_key) or "9e3adb33-1574-499d-85c4-1711aed8849d"
        master_instance = (emp1 and emp1.whatsapp_instance) or "theizerdev"

        wa = WhatsAppService(
            api_url=master_api_url,
            api_key=master_api_key,
            instance_name=master_instance,
            company_id=1,
            country_code="+58"
        )
        send_res = await wa.send_message(to=formatted_phone, message=msg_recovery)
        logging.getLogger(__name__).info(f"Envío recuperación OTP WhatsApp a {formatted_phone}: {send_res}")
    except Exception as e:
        logging.getLogger(__name__).warning(f"No se pudo enviar el mensaje OTP de recuperación por WhatsApp: {e}")

    return {
        "success": True,
        "mensaje": f"Se ha enviado un código de recuperación OTP de 8 dígitos a su WhatsApp ({formatted_phone}).",
        "email": user.email,
        "debug_otp_code": otp_code_str
    }


@router.post("/verify-otp")
async def verify_otp(
    req: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db)
):
    """Verifica si un código OTP de 8 dígitos es válido y se encuentra vigente."""
    clean_email = req.email.strip().lower()
    clean_otp = req.otp_code.strip()

    stmt = select(Usuario).where(func.lower(func.trim(Usuario.email)) == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún usuario con el correo especificado."
        )

    if not user.whatsapp_otp_code or user.whatsapp_otp_code.strip() != clean_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código OTP de 8 dígitos ingresado es incorrecto o no coincide."
        )

    if user.whatsapp_otp_expires_at and datetime.now() > user.whatsapp_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código OTP ha expirado (validez de 15 minutos). Por favor solicita un nuevo código."
        )

    return {
        "valid": True,
        "mensaje": "✓ Código OTP de 8 dígitos verificado y vigente correctamente."
    }


@router.post("/reset-password-otp")
async def reset_password_otp(
    req: ResetPasswordOTPRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Restablece la contraseña del usuario utilizando el código OTP de 8 dígitos recibido por WhatsApp."""
    clean_email = req.email.strip().lower()
    stmt = select(Usuario).where(func.lower(func.trim(Usuario.email)) == clean_email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún usuario con el correo especificado."
        )

    if not user.whatsapp_otp_code or user.whatsapp_otp_code.strip() != req.otp_code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código OTP ingresado es incorrecto."
        )

    if user.whatsapp_otp_expires_at and datetime.now() > user.whatsapp_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código OTP ha expirado. Por favor solicita un nuevo código de recuperación."
        )

    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 6 caracteres."
        )

    user.password_hash = get_password_hash(req.new_password)
    user.whatsapp_otp_code = None
    user.whatsapp_otp_expires_at = None
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=user.id,
        empresa_id=user.empresa_id,
        accion="RESTABLECER_PASSWORD_EXITOSO_OTP",
        modulo="auth",
        request=request,
        detalles={"email": clean_email}
    )

    return {
        "success": True,
        "mensaje": "Su contraseña ha sido restablecida exitosamente. Ya puede iniciar sesión con su nueva contraseña."
    }


@router.post("/verify-whatsapp")
async def verify_whatsapp(
    req: VerifyWhatsAppOTPRequest,
    request: Request,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Verifica el código OTP de 8 dígitos de WhatsApp para activar el acceso completo."""
    if current_user.whatsapp_verified:
        return {"success": True, "mensaje": "Tu cuenta ya se encuentra verificada."}

    if not current_user.whatsapp_otp_code or current_user.whatsapp_otp_code.strip() != req.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación OTP ingresado es incorrecto o no coincide."
        )

    if current_user.whatsapp_otp_expires_at and datetime.now() > current_user.whatsapp_otp_expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código OTP ha expirado. Por favor solicita un reenvío de código."
        )

    current_user.whatsapp_verified = True
    current_user.whatsapp_otp_code = None
    current_user.whatsapp_otp_expires_at = None
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=current_user.empresa_id,
        accion="VERIFICACION_WHATSAPP_EXITOSA",
        modulo="auth",
        request=request,
        detalles={"usuario_id": current_user.id}
    )

    return {
        "success": True,
        "mensaje": "¡Verificación de WhatsApp exitosa! Tu cuenta ha sido activada correctamente."
    }


@router.post("/resend-whatsapp-otp")
async def resend_whatsapp_otp(
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Reenvía un nuevo código OTP de 8 dígitos por WhatsApp desde la Empresa Matriz."""
    import random
    from datetime import timedelta
    from app.models.integracion import WhatsAppMessage

    new_otp = str(random.randint(10000000, 99999999))
    current_user.whatsapp_otp_code = new_otp
    current_user.whatsapp_otp_expires_at = datetime.now() + timedelta(minutes=15)

    raw_phone = (current_user.telefono or (current_user.empresa.telefono if current_user.empresa else None) or "").strip()
    if not raw_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes un número de teléfono/WhatsApp registrado para recibir el código."
        )

    clean_phone = WhatsAppService.format_phone_number(raw_phone, "+58")

    msg_text = (
        f"🔑 *Código de Verificación OTP - PyCore*\n\n"
        f"Estimado(a) *{current_user.nombre}*,\n"
        f"Su código OTP de 8 dígitos es: *{new_otp}*\n\n"
        f"Ingrese este código en el sistema para verificar y activar su cuenta."
    )

    msg_obj = WhatsAppMessage(
        empresa_id=1,
        recipient_phone=clean_phone,
        recipient_name=f"{current_user.nombre} {current_user.apellido}",
        message_content=msg_text,
        status="sent",
        direction="outbound"
    )
    db.add(msg_obj)
    await db.commit()

    # Despachar mensaje en vivo vía WhatsAppService
    try:
        stmt_emp1 = select(Empresa).where(Empresa.id == 1)
        res_emp1 = await db.execute(stmt_emp1)
        emp1 = res_emp1.scalar_one_or_none()

        master_api_url = (emp1 and emp1.whatsapp_api_url) or "https://whatsapp.theizerdev.com"
        master_api_key = (emp1 and emp1.whatsapp_api_key) or "9e3adb33-1574-499d-85c4-1711aed8849d"
        master_instance = (emp1 and emp1.whatsapp_instance) or "theizerdev"

        wa_service = WhatsAppService(
            api_url=master_api_url,
            api_key=master_api_key,
            instance_name=master_instance,
            company_id=1,
            country_code="+58"
        )
        send_res = await wa_service.send_message(to=clean_phone, message=msg_text)
        logging.getLogger(__name__).info(f"Resultado reenvío WhatsApp OTP a {clean_phone}: {send_res}")
    except Exception as ex:
        logging.getLogger(__name__).warning(f"Error despachando WhatsApp OTP: {ex}")

    return {
        "success": True,
        "mensaje": f"Se ha reenviado un nuevo código OTP de 8 dígitos a tu WhatsApp ({clean_phone}).",
        "debug_otp_code": new_otp
    }


