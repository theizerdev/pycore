import re
from typing import List, Optional, Any, Dict
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func

from app.core.database import get_db
from app.core.security import (
    require_permission,
    registrar_auditoria
)
from app.models.usuario import Usuario
from app.models.paciente import Paciente
from app.models.consulta import ConsultaMedica
from app.models.sucursal import Sucursal
from app.models.pais import Pais
from app.models.medico import Medico
from app.schemas.paciente import (
    PacienteCreate,
    PacienteUpdate,
    PacienteResponse,
    PacienteHistorialResponse,
    ConsultaResumenResponse
)

router = APIRouter(prefix="/pacientes", tags=["Pacientes / Ficha Médica"])

def calcular_edad(fecha_nac: Optional[date]) -> tuple[Optional[int], Optional[str]]:
    """Calcula años y texto descriptivo de la edad."""
    if not fecha_nac:
        return None, None
    today = date.today()
    anios = today.year - fecha_nac.year - ((today.month, today.day) < (fecha_nac.month, fecha_nac.day))
    if anios < 0:
        return 0, "0 años"
    if anios == 0:
        meses = (today.year - fecha_nac.year) * 12 + today.month - fecha_nac.month
        if today.day < fecha_nac.day:
            meses -= 1
        meses = max(0, meses)
        if meses == 0:
            dias = (today - fecha_nac).days
            return 0, f"{dias} días"
        return 0, f"{meses} meses" if meses > 1 else "1 mes"
    return anios, f"{anios} años"

def _format_paciente_response(p: Paciente) -> PacienteResponse:
    alergias_data = p.alergias if isinstance(p.alergias, list) else []
    edad_anios, edad_txt = calcular_edad(p.fecha_nacimiento)

    consultas_list = p.consultas if isinstance(p.consultas, list) else []
    total_consultas = len(consultas_list)
    ultima_fecha = consultas_list[0].fecha_consulta if total_consultas > 0 else None

    return PacienteResponse(
        id=p.id,
        empresa_id=p.empresa_id,
        sucursal_registro_id=p.sucursal_registro_id,
        pais_telefono_id=p.pais_telefono_id,
        nombres=p.nombres,
        apellidos=p.apellidos,
        tipo_documento=p.tipo_documento,
        documento_identidad=p.documento_identidad,
        fecha_nacimiento=p.fecha_nacimiento,
        genero=p.genero,
        email=p.email,
        telefono=p.telefono,
        direccion=p.direccion,
        ciudad=p.ciudad,
        estado=p.estado,
        codigo_postal=p.codigo_postal,
        grupo_sanguineo=p.grupo_sanguineo,
        alergias=alergias_data,
        antecedentes_patologicos=p.antecedentes_patologicos,
        antecedentes_familiares=p.antecedentes_familiares,
        antecedentes_quirurgicos=p.antecedentes_quirurgicos,
        medicacion_habitual=p.medicacion_habitual,
        observaciones_medicas=p.observaciones_medicas,
        contacto_emergencia_nombre=p.contacto_emergencia_nombre,
        contacto_emergencia_parentesco=p.contacto_emergencia_parentesco,
        contacto_emergencia_telefono=p.contacto_emergencia_telefono,
        seguro_medico=p.seguro_medico,
        numero_poliza=p.numero_poliza,
        activo=p.activo,
        edad=edad_anios,
        edad_texto=edad_txt,
        pais_nombre=p.pais_telefono.nombre if p.pais_telefono else None,
        pais_codigo_iso2=p.pais_telefono.codigo_iso2 if p.pais_telefono else None,
        pais_codigo_telefonico=p.pais_telefono.codigo_telefonico if p.pais_telefono else None,
        sucursal_nombre=p.sucursal_registro.nombre if p.sucursal_registro else None,
        total_consultas=total_consultas,
        ultima_consulta=ultima_fecha,
        created_at=p.created_at,
        updated_at=p.updated_at
    )


