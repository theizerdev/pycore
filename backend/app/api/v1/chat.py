import os
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    UploadFile,
    File,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.core.config import settings
from app.core.database import get_db, AsyncSessionLocal
from app.core.security import get_current_active_user
from app.models.usuario import Usuario
from app.models.chat import ChatCanal, ChatParticipante
from app.schemas.chat import (
    ChatCanalResponse,
    ChatMensajeCreate,
    ChatMensajeResponse,
    ChatPersonalItem,
    ChatUnreadSummary,
)
from app.services.chat_service import ChatService
from app.services.chat_ws_manager import chat_ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat Clínico Interno"])

# Directorio físico para archivos multimedia del chat
UPLOAD_CHAT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "uploads", "chat"))
os.makedirs(UPLOAD_CHAT_DIR, exist_ok=True)

# Límite estricto de 4 MB
MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024  # 4,194,304 bytes


# ── 1. SUBIDA MULTIMEDIA CON CONTROL ESTRICTO DE 4 MB ────────────────────────

@router.post("/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Sube un archivo adjunto para el chat (audio, imagen, documento).
    Aplica una restricción estricta de máximo 4 MB.
    """
    # Leer el contenido en memoria para validar el peso exacto
    contents = await file.read()
    file_size = len(contents)

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo pesa {file_size / (1024*1024):.2f} MB, lo cual excede el límite máximo permitido de 4 MB."
        )

    # Sanitizar y generar nombre único
    ext = os.path.splitext(file.filename or "")[1].lower()
    unique_filename = f"{uuid.uuid4().hex[:12]}_{datetime.now().strftime('%Y%m%d%H%M%S')}{ext}"
    file_path = os.path.join(UPLOAD_CHAT_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    public_url = f"/uploads/chat/{unique_filename}"

    return {
        "success": True,
        "archivo_url": public_url,
        "archivo_nombre": file.filename or "adjunto",
        "archivo_tamano": file_size,
        "archivo_tipo": file.content_type or "application/octet-stream"
    }


# ── 2. CANALES Y CONVERSACIONES ──────────────────────────────────────────────

@router.get("/canales", response_model=List[ChatCanalResponse])
async def get_user_channels(
    sucursal_id: int = Query(...),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los canales activos del usuario en la sucursal indicada
    (Canal General de la Sede + Conversaciones Directas 1-a-1).
    """
    empresa_id = current_user.empresa_id or 1
    return await ChatService.get_user_channels(db, empresa_id, sucursal_id, current_user)


@router.post("/canales/directo", response_model=ChatCanalResponse)
async def open_or_create_direct_channel(
    otro_usuario_id: int = Query(...),
    sucursal_id: int = Query(...),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Abre o crea un canal privado 1-a-1 entre el usuario actual y otro colega
    (Doctor, Enfermería, Recepción) en la sucursal seleccionada.
    """
    empresa_id = current_user.empresa_id or 1
    canal = await ChatService.get_or_create_direct_channel(
        db, empresa_id, sucursal_id, current_user.id, otro_usuario_id
    )
    await db.commit()

    # Devolver canal enriquecido
    canales = await ChatService.get_user_channels(db, empresa_id, sucursal_id, current_user)
    for c in canales:
        if c.id == canal.id:
            return c
    raise HTTPException(status_code=404, detail="No se pudo cargar el canal directo")


# ── 3. MENSAJES Y HISTORIAL ──────────────────────────────────────────────────

@router.get("/canales/{canal_id}/mensajes", response_model=List[ChatMensajeResponse])
async def get_channel_messages(
    canal_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    before_id: Optional[int] = Query(None),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el historial de mensajes de un canal específico.
    """
    return await ChatService.get_channel_messages(db, canal_id, current_user.id, limit, before_id)


@router.post("/canales/{canal_id}/mensajes", response_model=ChatMensajeResponse)
async def send_channel_message(
    canal_id: int,
    payload: ChatMensajeCreate,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Envía un nuevo mensaje (texto, audio/nota de voz, imagen, documento).
    Guarda en base de datos y lo difunde en tiempo real a los participantes vía WebSocket.
    """
    # Verificar que el canal exista y pertenezca a la empresa del usuario
    stmt = select(ChatCanal).where(ChatCanal.id == canal_id)
    res = await db.execute(stmt)
    canal = res.scalar_one_or_none()
    if not canal:
        raise HTTPException(status_code=404, detail="Canal de chat no encontrado")

    empresa_id = current_user.empresa_id or 1
    sucursal_id = canal.sucursal_id

    mensaje_resp, participant_ids = await ChatService.save_message(
        db, canal_id, empresa_id, sucursal_id, current_user, payload
    )

    # Difusión en tiempo real por WebSocket
    ws_event = {
        "event": "nuevo_mensaje",
        "canal_id": canal_id,
        "sucursal_id": sucursal_id,
        "mensaje": mensaje_resp.model_dump(mode="json")
    }
    await chat_ws_manager.broadcast_to_participants(participant_ids, ws_event)

    return mensaje_resp


@router.post("/canales/{canal_id}/leer")
async def mark_channel_as_read(
    canal_id: int,
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Marca los mensajes del canal como leídos por el usuario actual.
    """
    ok = await ChatService.mark_channel_as_read(db, canal_id, current_user.id)
    if ok:
        # Notificar lectura a otros participantes
        stmt_all_p = select(ChatParticipante.usuario_id).where(
            ChatParticipante.canal_id == canal_id,
            ChatParticipante.activo == True
        )
        res_all_p = await db.execute(stmt_all_p)
        participant_ids = [row[0] for row in res_all_p.all()]

        ws_event = {
            "event": "mensajes_leidos",
            "canal_id": canal_id,
            "usuario_id": current_user.id
        }
        await chat_ws_manager.broadcast_to_participants(participant_ids, ws_event)

    return {"success": ok}


# ── 4. DIRECTORIO DE PERSONAL CLÍNICO POR SUCURSAL ───────────────────────────

@router.get("/personal", response_model=List[ChatPersonalItem])
async def get_branch_staff(
    sucursal_id: int = Query(...),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista el personal médico asignado a la sucursal (Médicos, Enfermería, Recepción).
    Permite iniciar chats 1-a-1 rápidamente.
    """
    empresa_id = current_user.empresa_id or 1
    return await ChatService.get_branch_staff(db, empresa_id, sucursal_id, current_user.id)


# ── 5. CONTADOR GLOBAL DE MENSAJES NO LEÍDOS (BADGE FLOTANTE) ────────────────

@router.get("/no-leidos", response_model=ChatUnreadSummary)
async def get_unread_count(
    sucursal_id: int = Query(...),
    current_user: Usuario = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el total de mensajes no leídos del usuario para el botón flotante.
    """
    empresa_id = current_user.empresa_id or 1
    return await ChatService.get_unread_summary(db, empresa_id, sucursal_id, current_user.id)


# ── 6. WEBSOCKET ENDPOINT EN TIEMPO REAL ─────────────────────────────────────

@router.websocket("/ws")
async def chat_websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
    sucursal_id: int = Query(...)
):
    """
    Punto de conexión WebSocket bi-direccional para mensajería en vivo.
    Valida el token JWT del usuario y lo conecta a las salas correspondientes.
    """
    # 1. Validar Token JWT
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

    # 2. Conectar al ConnectionManager
    await chat_ws_manager.connect(websocket, user_id, sucursal_id)

    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event")

            if event == "ping":
                await websocket.send_json({"event": "pong"})

            elif event == "typing":
                # Notificar a los demás participantes que el usuario está escribiendo
                canal_id = data.get("canal_id")
                is_typing = data.get("is_typing", True)
                if canal_id:
                    async with AsyncSessionLocal() as db:
                        stmt_p = select(ChatParticipante.usuario_id).where(
                            ChatParticipante.canal_id == canal_id,
                            ChatParticipante.usuario_id != user_id,
                            ChatParticipante.activo == True
                        )
                        res_p = await db.execute(stmt_p)
                        other_uids = [r[0] for r in res_p.all()]

                    await chat_ws_manager.broadcast_to_participants(other_uids, {
                        "event": "user_typing",
                        "canal_id": canal_id,
                        "usuario_id": user_id,
                        "is_typing": is_typing
                    })

    except WebSocketDisconnect:
        chat_ws_manager.disconnect(websocket, user_id, sucursal_id)
    except Exception as e:
        logger.warning(f"Error en WebSocket de chat: {e}")
        chat_ws_manager.disconnect(websocket, user_id, sucursal_id)
