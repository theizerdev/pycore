"""
Gestor de WebSockets en Tiempo Real para Estudios Clínicos (Paso 4).
Permite notificar al instante al médico cuando un paciente envía un PDF o imagen
al WhatsApp de la sucursal — tanto si el archivo se insertó automáticamente en su
consulta como si llegó a la bandeja entrante desde el número de un familiar.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket

logger = logging.getLogger("estudios_ws_manager")


@dataclass
class ActiveListeningWindow:
    consulta_id: int
    paciente_id: int
    paciente_nombre: str
    paciente_phone_digits: str
    medico_id: Optional[int]
    usuario_id: int
    empresa_id: int
    sucursal_id: Optional[int]
    expires_at: float


class EstudiosWSManager:
    def __init__(self) -> None:
        # consulta_id -> lista de WebSockets viendo esa consulta
        self.consulta_sockets: Dict[int, List[WebSocket]] = {}
        # sucursal_id -> lista de WebSockets activos en esa sucursal (para notificaciones generales / bandeja entrante)
        self.sucursal_sockets: Dict[int, List[WebSocket]] = {}
        # empresa_id -> lista de WebSockets activos en esa empresa
        self.empresa_sockets: Dict[int, List[WebSocket]] = {}
        # Ventanas activas de "Solicitar estudio por WhatsApp" por sucursal/empresa:
        # consulta_id -> ActiveListeningWindow
        self.listening_windows: Dict[int, ActiveListeningWindow] = {}

    async def connect(
        self,
        websocket: WebSocket,
        empresa_id: int,
        sucursal_id: Optional[int],
        consulta_id: Optional[int],
    ) -> None:
        await websocket.accept()
        self.empresa_sockets.setdefault(empresa_id, []).append(websocket)
        if sucursal_id:
            self.sucursal_sockets.setdefault(sucursal_id, []).append(websocket)
        if consulta_id:
            self.consulta_sockets.setdefault(consulta_id, []).append(websocket)
        logger.info(
            f"🟢 [ESTUDIOS WS] Conectado empresa={empresa_id} sucursal={sucursal_id} consulta={consulta_id}"
        )

    def disconnect(
        self,
        websocket: WebSocket,
        empresa_id: int,
        sucursal_id: Optional[int],
        consulta_id: Optional[int],
    ) -> None:
        for mapping, key in (
            (self.empresa_sockets, empresa_id),
            (self.sucursal_sockets, sucursal_id),
            (self.consulta_sockets, consulta_id),
        ):
            if key and key in mapping and websocket in mapping[key]:
                mapping[key].remove(websocket)
                if not mapping[key]:
                    del mapping[key]

    async def _send_set(self, sockets: Set[WebSocket], payload: Dict[str, Any]) -> None:
        for ws in list(sockets):
            try:
                await ws.send_json(payload)
            except Exception:
                # Limpiar socket muerto silenciosamente
                for mapping in (self.consulta_sockets, self.sucursal_sockets, self.empresa_sockets):
                    for key in list(mapping.keys()):
                        if ws in mapping[key]:
                            mapping[key].remove(ws)
                            if not mapping[key]:
                                del mapping[key]

    async def notify_consulta(
        self,
        consulta_id: int,
        empresa_id: int,
        sucursal_id: Optional[int],
        payload: Dict[str, Any],
    ) -> None:
        targets: Set[WebSocket] = set()
        targets.update(self.consulta_sockets.get(consulta_id, []))
        if sucursal_id:
            targets.update(self.sucursal_sockets.get(sucursal_id, []))
        if not targets:
            targets.update(self.empresa_sockets.get(empresa_id, []))
        await self._send_set(targets, payload)

    async def notify_branch(
        self,
        empresa_id: int,
        sucursal_id: Optional[int],
        payload: Dict[str, Any],
    ) -> None:
        targets: Set[WebSocket] = set()
        if sucursal_id:
            targets.update(self.sucursal_sockets.get(sucursal_id, []))
        targets.update(self.empresa_sockets.get(empresa_id, []))
        await self._send_set(targets, payload)

    def register_listening_window(
        self,
        consulta_id: int,
        paciente_id: int,
        paciente_nombre: str,
        paciente_phone_digits: str,
        medico_id: Optional[int],
        usuario_id: int,
        empresa_id: int,
        sucursal_id: Optional[int],
        ttl_minutes: int = 30,
    ) -> ActiveListeningWindow:
        self._prune_windows()
        win = ActiveListeningWindow(
            consulta_id=consulta_id,
            paciente_id=paciente_id,
            paciente_nombre=paciente_nombre,
            paciente_phone_digits=paciente_phone_digits,
            medico_id=medico_id,
            usuario_id=usuario_id,
            empresa_id=empresa_id,
            sucursal_id=sucursal_id,
            expires_at=time.time() + (ttl_minutes * 60),
        )
        self.listening_windows[consulta_id] = win
        return win

    def get_active_window_for_consulta(self, consulta_id: int) -> Optional[ActiveListeningWindow]:
        self._prune_windows()
        return self.listening_windows.get(consulta_id)

    def find_matching_window(
        self,
        empresa_id: int,
        sucursal_id: Optional[int],
        sender_digits: str,
    ) -> Optional[ActiveListeningWindow]:
        """Busca si hay una consulta escuchando activamente a este teléfono (últimos 10 dígitos)."""
        self._prune_windows()
        tail = sender_digits[-10:] if len(sender_digits) >= 10 else sender_digits
        if not tail:
            return None
        for win in self.listening_windows.values():
            if win.empresa_id != empresa_id:
                continue
            if sucursal_id and win.sucursal_id and win.sucursal_id != sucursal_id:
                continue
            win_tail = win.paciente_phone_digits[-10:] if len(win.paciente_phone_digits) >= 10 else win.paciente_phone_digits
            if win_tail and win_tail == tail:
                return win
        return None

    def _prune_windows(self) -> None:
        now = time.time()
        expired = [cid for cid, w in self.listening_windows.items() if w.expires_at <= now]
        for cid in expired:
            self.listening_windows.pop(cid, None)


estudios_ws_manager = EstudiosWSManager()