@router.get("", response_model=List[PacienteResponse])
async def list_pacientes(
    q: Optional[str] = Query(None, description="Búsqueda por nombres, apellidos, documento, correo o teléfono"),
    grupo_sanguineo: Optional[str] = Query(None, description="Filtrar por grupo sanguíneo"),
    genero: Optional[str] = Query(None, description="Filtrar por género (M, F, O)"),
    sucursal_id: Optional[int] = Query(None, description="Filtrar por sucursal de registro"),
    activo: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    con_alergias: Optional[bool] = Query(None, description="Filtrar pacientes con alergias registradas"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("pacientes.ver"))
):
    """
    Lista los pacientes registrados con soporte multi-tenant, filtros clínicos y búsqueda en tiempo real.
    """
    stmt = select(Paciente).options(
        selectinload(Paciente.pais_telefono),
        selectinload(Paciente.sucursal_registro),
        selectinload(Paciente.consultas)
    )

    if not current_user.es_superadmin:
        stmt = stmt.where(Paciente.empresa_id == current_user.empresa_id)

    if q and isinstance(q, str) and q.strip():
        term = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Paciente.nombres.ilike(term),
                Paciente.apellidos.ilike(term),
                Paciente.documento_identidad.ilike(term),
                Paciente.email.ilike(term),
                Paciente.telefono.ilike(term)
            )
        )

    if grupo_sanguineo and isinstance(grupo_sanguineo, str) and grupo_sanguineo.strip():
        stmt = stmt.where(Paciente.grupo_sanguineo == grupo_sanguineo.strip())

    if genero and isinstance(genero, str) and genero.strip():
        stmt = stmt.where(Paciente.genero == genero.strip().upper())

    if sucursal_id and isinstance(sucursal_id, int):
        stmt = stmt.where(Paciente.sucursal_registro_id == sucursal_id)

    if activo is not None and isinstance(activo, bool):
        stmt = stmt.where(Paciente.activo == activo)

    limit_val = limit if isinstance(limit, int) else 100
    offset_val = offset if isinstance(offset, int) else 0

    stmt = stmt.order_by(Paciente.apellidos.asc(), Paciente.nombres.asc()).offset(offset_val).limit(limit_val)
    result = await db.execute(stmt)
    pacientes = result.scalars().all()

    # Filtro post-consulta en Python para alergias si aplica
    if con_alergias is True:
        pacientes = [p for p in pacientes if isinstance(p.alergias, list) and len(p.alergias) > 0]

    return [_format_paciente_response(p) for p in pacientes]


@router.get("/{id}", response_model=PacienteResponse)
async def get_paciente(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("pacientes.ver"))
):
    """Obtiene el detalle completo de un paciente."""
    stmt = select(Paciente).options(
        selectinload(Paciente.pais_telefono),
        selectinload(Paciente.sucursal_registro),
        selectinload(Paciente.consultas)
    ).where(Paciente.id == id)

    if not current_user.es_superadmin:
        stmt = stmt.where(Paciente.empresa_id == current_user.empresa_id)

    result = await db.execute(stmt)
    paciente = result.scalar_one_or_none()
    if not paciente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")

    return _format_paciente_response(paciente)


