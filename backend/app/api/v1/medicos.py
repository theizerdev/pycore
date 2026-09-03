from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func

from app.core.database import get_db
from app.core.security import (
    require_permission,
    get_password_hash,
    registrar_auditoria
)
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.rol import Rol
from app.models.especialidad import Especialidad
from app.models.sucursal import Sucursal
from app.models.pais import Pais
from app.models.medico import Medico
from app.schemas.medico import (
    MedicoCreate,
    MedicoUpdate,
    MedicoResponse
)

router = APIRouter(prefix="/medicos", tags=["Médicos / Especialistas"])

def _format_medico_response(m: Medico) -> MedicoResponse:
    subespecialidades_data = m.subespecialidades if isinstance(m.subespecialidades, list) else []
    sucursales_ids_data = m.sucursales_ids if isinstance(m.sucursales_ids, list) else []

    return MedicoResponse(
        id=m.id,
        empresa_id=m.empresa_id,
        usuario_id=m.usuario_id,
        nombres=m.nombres,
        apellidos=m.apellidos,
        tipo_documento=m.tipo_documento,
        documento_identidad=m.documento_identidad,
        email=m.email,
        pais_telefono_id=m.pais_telefono_id,
        telefono=m.telefono,
        licencia_medica=m.licencia_medica,
        especialidad_id=m.especialidad_id,
        subespecialidades=subespecialidades_data,
        color=m.color,
        sucursal_defecto_id=m.sucursal_defecto_id,
        sucursales_ids=sucursales_ids_data,
        biografia=m.biografia,
        activo=m.activo,
        created_at=m.created_at,
        updated_at=m.updated_at,
        especialidad_nombre=m.especialidad.nombre if m.especialidad else None,
        especialidad_codigo=m.especialidad.codigo if m.especialidad else None,
        especialidad_color=m.especialidad.color if m.especialidad else None,
        especialidad_icono=m.especialidad.icono if m.especialidad else None,
        pais_nombre=m.pais_telefono.nombre if m.pais_telefono else None,
        pais_codigo_iso2=m.pais_telefono.codigo_iso2 if m.pais_telefono else None,
        pais_codigo_telefonico=m.pais_telefono.codigo_telefonico if m.pais_telefono else None,
        sucursal_nombre=m.sucursal_defecto.nombre if m.sucursal_defecto else None,
        usuario_activo=m.usuario.activo if m.usuario else None
    )

@router.get("", response_model=List[MedicoResponse])
async def list_medicos(
    search: Optional[str] = None,
    especialidad_id: Optional[int] = None,
    sucursal_id: Optional[int] = None,
    activo: Optional[bool] = None,
    empresa_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("medicos.ver"))
):
    """
    Lista el directorio médico asistencial con filtros por especialidad, sucursal y estado.
    """
    stmt = select(Medico).options(
        selectinload(Medico.especialidad),
        selectinload(Medico.pais_telefono),
        selectinload(Medico.sucursal_defecto),
        selectinload(Medico.usuario)
    )

    if not current_user.es_superadmin:
        stmt = stmt.where(Medico.empresa_id == current_user.empresa_id)
    elif empresa_id is not None:
        stmt = stmt.where(Medico.empresa_id == empresa_id)

    if especialidad_id is not None:
        stmt = stmt.where(Medico.especialidad_id == especialidad_id)

    if activo is not None:
        stmt = stmt.where(Medico.activo == activo)

    if sucursal_id is not None:
        stmt = stmt.where(
            or_(
                Medico.sucursal_defecto_id == sucursal_id,
                func.json_contains(Medico.sucursales_ids, str(sucursal_id))
            )
        )

    if search:
        search_fmt = f"%{search}%"
        stmt = stmt.where(
            or_(
                Medico.nombres.ilike(search_fmt),
                Medico.apellidos.ilike(search_fmt),
                Medico.documento_identidad.ilike(search_fmt),
                Medico.email.ilike(search_fmt),
                Medico.telefono.ilike(search_fmt),
                Medico.licencia_medica.ilike(search_fmt)
            )
        )

    stmt = stmt.order_by(Medico.apellidos.asc(), Medico.nombres.asc())
    result = await db.execute(stmt)
    medicos = result.scalars().all()

    return [_format_medico_response(m) for m in medicos]


