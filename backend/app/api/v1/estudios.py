from datetime import date, datetime, timedelta
from typing import List, Optional, Any, Dict
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select, or_, and_, desc, func, case
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
import base64

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.models.usuario import Usuario
from app.models.paciente import Paciente
from app.models.estudio import EstudioAdjunto, WhatsAppEstudioPendiente
from app.models.consulta import ConsultaMedica
from app.models.medico import Medico
from app.models.sucursal import Sucursal
from app.core.security import get_current_user, require_permission
from app.services.clinical_agent import PatientContext, clinical_agent, decode_data_uri
from app.services.estudios_ws_manager import estudios_ws_manager
from app.services.whatsapp_python_engine import whatsapp_engine, format_phone_number
from app.services.whatsapp_resolver import resolve_whatsapp_service, get_whatsapp_target

router = APIRouter(prefix="/estudios", tags=["Estudios Médicos y Visor Inteligente"])


class SolicitarWhatsAppRequest(BaseModel):
    enviar_mensaje: bool = True
    mensaje_personalizado: Optional[str] = None
    telefono_destino: Optional[str] = None


class AsignarPendienteRequest(BaseModel):
    consulta_id: int
    paciente_id: int
    medico_id: Optional[int] = None
    titulo: Optional[str] = None
    categoria: Optional[str] = None
    notas: Optional[str] = None


# ==========================================
# SCHEMAS
# ==========================================

class BiomarcadorItem(BaseModel):
    parametro: str
    valor: float
    unidad: str
    ref_min: float
    ref_max: float
    estado: Optional[str] = "normal"  # "normal", "alto", "bajo"
    alerta: Optional[bool] = False
    interpretacion: Optional[str] = None


class DatosImagenologia(BaseModel):
    region_anatomica: Optional[str] = None
    tecnica: Optional[str] = None
    calidad_estudio: Optional[str] = "Adecuada"
    hallazgos: Optional[str] = None
    conclusion: Optional[str] = None
    recomendaciones: Optional[str] = None
    guia_paciente: Optional[str] = None


class EstudioCrearRequest(BaseModel):
    paciente_id: int
    consulta_id: Optional[int] = None
    medico_id: Optional[int] = None
    titulo: str
    categoria: str  # "laboratorio", "imagenologia", "informe", "otro"
    subtipo: Optional[str] = None
    archivo_url: str  # Data URI Base64 o URL
    archivo_nombre: str
    archivo_tipo: str
    archivo_tamano: Optional[int] = 0
    fecha_estudio: Optional[date] = None
    notas: Optional[str] = None
    valores_laboratorio: Optional[List[Dict[str, Any]]] = None
    datos_imagenologia: Optional[Dict[str, Any]] = None
    interpretacion_clinica: Optional[str] = None


class EstudioActualizarRequest(BaseModel):
    titulo: Optional[str] = None
    categoria: Optional[str] = None
    subtipo: Optional[str] = None
    fecha_estudio: Optional[date] = None
    notas: Optional[str] = None
    valores_laboratorio: Optional[List[Dict[str, Any]]] = None
    datos_imagenologia: Optional[Dict[str, Any]] = None
    interpretacion_clinica: Optional[str] = None
    estado_analisis: Optional[str] = None


class AnalizarTextoClinicoRequest(BaseModel):
    texto: str
    paciente_id: Optional[int] = None


# ==========================================
# HELPER DE CONTEXTO DEL PACIENTE PARA MEDICORE AI
# ==========================================

def _build_patient_context(pac: Optional[Paciente]) -> PatientContext:
    if not pac:
        return PatientContext()
    return PatientContext(
        edad=getattr(pac, "edad", None),
        genero=getattr(pac, "genero", None),
        antecedentes=getattr(pac, "antecedentes_patologicos", None),
        medicacion=getattr(pac, "medicacion_habitual", None),
        alergias=getattr(pac, "alergias", None),
    )


@router.get("/agente/capacidades")
async def obtener_capacidades_agente(
    current_user: Usuario = Depends(get_current_user),
):
    """Expone las capacidades activas del Agente Clínico Propio (MediCore AI Local)."""
    return clinical_agent.get_capabilities()