@router.post("", response_model=PacienteResponse, status_code=status.HTTP_201_CREATED)
async def create_paciente(
    data: PacienteCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("pacientes.crear"))
):
    """Registra un nuevo paciente en la clínica."""
    empresa_id = current_user.empresa_id or 1

    # Validar documento de identidad único dentro de la misma empresa
    stmt_check = select(Paciente).where(
        Paciente.empresa_id == empresa_id,
        Paciente.documento_identidad == data.documento_identidad.strip(),
        Paciente.tipo_documento == data.tipo_documento.strip()
    )
    res_check = await db.execute(stmt_check)
    if res_check.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un paciente con el documento {data.tipo_documento}-{data.documento_identidad}"
        )

    clean_alergias = [a.strip() for a in data.alergias if a and a.strip()]

    nuevo = Paciente(
        empresa_id=empresa_id,
        sucursal_registro_id=data.sucursal_registro_id,
        pais_telefono_id=data.pais_telefono_id,
        nombres=data.nombres.strip(),
        apellidos=data.apellidos.strip(),
        tipo_documento=data.tipo_documento.strip().upper(),
        documento_identidad=data.documento_identidad.strip(),
        fecha_nacimiento=data.fecha_nacimiento,
        genero=data.genero.strip().upper(),
        email=data.email.strip().lower() if data.email else None,
        telefono=data.telefono.strip() if data.telefono else None,
        direccion=data.direccion.strip() if data.direccion else None,
        ciudad=data.ciudad.strip() if data.ciudad else None,
        estado=data.estado.strip() if data.estado else None,
        codigo_postal=data.codigo_postal.strip() if data.codigo_postal else None,
        grupo_sanguineo=data.grupo_sanguineo.strip().upper() if data.grupo_sanguineo else None,
        alergias=clean_alergias,
        antecedentes_patologicos=data.antecedentes_patologicos.strip() if data.antecedentes_patologicos else None,
        antecedentes_familiares=data.antecedentes_familiares.strip() if data.antecedentes_familiares else None,
        antecedentes_quirurgicos=data.antecedentes_quirurgicos.strip() if data.antecedentes_quirurgicos else None,
        medicacion_habitual=data.medicacion_habitual.strip() if data.medicacion_habitual else None,
        observaciones_medicas=data.observaciones_medicas.strip() if data.observaciones_medicas else None,
        contacto_emergencia_nombre=data.contacto_emergencia_nombre.strip() if data.contacto_emergencia_nombre else None,
        contacto_emergencia_parentesco=data.contacto_emergencia_parentesco.strip() if data.contacto_emergencia_parentesco else None,
        contacto_emergencia_telefono=data.contacto_emergencia_telefono.strip() if data.contacto_emergencia_telefono else None,
        seguro_medico=data.seguro_medico.strip() if data.seguro_medico else None,
        numero_poliza=data.numero_poliza.strip() if data.numero_poliza else None,
        activo=data.activo
    )

    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)

    # Recargar con relaciones
    stmt = select(Paciente).options(
        selectinload(Paciente.pais_telefono),
        selectinload(Paciente.sucursal_registro),
        selectinload(Paciente.consultas)
    ).where(Paciente.id == nuevo.id)
    res = await db.execute(stmt)
    paciente_cargado = res.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        accion="CREAR_PACIENTE",
        modulo="pacientes",
        request=request,
        detalles={
            "paciente_id": nuevo.id,
            "paciente": f"{nuevo.nombres} {nuevo.apellidos}",
            "documento": f"{nuevo.tipo_documento}-{nuevo.documento_identidad}",
            "grupo_sanguineo": nuevo.grupo_sanguineo
        }
    )

    return _format_paciente_response(paciente_cargado)