@router.post("", response_model=MedicoResponse, status_code=status.HTTP_201_CREATED)
async def create_medico(
    req: MedicoCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("medicos.crear"))
):
    """
    Registra un nuevo médico y opcionalmente crea su cuenta de usuario con rol de Médico Especialista.
    """
    target_empresa_id = req.empresa_id if current_user.es_superadmin and req.empresa_id else current_user.empresa_id
    if not target_empresa_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se determinó la empresa destino")

    # 1. Validar que la especialidad exista
    stmt_esp = select(Especialidad).where(
        Especialidad.id == req.especialidad_id,
        Especialidad.empresa_id == target_empresa_id
    )
    res_esp = await db.execute(stmt_esp)
    esp = res_esp.scalar_one_or_none()
    if not esp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La especialidad seleccionada no existe o no pertenece a la empresa")

    # 2. Validar documento de identidad único por empresa
    stmt_doc = select(Medico).where(
        Medico.empresa_id == target_empresa_id,
        Medico.documento_identidad == req.documento_identidad.strip()
    )
    res_doc = await db.execute(stmt_doc)
    if res_doc.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ya existe un médico registrado con el documento {req.documento_identidad}")

    # 3. Validar email
    stmt_email = select(Medico).where(
        Medico.empresa_id == target_empresa_id,
        func.lower(Medico.email) == req.email.lower().strip()
    )
    res_email = await db.execute(stmt_email)
    if res_email.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ya existe un médico registrado con el correo {req.email}")

    usuario_id = None

    # 4. Creación opcional de cuenta de Usuario
    if req.crear_usuario:
        # Verificar si ya existe usuario con ese email
        stmt_u = select(Usuario).where(func.lower(Usuario.email) == req.email.lower().strip())
        res_u = await db.execute(stmt_u)
        user_exist = res_u.scalar_one_or_none()

        if user_exist:
            # Si ya existe en la misma empresa y no tiene médico asignado, podemos vincularlo
            stmt_m_user = select(Medico).where(Medico.usuario_id == user_exist.id)
            res_m_user = await db.execute(stmt_m_user)
            if res_m_user.scalar_one_or_none():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El correo ya pertenece a otro usuario con perfil médico activo")
            usuario_id = user_exist.id
        else:
            # Buscar rol de médico
            stmt_rol = select(Rol).where(Rol.slug == "medico")
            res_rol = await db.execute(stmt_rol)
            rol_medico = res_rol.scalar_one_or_none()
            if not rol_medico:
                # Fallback al primer rol no superadmin
                stmt_rol_fb = select(Rol).where(Rol.slug != "superadmin").limit(1)
                res_rol_fb = await db.execute(stmt_rol_fb)
                rol_medico = res_rol_fb.scalar_one_or_none()

            rol_id = req.rol_id or (rol_medico.id if rol_medico else None)
            if not rol_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se encontró un rol adecuado para el usuario médico")

            password_plain = req.password if req.password and len(req.password) >= 6 else "MedFlow2026*"
            nuevo_usuario = Usuario(
                empresa_id=target_empresa_id,
                sucursal_defecto_id=req.sucursal_defecto_id,
                rol_id=rol_id,
                pais_telefono_id=req.pais_telefono_id,
                nombre=req.nombres.strip(),
                apellido=req.apellidos.strip(),
                email=req.email.lower().strip(),
                password_hash=get_password_hash(password_plain),
                telefono=req.telefono,
                activo=req.activo,
                es_superadmin=False
            )
            db.add(nuevo_usuario)
            await db.flush()
            usuario_id = nuevo_usuario.id

            # Asignar sucursales al usuario
            sucursales_a_asignar = set(req.sucursales_ids)
            if req.sucursal_defecto_id:
                sucursales_a_asignar.add(req.sucursal_defecto_id)

            for suc_id in sucursales_a_asignar:
                db.add(UsuarioSucursal(usuario_id=nuevo_usuario.id, sucursal_id=suc_id))

    # 5. Crear el Médico
    subesp_dicts = [s.model_dump() if hasattr(s, "model_dump") else dict(s) for s in req.subespecialidades]

    nuevo_medico = Medico(
        empresa_id=target_empresa_id,
        usuario_id=usuario_id,
        especialidad_id=req.especialidad_id,
        pais_telefono_id=req.pais_telefono_id,
        sucursal_defecto_id=req.sucursal_defecto_id,
        nombres=req.nombres.strip(),
        apellidos=req.apellidos.strip(),
        tipo_documento=req.tipo_documento.strip(),
        documento_identidad=req.documento_identidad.strip(),
        email=req.email.lower().strip(),
        telefono=req.telefono.strip() if req.telefono else None,
        licencia_medica=req.licencia_medica.strip() if req.licencia_medica else None,
        color=req.color or "#0d9488",
        biografia=req.biografia.strip() if req.biografia else None,
        subespecialidades=subesp_dicts,
        sucursales_ids=req.sucursales_ids,
        activo=req.activo
    )
    db.add(nuevo_medico)
    await db.commit()

    # Recargar con relaciones
    stmt_reload = select(Medico).options(
        selectinload(Medico.especialidad),
        selectinload(Medico.pais_telefono),
        selectinload(Medico.sucursal_defecto),
        selectinload(Medico.usuario)
    ).where(Medico.id == nuevo_medico.id)
    res_reload = await db.execute(stmt_reload)
    medico_cargado = res_reload.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=target_empresa_id,
        accion="CREAR_MEDICO",
        modulo="medicos",
        request=request,
        detalles={
            "mensaje": f"Médico Dr(a). {medico_cargado.nombres} {medico_cargado.apellidos} registrado exitosamente",
            "medico_id": medico_cargado.id,
            "especialidad": esp.nombre,
            "subespecialidades_count": len(subesp_dicts),
            "usuario_creado": bool(usuario_id)
        }
    )

    return _format_medico_response(medico_cargado)


