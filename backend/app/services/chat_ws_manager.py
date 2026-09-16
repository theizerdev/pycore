import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ChatConnectionManager:
    """
    Gestor de conexiones WebSocket para el Chat Clínico Interno.
    Mantiene el mapeo de sockets activos por usuario y por sucursal.
    """
    def __init__(self):
        # Mapeo: usuario_id -> Lista de WebSockets activos (puede tener varias pestañas abiertas)
        self.active_users: Dict[int, List[WebSocket]] = {}
        # Mapeo: sucursal_id -> Set de usuario_ids conectados
        self.branch_users: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, usuario_id: int, sucursal_id: int):
        await websocket.accept()
        if usuario_id not in self.active_users:
            self.active_users[usuario_id] = []
        self.active_users[usuario_id].append(websocket)

        if sucursal_id not in self.branch_users:
            self.branch_users[sucursal_id] = set()
        self.branch_users[sucursal_id].add(usuario_id)

        logger.info(f"🟢 [CHAT WS] Usuario {usuario_id} conectado en sucursal {sucursal_id}. Conexiones activas: {len(self.active_users[usuario_id])}")

    def disconnect(self, websocket: WebSocket, usuario_id: int, sucursal_id: int):
        if usuario_id in self.active_users:
            if websocket in self.active_users[usuario_id]:
                self.active_users[usuario_id].remove(websocket)
            if not self.active_users[usuario_id]:
                del self.active_users[usuario_id]
                if sucursal_id in self.branch_users and usuario_id in self.branch_users[sucursal_id]:
                    self.branch_users[sucursal_id].remove(usuario_id)

        logger.info(f"🔴 [CHAT WS] Usuario {usuario_id} desconectado de sucursal {sucursal_id}.")

    async def send_to_user(self, usuario_id: int, message: dict):
        """Envía un mensaje a todas las conexiones activas de un usuario específico."""
        if usuario_id in self.active_users:
            for ws in list(self.active_users[usuario_id]):
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.warning(f"Error enviando mensaje a usuario {usuario_id}: {e}")

    async def broadcast_to_participants(self, participant_ids: List[int], message: dict):
        """Difunde un evento en tiempo real a todos los participantes de un canal."""
        for uid in participant_ids:
            await self.send_to_user(uid, message)

    async def broadcast_to_sucursal(self, sucursal_id: int, message: dict):
        """Difunde a todos los usuarios conectados en una sucursal."""
        if sucursal_id in self.branch_users:
            for uid in list(self.branch_users[sucursal_id]):
                await self.send_to_user(uid, message)


# Instancia singleton global
chat_ws_manager = ChatConnectionManager()