@router.put("/{id}", response_model=PacienteResponse)
async def update_paciente(
    id: int,
    data: PacienteUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("pacientes.editar"))
):
    """Actualiza la ficha integral y datos médicos del paciente."""
    stmt = select(Paciente).options(
        selectinload(Paciente.pais_telefono),
        selectinload(Paciente.sucursal_registro),
        selectinload(Paciente.consultas)
    ).where(Paciente.id == id)

    if not current_user.es_superadmin:
        stmt = stmt.where(Paciente.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")

    # Si cambia el documento, verificar duplicados
    if data.documento_identidad is not None or data.tipo_documento is not None:
        nuevo_tipo = data.tipo_documento.strip().upper() if data.tipo_documento else p.tipo_documento
        nuevo_doc = data.documento_identidad.strip() if data.documento_identidad else p.documento_identidad
        stmt_dup = select(Paciente).where(
            Paciente.empresa_id == p.empresa_id,
            Paciente.id != p.id,
            Paciente.documento_identidad == nuevo_doc,
            Paciente.tipo_documento == nuevo_tipo
        )
        res_dup = await db.execute(stmt_dup)
        if res_dup.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro paciente con el documento {nuevo_tipo}-{nuevo_doc}"
            )
        p.tipo_documento = nuevo_tipo
        p.documento_identidad = nuevo_doc

    if data.nombres is not None:
        p.nombres = data.nombres.strip()
    if data.apellidos is not None:
        p.apellidos = data.apellidos.strip()
    if data.fecha_nacimiento is not None:
        p.fecha_nacimiento = data.fecha_nacimiento
    if data.genero is not None:
        p.genero = data.genero.strip().upper()
    if data.email is not None:
        p.email = data.email.strip().lower() if data.email.strip() else None
    if data.telefono is not None:
        p.telefono = data.telefono.strip() if data.telefono.strip() else None
    if data.direccion is not None:
        p.direccion = data.direccion.strip() if data.direccion.strip() else None
    if data.ciudad is not None:
        p.ciudad = data.ciudad.strip() if data.ciudad.strip() else None
    if data.estado is not None:
        p.estado = data.estado.strip() if data.estado.strip() else None
    if data.codigo_postal is not None:
        p.codigo_postal = data.codigo_postal.strip() if data.codigo_postal.strip() else None
    if data.pais_telefono_id is not None:
        p.pais_telefono_id = data.pais_telefono_id
    if data.sucursal_registro_id is not None:
        p.sucursal_registro_id = data.sucursal_registro_id

    # Ficha Médica
    if data.grupo_sanguineo is not None:
        p.grupo_sanguineo = data.grupo_sanguineo.strip().upper() if data.grupo_sanguineo.strip() else None
    if data.alergias is not None:
        p.alergias = [a.strip() for a in data.alergias if a and a.strip()]
    if data.antecedentes_patologicos is not None:
        p.antecedentes_patologicos = data.antecedentes_patologicos.strip() if data.antecedentes_patologicos.strip() else None
    if data.antecedentes_familiares is not None:
        p.antecedentes_familiares = data.antecedentes_familiares.strip() if data.antecedentes_familiares.strip() else None
    if data.antecedentes_quirurgicos is not None:
        p.antecedentes_quirurgicos = data.antecedentes_quirurgicos.strip() if data.antecedentes_quirurgicos.strip() else None
    if data.medicacion_habitual is not None:
        p.medicacion_habitual = data.medicacion_habitual.strip() if data.medicacion_habitual.strip() else None
    if data.observaciones_medicas is not None:
        p.observaciones_medicas = data.observaciones_medicas.strip() if data.observaciones_medicas.strip() else None

    # Contacto de Emergencia
    if data.contacto_emergencia_nombre is not None:
        p.contacto_emergencia_nombre = data.contacto_emergencia_nombre.strip() if data.contacto_emergencia_nombre.strip() else None
    if data.contacto_emergencia_parentesco is not None:
        p.contacto_emergencia_parentesco = data.contacto_emergencia_parentesco.strip() if data.contacto_emergencia_parentesco.strip() else None
    if data.contacto_emergencia_telefono is not None:
        p.contacto_emergencia_telefono = data.contacto_emergencia_telefono.strip() if data.contacto_emergencia_telefono.strip() else None

    # Seguro
    if data.seguro_medico is not None:
        p.seguro_medico = data.seguro_medico.strip() if data.seguro_medico.strip() else None
    if data.numero_poliza is not None:
        p.numero_poliza = data.numero_poliza.strip() if data.numero_poliza.strip() else None

    if data.activo is not None:
        p.activo = data.activo

    await db.commit()
    await db.refresh(p)

    # Recargar con relaciones
    stmt_reload = select(Paciente).options(
        selectinload(Paciente.pais_telefono),
        selectinload(Paciente.sucursal_registro),
        selectinload(Paciente.consultas)
    ).where(Paciente.id == p.id)
    res_reload = await db.execute(stmt_reload)
    p_reloaded = res_reload.scalar_one()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=p.empresa_id,
        accion="ACTUALIZAR_PACIENTE",
        modulo="pacientes",
        request=request,
        detalles={
            "paciente_id": p.id,
            "paciente": f"{p.nombres} {p.apellidos}"
        }
    )

    return _format_paciente_response(p_reloaded)