@router.get("/{id}", response_model=MedicoResponse)
async def get_medico(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("medicos.ver"))
):
    """
    Obtiene la ficha y credenciales de un médico por su ID.
    """
    stmt = select(Medico).options(
        selectinload(Medico.especialidad),
        selectinload(Medico.pais_telefono),
        selectinload(Medico.sucursal_defecto),
        selectinload(Medico.usuario)
    ).where(Medico.id == id)

    if not current_user.es_superadmin:
        stmt = stmt.where(Medico.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    medico = res.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Médico no encontrado")

    return _format_medico_response(medico)


@router.put("/{id}", response_model=MedicoResponse)
async def update_medico(
    id: int,
    req: MedicoUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("medicos.editar"))
):
    """
    Actualiza los datos profesionales, subespecialidades o credenciales de un médico.
    """
    stmt = select(Medico).options(
        selectinload(Medico.especialidad),
        selectinload(Medico.pais_telefono),
        selectinload(Medico.sucursal_defecto),
        selectinload(Medico.usuario)
    ).where(Medico.id == id)

    if not current_user.es_superadmin:
        stmt = stmt.where(Medico.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    medico = res.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Médico no encontrado")

    # Si cambia documento, validar que no choque
    if req.documento_identidad and req.documento_identidad.strip() != medico.documento_identidad:
        stmt_doc = select(Medico).where(
            Medico.empresa_id == medico.empresa_id,
            Medico.documento_identidad == req.documento_identidad.strip(),
            Medico.id != medico.id
        )
        res_doc = await db.execute(stmt_doc)
        if res_doc.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nuevo documento ya está asignado a otro médico")
        medico.documento_identidad = req.documento_identidad.strip()

    # Si cambia email, validar que no choque
    if req.email and req.email.lower().strip() != medico.email.lower():
        stmt_em = select(Medico).where(
            Medico.empresa_id == medico.empresa_id,
            func.lower(Medico.email) == req.email.lower().strip(),
            Medico.id != medico.id
        )
        res_em = await db.execute(stmt_em)
        if res_em.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El nuevo correo ya está asignado a otro médico")
        medico.email = req.email.lower().strip()

    # Actualizar campos del médico
    if req.nombres is not None:
        medico.nombres = req.nombres.strip()
    if req.apellidos is not None:
        medico.apellidos = req.apellidos.strip()
    if req.tipo_documento is not None:
        medico.tipo_documento = req.tipo_documento.strip()
    if req.pais_telefono_id is not None:
        medico.pais_telefono_id = req.pais_telefono_id
    if req.telefono is not None:
        medico.telefono = req.telefono.strip() if req.telefono else None
    if req.licencia_medica is not None:
        medico.licencia_medica = req.licencia_medica.strip() if req.licencia_medica else None
    if req.especialidad_id is not None:
        medico.especialidad_id = req.especialidad_id
    if req.color is not None:
        medico.color = req.color
    if req.sucursal_defecto_id is not None:
        medico.sucursal_defecto_id = req.sucursal_defecto_id
    if req.sucursales_ids is not None:
        medico.sucursales_ids = req.sucursales_ids
    if req.biografia is not None:
        medico.biografia = req.biografia.strip() if req.biografia else None
    if req.activo is not None:
        medico.activo = req.activo
    if req.subespecialidades is not None:
        medico.subespecialidades = [s.model_dump() if hasattr(s, "model_dump") else dict(s) for s in req.subespecialidades]

    # Sincronizar con Usuario vinculado si existe
    if medico.usuario:
        if req.nombres is not None:
            medico.usuario.nombre = req.nombres.strip()
        if req.apellidos is not None:
            medico.usuario.apellido = req.apellidos.strip()
        if req.email is not None:
            medico.usuario.email = req.email.lower().strip()
        if req.telefono is not None:
            medico.usuario.telefono = req.telefono
        if req.pais_telefono_id is not None:
            medico.usuario.pais_telefono_id = req.pais_telefono_id
        if req.activo is not None:
            medico.usuario.activo = req.activo
        if req.password and len(req.password) >= 6:
            medico.usuario.password_hash = get_password_hash(req.password)

    await db.commit()

    # Recargar con relaciones
    stmt_reload = select(Medico).options(
        selectinload(Medico.especialidad),
        selectinload(Medico.pais_telefono),
        selectinload(Medico.sucursal_defecto),
        selectinload(Medico.usuario)
    ).where(Medico.id == medico.id)
    res_reload = await db.execute(stmt_reload)
    medico_cargado = res_reload.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=medico.empresa_id,
        accion="EDITAR_MEDICO",
        modulo="medicos",
        request=request,
        detalles={
            "mensaje": f"Ficha médica del Dr(a). {medico.nombres} {medico.apellidos} actualizada",
            "medico_id": medico.id
        }
    )

    return _format_medico_response(medico_cargado)


@router.delete("/{id}")
async def delete_medico(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("medicos.eliminar"))
):
    """
    Desactiva o elimina la ficha del médico.
    """
    stmt = select(Medico).options(
        selectinload(Medico.usuario)
    ).where(Medico.id == id)

    if not current_user.es_superadmin:
        stmt = stmt.where(Medico.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    medico = res.scalar_one_or_none()
    if not medico:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Médico no encontrado")

    nombre_completo = f"Dr(a). {medico.nombres} {medico.apellidos}"
    empresa_id = medico.empresa_id

    # Inactivación lógica segura
    medico.activo = False
    if medico.usuario:
        medico.usuario.activo = False

    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="DESACTIVAR_MEDICO",
        modulo="medicos",
        request=request,
        detalles={
            "mensaje": f"Médico {nombre_completo} inactivado del servicio",
            "medico_id": id
        }
    )

    return {"message": f"Médico {nombre_completo} inactivado con éxito"}