@router.post("/agente/analizar-texto")
async def analizar_texto_con_agente(
    req: AnalizarTextoClinicoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Endpoint reutilizable del Agente Clínico MediCore AI Local para analizar texto clínico libre
    (resultados pegados, notas de evolución, informes externos) y extraer biomarcadores,
    cálculos derivados, síndromes y códigos CIE-10 sugeridos.
    """
    pac = None
    if req.paciente_id:
        pac = (
            await db.execute(
                select(Paciente).where(
                    Paciente.id == req.paciente_id,
                    Paciente.empresa_id == current_user.empresa_id,
                )
            )
        ).scalar_one_or_none()
    return clinical_agent.analyze_clinical_text(req.texto, _build_patient_context(pac))


# ==========================================
# RUTAS DE API
# ==========================================

@router.get("", response_model=None)
@router.get("/", response_model=None)
async def listar_estudios_global(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    categoria: Optional[str] = Query(None),
    estado_analisis: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    paciente_id: Optional[int] = Query(None),
    medico_id: Optional[int] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Listado centralizado de estudios clínicos (laboratorios, imagenología, informes)
    para el módulo de Estudios y Exámenes Complementarios con soporte para búsqueda,
    filtros avanzados por fecha/categoría/estado y métricas globales.
    """
    base_conditions = [EstudioAdjunto.empresa_id == current_user.empresa_id]

    if categoria and categoria.lower() != "todos":
        base_conditions.append(EstudioAdjunto.categoria == categoria.lower())

    if estado_analisis and estado_analisis.lower() != "todos":
        base_conditions.append(EstudioAdjunto.estado_analisis == estado_analisis.lower())

    if fecha_desde:
        base_conditions.append(EstudioAdjunto.fecha_estudio >= fecha_desde)
    if fecha_hasta:
        base_conditions.append(EstudioAdjunto.fecha_estudio <= fecha_hasta)

    if paciente_id:
        base_conditions.append(EstudioAdjunto.paciente_id == paciente_id)
    if medico_id:
        base_conditions.append(EstudioAdjunto.medico_id == medico_id)
    if sucursal_id:
        base_conditions.append(EstudioAdjunto.sucursal_id == sucursal_id)

    search_join_needed = False
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        search_join_needed = True
        base_conditions.append(
            or_(
                func.lower(EstudioAdjunto.titulo).like(term),
                func.lower(EstudioAdjunto.subtipo).like(term),
                func.lower(EstudioAdjunto.archivo_nombre).like(term),
                func.lower(EstudioAdjunto.notas).like(term),
                func.lower(Paciente.nombres).like(term),
                func.lower(Paciente.apellidos).like(term),
                func.lower(Paciente.documento_identidad).like(term),
            )
        )

    count_query = select(func.count(EstudioAdjunto.id)).where(*base_conditions)
    if search_join_needed:
        count_query = count_query.join(Paciente, EstudioAdjunto.paciente_id == Paciente.id, isouter=True)

    res_count = await db.execute(count_query)
    total_items = res_count.scalar() or 0

    query = (
        select(EstudioAdjunto)
        .options(
            selectinload(EstudioAdjunto.paciente),
            selectinload(EstudioAdjunto.medico),
            selectinload(EstudioAdjunto.consulta),
            selectinload(EstudioAdjunto.sucursal),
        )
        .where(*base_conditions)
    )
    if search_join_needed:
        query = query.join(Paciente, EstudioAdjunto.paciente_id == Paciente.id, isouter=True)

    query = query.order_by(EstudioAdjunto.fecha_estudio.desc(), EstudioAdjunto.id.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    res_items = await db.execute(query)
    items = res_items.scalars().all()

    # Métricas estadísticas
    stats_query = select(
        func.count(EstudioAdjunto.id).label("total"),
        func.sum(case((EstudioAdjunto.categoria == "laboratorio", 1), else_=0)).label("laboratorio"),
        func.sum(case((EstudioAdjunto.categoria == "imagenologia", 1), else_=0)).label("imagenologia"),
        func.sum(case((EstudioAdjunto.estado_analisis == "analizado_alterado", 1), else_=0)).label("con_alertas"),
        func.sum(case((EstudioAdjunto.estado_analisis == "pendiente", 1), else_=0)).label("pendientes"),
        func.sum(case((EstudioAdjunto.estado_analisis == "revisado_medico", 1), else_=0)).label("revisados"),
    ).where(EstudioAdjunto.empresa_id == current_user.empresa_id)

    res_stats = await db.execute(stats_query)
    stats_row = res_stats.one_or_none()
    stats = {
        "total": int(getattr(stats_row, "total", 0) or 0),
        "laboratorio": int(getattr(stats_row, "laboratorio", 0) or 0),
        "imagenologia": int(getattr(stats_row, "imagenologia", 0) or 0),
        "con_alertas": int(getattr(stats_row, "con_alertas", 0) or 0),
        "pendientes": int(getattr(stats_row, "pendientes", 0) or 0),
        "revisados": int(getattr(stats_row, "revisados", 0) or 0),
    }

    formatted_items = []
    for e in items:
        pac = e.paciente
        med = e.medico
        con = e.consulta
        suc = e.sucursal
        formatted_items.append({
            "id": e.id,
            "empresa_id": e.empresa_id,
            "paciente_id": e.paciente_id,
            "paciente_nombre": f"{pac.nombres} {pac.apellidos}".strip() if pac else f"Paciente #{e.paciente_id}",
            "paciente_documento": f"{getattr(pac, 'tipo_documento', 'V')}-{getattr(pac, 'documento_identidad', '')}" if pac else "",
            "paciente_telefono": getattr(pac, "telefono", None) if pac else None,
            "paciente_email": getattr(pac, "email", None) if pac else None,
            "paciente_foto_url": getattr(pac, "foto_url", None) if pac else None,
            "consulta_id": e.consulta_id,
            "consulta_codigo": getattr(con, "codigo", None) if con else None,
            "medico_id": e.medico_id,
            "medico_nombre": f"Dr(a). {med.nombres} {med.apellidos}".strip() if med else None,
            "sucursal_id": e.sucursal_id,
            "sucursal_nombre": getattr(suc, "nombre", None) if suc else None,
            "titulo": e.titulo,
            "categoria": e.categoria,
            "subtipo": e.subtipo,
            "archivo_nombre": e.archivo_nombre,
            "archivo_tipo": e.archivo_tipo,
            "archivo_tamano": e.archivo_tamano,
            "archivo_url": e.archivo_url,
            "fecha_estudio": str(e.fecha_estudio),
            "estado_analisis": e.estado_analisis,
            "valores_laboratorio": e.valores_laboratorio or [],
            "datos_imagenologia": e.datos_imagenologia,
            "alertas_detectadas": e.alertas_detectadas or [],
            "analisis_agente": getattr(e, "analisis_agente", None),
            "interpretacion_clinica": e.interpretacion_clinica,
            "notas": e.notas,
            "origen": getattr(e, "origen", "manual") or "manual",
            "whatsapp_remitente": getattr(e, "whatsapp_remitente", None),
            "created_at": e.created_at.isoformat() if e.created_at else None,
        })

    total_pages = max(1, (total_items + page_size - 1) // page_size)

    return {
        "items": formatted_items,
        "total": total_items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "stats": stats,
    }


@router.get("/paciente/{paciente_id}")
async def listar_estudios_paciente(
    paciente_id: int,
    categoria: Optional[str] = Query(None, description="laboratorio, imagenologia, etc."),
    consulta_id: Optional[int] = Query(None, description="ID de la consulta médica"),
    alcance: Optional[str] = Query("todos", description="'todos', 'esta_consulta', 'historial_previo'"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene la lista de estudios y exámenes adjuntos de un paciente, con soporte para filtrar por consulta o historial."""
    query = (
        select(EstudioAdjunto)
        .where(
            EstudioAdjunto.paciente_id == paciente_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    if categoria and categoria.lower() != "todos":
        query = query.where(EstudioAdjunto.categoria == categoria.lower())

    if consulta_id is not None:
        if alcance == "esta_consulta":
            query = query.where(EstudioAdjunto.consulta_id == consulta_id)
        elif alcance == "historial_previo":
            query = query.where(
                or_(
                    EstudioAdjunto.consulta_id != consulta_id,
                    EstudioAdjunto.consulta_id.is_(None)
                )
            )

    query = query.order_by(EstudioAdjunto.fecha_estudio.desc(), EstudioAdjunto.id.desc())
    res = await db.execute(query)
    estudios = res.scalars().all()

    return [
        {
            "id": e.id,
            "paciente_id": e.paciente_id,
            "consulta_id": e.consulta_id,
            "medico_id": e.medico_id,
            "titulo": e.titulo,
            "categoria": e.categoria,
            "subtipo": e.subtipo,
            "archivo_nombre": e.archivo_nombre,
            "archivo_tipo": e.archivo_tipo,
            "archivo_tamano": e.archivo_tamano,
            "fecha_estudio": str(e.fecha_estudio),
            "estado_analisis": e.estado_analisis,
            "alertas_detectadas": e.alertas_detectadas or [],
            "analisis_agente": getattr(e, "analisis_agente", None),
            "notas": e.notas,
            "origen": getattr(e, "origen", "manual") or "manual",
            "whatsapp_remitente": getattr(e, "whatsapp_remitente", None),
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in estudios
    ]


@router.get("/consulta/{consulta_id}")
async def listar_estudios_consulta(
    consulta_id: int,
    categoria: Optional[str] = Query(None, description="laboratorio, imagenologia, etc."),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene la lista de estudios y exámenes adjuntos asociados directamente a una consulta específica."""
    query = (
        select(EstudioAdjunto)
        .where(
            EstudioAdjunto.consulta_id == consulta_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    if categoria and categoria.lower() != "todos":
        query = query.where(EstudioAdjunto.categoria == categoria.lower())

    query = query.order_by(EstudioAdjunto.fecha_estudio.desc(), EstudioAdjunto.id.desc())
    res = await db.execute(query)
    estudios = res.scalars().all()

    return [
        {
            "id": e.id,
            "paciente_id": e.paciente_id,
            "consulta_id": e.consulta_id,
            "medico_id": e.medico_id,
            "titulo": e.titulo,
            "categoria": e.categoria,
            "subtipo": e.subtipo,
            "archivo_nombre": e.archivo_nombre,
            "archivo_tipo": e.archivo_tipo,
            "archivo_tamano": e.archivo_tamano,
            "fecha_estudio": str(e.fecha_estudio),
            "estado_analisis": e.estado_analisis,
            "alertas_detectadas": e.alertas_detectadas or [],
            "analisis_agente": getattr(e, "analisis_agente", None),
            "notas": e.notas,
            "origen": getattr(e, "origen", "manual") or "manual",
            "whatsapp_remitente": getattr(e, "whatsapp_remitente", None),
            "created_at": e.created_at.isoformat() if e.created_at else None
        }
        for e in estudios
    ]


# ==========================================
# RECEPCIÓN EN TIEMPO REAL VÍA WHATSAPP (PASO 4)
# ==========================================

@router.websocket("/ws")
async def estudios_whatsapp_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    consulta_id: Optional[int] = Query(None),
    sucursal_id: Optional[int] = Query(None),
):
    """WebSocket en tiempo real para alertar al médico en consulta cuando llega un estudio por WhatsApp."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("sub")
        if not user_id_str:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user_id = int(user_id_str)
    except (JWTError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(Usuario).where(Usuario.id == user_id))).scalar_one_or_none()
        if not user or not user.activo:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        empresa_id = user.empresa_id or 1
        resolved_suc_id = sucursal_id or user.sucursal_defecto_id

    await estudios_ws_manager.connect(websocket, empresa_id, resolved_suc_id, consulta_id)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("event") == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        estudios_ws_manager.disconnect(websocket, empresa_id, resolved_suc_id, consulta_id)
    except Exception:
        estudios_ws_manager.disconnect(websocket, empresa_id, resolved_suc_id, consulta_id)


@router.post("/consulta/{consulta_id}/solicitar-whatsapp")
async def solicitar_estudio_por_whatsapp(
    consulta_id: int,
    req: SolicitarWhatsAppRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Activa la ventana de escucha en tiempo real (30 min) para el Paso 4 de esta consulta
    y opcionalmente envía una invitación por WhatsApp al paciente para que adjunte su PDF o foto.
    """
    empresa_id = current_user.empresa_id or 1
    stmt = (
        select(ConsultaMedica)
        .options(
            selectinload(ConsultaMedica.paciente),
            selectinload(ConsultaMedica.medico),
            selectinload(ConsultaMedica.sucursal),
        )
        .where(ConsultaMedica.id == consulta_id, ConsultaMedica.empresa_id == empresa_id)
    )
    consulta = (await db.execute(stmt)).scalar_one_or_none()
    if not consulta:
        raise HTTPException(status_code=404, detail="Consulta médica no encontrada")

    suc_id = consulta.sucursal_id or current_user.sucursal_defecto_id
    wa_service, target_ent, _, _ = await resolve_whatsapp_service(db, empresa_id, suc_id)
    live_status = whatsapp_engine.get_status(wa_service.instance_name) if wa_service else {}

    pac = consulta.paciente
    raw_phone = (req.telefono_destino or (pac.telefono if pac else "") or "").strip()
    pac_digits = format_phone_number(raw_phone, wa_service.country_code if wa_service else "+58") if raw_phone else ""
    pac_nombre = f"{pac.nombres} {pac.apellidos}".strip() if pac else "Paciente"
    med_nombre = (
        f"Dr(a). {consulta.medico.nombres} {consulta.medico.apellidos}".strip()
        if consulta.medico
        else f"Dr(a). {current_user.nombre} {current_user.apellido}".strip()
    )

    # Registrar ventana de recepción en vivo por 30 minutos
    estudios_ws_manager.register_listening_window(
        consulta_id=consulta.id,
        paciente_id=consulta.paciente_id,
        paciente_nombre=pac_nombre,
        paciente_phone_digits=pac_digits,
        medico_id=consulta.medico_id,
        usuario_id=current_user.id,
        empresa_id=empresa_id,
        sucursal_id=getattr(target_ent, "id", suc_id),
        ttl_minutes=30,
    )

    mensaje_enviado = False
    error_envio = None
    if req.enviar_mensaje:
        if not wa_service or not live_status.get("is_connected"):
            raise HTTPException(
                status_code=400,
                detail="La línea de WhatsApp de la sucursal no está conectada. Vincúlala en Integraciones → WhatsApp.",
            )
        if not pac_digits or len(pac_digits) < 10:
            raise HTTPException(
                status_code=400,
                detail="El paciente no tiene un número de teléfono válido registrado. Ingresa un número manualmente.",
            )
        texto = (req.mensaje_personalizado or "").strip() or (
            f"{{Hola|Buen día}} *{pac.nombres if pac else 'estimado/a paciente'}*, "
            f"*{med_nombre}* está listo en consulta para revisar tus exámenes. 🩺\n\n"
            f"Por favor responde a este mensaje adjuntando la *foto o archivo PDF* de tus resultados "
            f"(laboratorio, ecografía, rayos X o informe) y el sistema los cargará automáticamente en tu historia clínica."
        )
        send_res = await wa_service.send_message(
            to=pac_digits,
            message=texto,
            sync=True,
            simulate_typing=True,
        )
        if send_res.get("success"):
            mensaje_enviado = True
        else:
            error_envio = send_res.get("error") or "No se pudo enviar el mensaje de invitación"

    return {
        "success": True,
        "listening_active": True,
        "mensaje_enviado": mensaje_enviado,
        "error_envio": error_envio,
        "whatsapp_connected": bool(live_status.get("is_connected")),
        "whatsapp_phone": live_status.get("phone_number") or getattr(target_ent, "whatsapp_phone", None),
        "paciente_phone": pac_digits,
        "message": (
            f"Invitación enviada a +{pac_digits}. Esperando archivos en vivo para {pac_nombre}."
            if mensaje_enviado
            else f"Modo escucha activado para {pac_nombre}. Cualquier PDF o foto que envíe al WhatsApp de la sede se cargará aquí."
        ),
    }


@router.get("/whatsapp/pendientes")
async def listar_estudios_whatsapp_pendientes(
    consulta_id: Optional[int] = Query(None),
    sucursal_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Retorna archivos PDF/imágenes recibidos por WhatsApp en las últimas 6 horas
    que no coincidieron automáticamente con un paciente (ej. enviados desde el teléfono de un familiar),
    junto al estado en vivo de la línea WhatsApp de la sucursal.
    """
    empresa_id = current_user.empresa_id or 1
    suc_id = sucursal_id or current_user.sucursal_defecto_id
    target_ent, _ = await get_whatsapp_target(db, empresa_id, suc_id)
    inst_name = (
        getattr(target_ent, "whatsapp_instance", None)
        or (f"sucursal_{empresa_id}_{target_ent.id}" if target_ent else f"empresa_{empresa_id}")
    )
    live = whatsapp_engine.get_status(inst_name)

    cutoff = datetime.now() - timedelta(hours=6)
    q = (
        select(WhatsAppEstudioPendiente)
        .where(
            WhatsAppEstudioPendiente.empresa_id == empresa_id,
            WhatsAppEstudioPendiente.estado == "pendiente",
            WhatsAppEstudioPendiente.created_at >= cutoff,
        )
        .order_by(desc(WhatsAppEstudioPendiente.id))
        .limit(20)
    )
    rows = (await db.execute(q)).scalars().all()

    win = estudios_ws_manager.get_active_window_for_consulta(consulta_id) if consulta_id else None

    return {
        "whatsapp_connected": bool(live.get("is_connected")),
        "whatsapp_state": live.get("connection_state", "DISCONNECTED"),
        "whatsapp_phone": live.get("phone_number") or getattr(target_ent, "whatsapp_phone", None),
        "sucursal_nombre": getattr(target_ent, "nombre", None),
        "listening_active": bool(win),
        "agent_info": clinical_agent.get_capabilities(),
        "pendientes": [
            {
                "id": r.id,
                "remitente_telefono": r.remitente_telefono,
                "remitente_nombre": r.remitente_nombre,
                "caption": r.caption,
                "archivo_nombre": r.archivo_nombre,
                "archivo_tipo": r.archivo_tipo,
                "archivo_tamano": r.archivo_tamano,
                "archivo_url": r.archivo_url if r.archivo_tipo.startswith("image/") else None,
                "categoria_sugerida": r.categoria_sugerida,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ],
    }


@router.post("/whatsapp/pendientes/{pendiente_id}/asignar")
async def asignar_estudio_whatsapp_pendiente(
    pendiente_id: int,
    req: AsignarPendienteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Asigna un archivo PDF/imagen recibido en la bandeja entrante de WhatsApp a la consulta activa,
    ejecuta el análisis del Bot Clínico Híbrido, lo inserta en el Paso 4 y confirma al remitente.
    """
    empresa_id = current_user.empresa_id or 1
    pend = (
        await db.execute(
            select(WhatsAppEstudioPendiente).where(
                WhatsAppEstudioPendiente.id == pendiente_id,
                WhatsAppEstudioPendiente.empresa_id == empresa_id,
            )
        )
    ).scalar_one_or_none()
    if not pend:
        raise HTTPException(status_code=404, detail="Archivo entrante de WhatsApp no encontrado")

    file_bytes, decoded_mime = decode_data_uri(pend.archivo_url)
    mime = decoded_mime or pend.archivo_tipo
    cat_inicial = (req.categoria or pend.categoria_sugerida or "laboratorio").strip().lower()
    titulo_inicial = (req.titulo or pend.caption or pend.archivo_nombre).strip()[:200]

    pac_obj = (
        await db.execute(
            select(Paciente).where(Paciente.id == req.paciente_id, Paciente.empresa_id == empresa_id)
        )
    ).scalar_one_or_none()

    bot_res = await clinical_agent.analyze_study(
        file_bytes=file_bytes,
        mime_type=mime,
        titulo=titulo_inicial,
        categoria=cat_inicial,
        caption=pend.caption or "",
        patient_ctx=_build_patient_context(pac_obj),
    )

    remitente_label = f"+{pend.remitente_telefono}" + (
        f" ({pend.remitente_nombre})" if pend.remitente_nombre else ""
    )

    nuevo_estudio = EstudioAdjunto(
        empresa_id=empresa_id,
        paciente_id=req.paciente_id,
        consulta_id=req.consulta_id,
        medico_id=req.medico_id,
        sucursal_id=pend.sucursal_id or current_user.sucursal_defecto_id,
        titulo=(req.titulo.strip() if req.titulo else (bot_res.get("titulo_sugerido") or titulo_inicial))[:200],
        categoria=(bot_res.get("categoria") or (req.categoria.strip().lower() if req.categoria else cat_inicial)),
        subtipo="whatsapp_asignado",
        archivo_url=pend.archivo_url,
        archivo_nombre=pend.archivo_nombre,
        archivo_tipo=pend.archivo_tipo,
        archivo_tamano=pend.archivo_tamano,
        fecha_estudio=date.today(),
        notas=req.notas or f"Recibido por WhatsApp de {remitente_label} y asignado en consulta.",
        estado_analisis=bot_res.get("estado_analisis", "pendiente"),
        valores_laboratorio=bot_res.get("valores_laboratorio"),
        datos_imagenologia=bot_res.get("datos_imagenologia"),
        interpretacion_clinica=bot_res.get("interpretacion_clinica"),
        alertas_detectadas=bot_res.get("alertas_detectadas") or [],
        analisis_agente=bot_res.get("analisis_agente"),
        origen="whatsapp",
        whatsapp_remitente=remitente_label[:120],
    )
    db.add(nuevo_estudio)
    await db.flush()

    pend.estado = "asignado"
    pend.estudio_asignado_id = nuevo_estudio.id
    pend.consulta_asignada_id = req.consulta_id
    await db.commit()
    await db.refresh(nuevo_estudio)

    # Confirmar por WhatsApp en segundo plano sin bloquear la respuesta
    if pend.instance_name and pend.remitente_telefono:
        try:
            await whatsapp_engine.send_text_humanized(
                instance_name=pend.instance_name,
                to=pend.remitente_telefono,
                message=f"✅ Recibimos el archivo *{nuevo_estudio.titulo}* y ya fue incorporado a la consulta médica para su evaluación.",
                simulate_typing=True,
                typing_min_sec=1.2,
                typing_max_sec=2.5,
                verify_number=False,
                enforce_cooldown=False,
            )
        except Exception:
            pass

    return {
        "success": True,
        "estudio_id": nuevo_estudio.id,
        "titulo": nuevo_estudio.titulo,
        "categoria": nuevo_estudio.categoria,
        "estado_analisis": nuevo_estudio.estado_analisis,
        "alertas_detectadas": nuevo_estudio.alertas_detectadas or [],
        "engine_used": bot_res.get("engine_used", "python-local"),
        "message": "Estudio asignado y analizado con éxito por el Asistente Clínico.",
    }


@router.delete("/whatsapp/pendientes/{pendiente_id}")
async def descartar_estudio_whatsapp_pendiente(
    pendiente_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    empresa_id = current_user.empresa_id or 1
    pend = (
        await db.execute(
            select(WhatsAppEstudioPendiente).where(
                WhatsAppEstudioPendiente.id == pendiente_id,
                WhatsAppEstudioPendiente.empresa_id == empresa_id,
            )
        )
    ).scalar_one_or_none()
    if not pend:
        raise HTTPException(status_code=404, detail="Archivo entrante no encontrado")
    pend.estado = "descartado"
    await db.commit()
    return {"success": True, "message": "Archivo descartado de la bandeja entrante."}


@router.get("/{estudio_id}")
async def obtener_estudio_detalle(
    estudio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Obtiene el detalle completo de un estudio con su imagen/archivo y datos analíticos."""
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    return {
        "id": estudio.id,
        "empresa_id": estudio.empresa_id,
        "paciente_id": estudio.paciente_id,
        "consulta_id": estudio.consulta_id,
        "medico_id": estudio.medico_id,
        "titulo": estudio.titulo,
        "categoria": estudio.categoria,
        "subtipo": estudio.subtipo,
        "archivo_url": estudio.archivo_url,
        "archivo_nombre": estudio.archivo_nombre,
        "archivo_tipo": estudio.archivo_tipo,
        "archivo_tamano": estudio.archivo_tamano,
        "fecha_estudio": str(estudio.fecha_estudio),
        "notas": estudio.notas,
        "estado_analisis": estudio.estado_analisis,
        "valores_laboratorio": estudio.valores_laboratorio,
        "datos_imagenologia": estudio.datos_imagenologia,
        "interpretacion_clinica": estudio.interpretacion_clinica,
        "alertas_detectadas": estudio.alertas_detectadas or [],
        "analisis_agente": getattr(estudio, "analisis_agente", None),
        "origen": getattr(estudio, "origen", "manual") or "manual",
        "whatsapp_remitente": getattr(estudio, "whatsapp_remitente", None),
        "created_at": estudio.created_at.isoformat() if estudio.created_at else None
    }


@router.post("/crear", status_code=status.HTTP_201_CREATED)
async def crear_estudio(
    req: EstudioCrearRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Crea un nuevo estudio o examen adjunto para un paciente y lo analiza con MediCore AI Local."""
    res_pac = await db.execute(
        select(Paciente).where(Paciente.id == req.paciente_id, Paciente.empresa_id == current_user.empresa_id)
    )
    paciente_obj = res_pac.scalar_one_or_none()
    if not paciente_obj:
        raise HTTPException(status_code=404, detail="Paciente no encontrado en la empresa")

    valores_lab = req.valores_laboratorio
    datos_img = req.datos_imagenologia
    interpretacion = req.interpretacion_clinica
    alertas = []
    analisis_agente = None
    estado = "pendiente"
    categoria_final = req.categoria.strip().lower()

    file_bytes, decoded_mime = decode_data_uri(req.archivo_url)
    agent_res = await clinical_agent.analyze_study(
        file_bytes=file_bytes,
        mime_type=decoded_mime or req.archivo_tipo,
        titulo=req.titulo,
        categoria=categoria_final,
        subtipo=req.subtipo,
        caption=req.notas or "",
        patient_ctx=_build_patient_context(paciente_obj),
        existing_lab_values=valores_lab,
        existing_img_data=datos_img,
    )
    valores_lab = agent_res.get("valores_laboratorio")
    datos_img = agent_res.get("datos_imagenologia")
    alertas = agent_res.get("alertas_detectadas") or []
    analisis_agente = agent_res.get("analisis_agente")
    interpretacion = interpretacion or agent_res.get("interpretacion_clinica")
    estado = agent_res.get("estado_analisis", "pendiente")
    if agent_res.get("categoria"):
        categoria_final = agent_res["categoria"]

    # Determinar sucursal del usuario
    suc_id = current_user.sucursal_defecto_id
    if not suc_id and current_user.sucursales_asignadas:
        suc_id = current_user.sucursales_asignadas[0].sucursal_id

    try:
        nuevo_estudio = EstudioAdjunto(
            empresa_id=current_user.empresa_id,
            paciente_id=req.paciente_id,
            consulta_id=req.consulta_id,
            medico_id=req.medico_id,
            sucursal_id=suc_id,
            titulo=req.titulo.strip(),
            categoria=categoria_final,
            subtipo=req.subtipo.strip().lower() if req.subtipo else None,
            archivo_url=req.archivo_url,
            archivo_nombre=req.archivo_nombre,
            archivo_tipo=req.archivo_tipo,
            archivo_tamano=req.archivo_tamano or len(req.archivo_url),
            fecha_estudio=req.fecha_estudio or date.today(),
            notas=req.notas,
            estado_analisis=estado,
            valores_laboratorio=valores_lab,
            datos_imagenologia=datos_img,
            interpretacion_clinica=interpretacion,
            alertas_detectadas=alertas,
            analisis_agente=analisis_agente,
        )

        db.add(nuevo_estudio)
        await db.commit()
        await db.refresh(nuevo_estudio)

        return {
            "id": nuevo_estudio.id,
            "titulo": nuevo_estudio.titulo,
            "categoria": nuevo_estudio.categoria,
            "estado_analisis": nuevo_estudio.estado_analisis,
            "alertas_detectadas": nuevo_estudio.alertas_detectadas,
            "analisis_agente": nuevo_estudio.analisis_agente,
            "message": "Estudio creado y analizado por MediCore AI Local"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al guardar estudio: {str(e)}"
        )


@router.post("/{estudio_id}/analizar-bot")
async def reanalizar_con_bot(
    estudio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Ejecuta o regenera el análisis completo del Agente Clínico Propio MediCore AI Local
    (OCR neuronal + tablas PDF + 105+ biomarcadores ajustados a edad/sexo + cálculos derivados + síndromes CIE-10).
    """
    res = await db.execute(
        select(EstudioAdjunto)
        .options(selectinload(EstudioAdjunto.paciente))
        .where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    file_bytes, decoded_mime = decode_data_uri(estudio.archivo_url)
    bot_res = await clinical_agent.analyze_study(
        file_bytes=file_bytes,
        mime_type=decoded_mime or estudio.archivo_tipo,
        titulo=estudio.titulo,
        categoria=estudio.categoria,
        subtipo=estudio.subtipo,
        caption=estudio.notas or "",
        patient_ctx=_build_patient_context(estudio.paciente),
        existing_lab_values=estudio.valores_laboratorio,
        existing_img_data=estudio.datos_imagenologia,
    )
    if bot_res.get("categoria"):
        estudio.categoria = bot_res["categoria"]
    if bot_res.get("titulo_sugerido") and bot_res["titulo_sugerido"] != estudio.titulo:
        estudio.titulo = bot_res["titulo_sugerido"][:200]
    estudio.valores_laboratorio = bot_res.get("valores_laboratorio")
    estudio.datos_imagenologia = bot_res.get("datos_imagenologia")
    estudio.alertas_detectadas = bot_res.get("alertas_detectadas") or []
    estudio.interpretacion_clinica = bot_res.get("interpretacion_clinica") or estudio.interpretacion_clinica
    estudio.estado_analisis = bot_res.get("estado_analisis") or estudio.estado_analisis
    estudio.analisis_agente = bot_res.get("analisis_agente")

    await db.commit()
    return {
        "success": True,
        "titulo": estudio.titulo,
        "categoria": estudio.categoria,
        "estado_analisis": estudio.estado_analisis,
        "alertas_detectadas": estudio.alertas_detectadas,
        "interpretacion_clinica": estudio.interpretacion_clinica,
        "valores_laboratorio": estudio.valores_laboratorio,
        "datos_imagenologia": estudio.datos_imagenologia,
        "analisis_agente": estudio.analisis_agente,
    }


@router.put("/{estudio_id}")
async def actualizar_estudio(
    estudio_id: int,
    req: EstudioActualizarRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Actualiza los datos, analitos o interpretación del estudio."""
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    if req.titulo is not None:
        estudio.titulo = req.titulo.strip()
    if req.categoria is not None:
        estudio.categoria = req.categoria.strip().lower()
    if req.subtipo is not None:
        estudio.subtipo = req.subtipo.strip().lower()
    if req.fecha_estudio is not None:
        estudio.fecha_estudio = req.fecha_estudio
    if req.notas is not None:
        estudio.notas = req.notas
    if req.valores_laboratorio is not None:
        estudio.valores_laboratorio = req.valores_laboratorio
        # Recalcular alertas rápidas
        alertas = []
        for it in req.valores_laboratorio:
            val = float(it.get("valor", 0))
            rmin = float(it.get("ref_min", 0))
            rmax = float(it.get("ref_max", 0))
            param = it.get("parametro", "")
            u = it.get("unidad", "")
            if val < rmin:
                alertas.append(f"🔻 {param}: {val} {u} (Bajo)")
            elif val > rmax:
                alertas.append(f"⚠️ {param}: {val} {u} (Elevado)")
        estudio.alertas_detectadas = alertas
    if req.datos_imagenologia is not None:
        estudio.datos_imagenologia = req.datos_imagenologia
    if req.interpretacion_clinica is not None:
        estudio.interpretacion_clinica = req.interpretacion_clinica
    if req.estado_analisis is not None:
        estudio.estado_analisis = req.estado_analisis

    await db.commit()
    return {"success": True, "message": "Estudio actualizado correctamente"}


@router.delete("/{estudio_id}")
async def eliminar_estudio(
    estudio_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Elimina un estudio adjunto."""
    res = await db.execute(
        select(EstudioAdjunto).where(
            EstudioAdjunto.id == estudio_id,
            EstudioAdjunto.empresa_id == current_user.empresa_id
        )
    )
    estudio = res.scalar_one_or_none()
    if not estudio:
        raise HTTPException(status_code=404, detail="Estudio no encontrado")

    await db.delete(estudio)
    await db.commit()
    return {"success": True, "message": "Estudio eliminado"}