@router.delete("/{id}")
async def delete_paciente(
    id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("pacientes.eliminar"))
):
    """Inactiva lógicamente un paciente sin perder su historial médico."""
    stmt = select(Paciente).where(Paciente.id == id)
    if not current_user.es_superadmin:
        stmt = stmt.where(Paciente.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    p = res.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")

    p.activo = False
    await db.commit()

    await registrar_auditoria(
        db=db,
        usuario_id=current_user.id,
        empresa_id=p.empresa_id,
        accion="INACTIVAR_PACIENTE",
        modulo="pacientes",
        request=request,
        detalles={
            "paciente_id": p.id,
            "paciente": f"{p.nombres} {p.apellidos}"
        }
    )

    return {"message": f"Paciente {p.nombres} {p.apellidos} inactivado con éxito"}


@router.get("/{id}/historial", response_model=PacienteHistorialResponse)
async def get_paciente_historial(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_permission("pacientes.ver"))
):
    """
    Retorna el historial clínico consolidado del paciente:
    consultas previas, diagnósticos, evolución de signos vitales y prescripciones médicas.
    """
    stmt = select(Paciente).options(
        selectinload(Paciente.pais_telefono),
        selectinload(Paciente.sucursal_registro),
        selectinload(Paciente.consultas)
    ).where(Paciente.id == id)

    if not current_user.es_superadmin:
        stmt = stmt.where(Paciente.empresa_id == current_user.empresa_id)

    res = await db.execute(stmt)
    paciente = res.scalar_one_or_none()
    if not paciente:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado")

    # Cargar consultas detalladas con relaciones de médico, especialidad y sucursal
    stmt_consultas = select(ConsultaMedica).options(
        selectinload(ConsultaMedica.medico),
        selectinload(ConsultaMedica.especialidad),
        selectinload(ConsultaMedica.sucursal)
    ).where(
        ConsultaMedica.paciente_id == id
    ).order_by(ConsultaMedica.fecha_consulta.desc())

    res_c = await db.execute(stmt_consultas)
    consultas = res_c.scalars().all()

    consultas_formateadas = []
    signos_recientes = None

    for c in consultas:
        med_nom = f"Dr(a). {c.medico.nombres} {c.medico.apellidos}" if c.medico else "Médico Asistencial"
        esp_nom = c.especialidad.nombre if c.especialidad else "Medicina General"
        suc_nom = c.sucursal.nombre if c.sucursal else None

        sv = c.signos_vitales if isinstance(c.signos_vitales, dict) else {}
        if not signos_recientes and sv:
            signos_recientes = sv

        recetas = c.receta_medica if isinstance(c.receta_medica, list) else []
        secundarios = c.diagnosticos_secundarios if isinstance(c.diagnosticos_secundarios, list) else []

        consultas_formateadas.append(
            ConsultaResumenResponse(
                id=c.id,
                fecha_consulta=c.fecha_consulta,
                motivo_consulta=c.motivo_consulta,
                medico_id=c.medico_id,
                medico_nombre=med_nom,
                especialidad_id=c.especialidad_id,
                especialidad_nombre=esp_nom,
                sucursal_nombre=suc_nom,
                signos_vitales=sv,
                diagnostico_principal=c.diagnostico_principal,
                diagnosticos_secundarios=secundarios,
                plan_tratamiento=c.plan_tratamiento,
                receta_medica=recetas,
                indicaciones_generales=c.indicaciones_generales,
                estado=c.estado
            )
        )

    paciente_resp = _format_paciente_response(paciente)
    alergias_list = paciente.alergias if isinstance(paciente.alergias, list) else []

    return PacienteHistorialResponse(
        paciente=paciente_resp,
        consultas=consultas_formateadas,
        alergias=alergias_list,
        signos_vitales_recientes=signos_recientes
    )
