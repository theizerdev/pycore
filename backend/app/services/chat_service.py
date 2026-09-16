import logging
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload

from app.models.chat import ChatCanal, ChatParticipante, ChatMensaje
from app.models.usuario import Usuario, UsuarioSucursal
from app.models.sucursal import Sucursal
from app.schemas.chat import (
    ChatCanalResponse,
    ChatMensajeResponse,
    ChatParticipanteSimple,
    ChatPersonalItem,
    ChatUnreadSummary,
    ChatMensajeCreate,
)

logger = logging.getLogger(__name__)


class ChatService:
    @staticmethod
    def _format_mensaje_response(m: ChatMensaje) -> ChatMensajeResponse:
        rem = m.remitente
        rol_nombre = rem.rol.nombre if rem and rem.rol else "Personal Clínico"
        rol_slug = rem.rol.slug if rem and rem.rol else "personal"
        return ChatMensajeResponse(
            id=m.id,
            canal_id=m.canal_id,
            empresa_id=m.empresa_id,
            sucursal_id=m.sucursal_id,
            remitente_id=m.remitente_id,
            remitente_nombre=f"{rem.nombre} {rem.apellido}" if rem else "Usuario",
            remitente_rol=rol_nombre,
            remitente_rol_slug=rol_slug,
            remitente_avatar=rem.avatar_url if rem else None,
            tipo=m.tipo,
            contenido=m.contenido,
            archivo_url=m.archivo_url,
            archivo_nombre=m.archivo_nombre,
            archivo_tamano=m.archivo_tamano,
            archivo_tipo=m.archivo_tipo,
            duracion_audio=m.duracion_audio,
            created_at=m.created_at,
        )

    @staticmethod
    async def ensure_general_branch_channel(
        db: AsyncSession,
        empresa_id: int,
        sucursal_id: int,
        user: Usuario
    ) -> ChatCanal:
        """
        Asegura que exista el canal general de la sucursal y que el usuario esté suscrito.
        """
        stmt = select(ChatCanal).where(
            ChatCanal.empresa_id == empresa_id,
            ChatCanal.sucursal_id == sucursal_id,
            ChatCanal.tipo == "canal_sucursal",
            ChatCanal.activo == True
        )
        res = await db.execute(stmt)
        canal = res.scalar_one_or_none()

        if not canal:
            res_suc = await db.execute(select(Sucursal).where(Sucursal.id == sucursal_id))
            suc = res_suc.scalar_one_or_none()
            nombre_suc = suc.nombre if suc else f"Sede {sucursal_id}"

            canal = ChatCanal(
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                tipo="canal_sucursal",
                nombre=f"Canal General - {nombre_suc}",
                descripcion="Canal de comunicación general para todo el equipo de la sede",
                activo=True
            )
            db.add(canal)
            await db.flush()

        # Asegurar que el usuario actual esté como participante
        stmt_p = select(ChatParticipante).where(
            ChatParticipante.canal_id == canal.id,
            ChatParticipante.usuario_id == user.id
        )
        res_p = await db.execute(stmt_p)
        part = res_p.scalar_one_or_none()
        if not part:
            db.add(ChatParticipante(canal_id=canal.id, usuario_id=user.id, ultimo_leido_at=datetime.now()))
            await db.flush()

        return canal

    @staticmethod
    async def get_or_create_direct_channel(
        db: AsyncSession,
        empresa_id: int,
        sucursal_id: int,
        user_a_id: int,
        user_b_id: int
    ) -> ChatCanal:
        """
        Busca un canal directo existente entre user_a y user_b en la sucursal.
        Si no existe, lo crea y agrega a ambos como participantes.
        """
        # Buscar canales directos donde participe user_a
        stmt = (
            select(ChatCanal)
            .join(ChatParticipante, ChatParticipante.canal_id == ChatCanal.id)
            .where(
                ChatCanal.empresa_id == empresa_id,
                ChatCanal.sucursal_id == sucursal_id,
                ChatCanal.tipo == "directo",
                ChatCanal.activo == True,
                ChatParticipante.usuario_id == user_a_id
            )
        )
        res = await db.execute(stmt)
        canales_a = res.scalars().all()

        for c in canales_a:
            # Comprobar si user_b también está en este canal
            stmt_b = select(ChatParticipante).where(
                ChatParticipante.canal_id == c.id,
                ChatParticipante.usuario_id == user_b_id
            )
            res_b = await db.execute(stmt_b)
            if res_b.scalar_one_or_none():
                return c

        # Obtener datos de ambos usuarios para el nombre referencial
        res_users = await db.execute(select(Usuario).where(Usuario.id.in_([user_a_id, user_b_id])))
        users = res_users.scalars().all()
        nombres = " & ".join([f"{u.nombre} {u.apellido}" for u in users]) if users else "Chat Directo"

        # Crear nuevo canal directo
        nuevo_canal = ChatCanal(
            empresa_id=empresa_id,
            sucursal_id=sucursal_id,
            tipo="directo",
            nombre=nombres,
            descripcion="Chat privado 1-a-1",
            activo=True
        )
        db.add(nuevo_canal)
        await db.flush()

        db.add(ChatParticipante(canal_id=nuevo_canal.id, usuario_id=user_a_id, ultimo_leido_at=datetime.now()))
        db.add(ChatParticipante(canal_id=nuevo_canal.id, usuario_id=user_b_id, ultimo_leido_at=datetime.now()))
        await db.flush()

        return nuevo_canal

    @staticmethod
    async def get_user_channels(
        db: AsyncSession,
        empresa_id: int,
        sucursal_id: int,
        usuario: Usuario
    ) -> List[ChatCanalResponse]:
        """
        Obtiene los canales activos del usuario en la sucursal seleccionada.
        Calcula mensajes no leídos y obtiene el último mensaje de cada canal.
        """
        # Asegurar que el canal general de la sede exista para el usuario
        await ChatService.ensure_general_branch_channel(db, empresa_id, sucursal_id, usuario)
        await db.commit()

        # Buscar todos los canales donde participa el usuario en esta sucursal
        stmt = (
            select(ChatCanal, ChatParticipante.ultimo_leido_at)
            .join(ChatParticipante, ChatParticipante.canal_id == ChatCanal.id)
            .options(
                selectinload(ChatCanal.sucursal),
                selectinload(ChatCanal.participantes).selectinload(ChatParticipante.usuario).selectinload(Usuario.rol)
            )
            .where(
                ChatCanal.empresa_id == empresa_id,
                ChatCanal.sucursal_id == sucursal_id,
                ChatCanal.activo == True,
                ChatParticipante.usuario_id == usuario.id,
                ChatParticipante.activo == True
            )
            .order_by(desc(ChatCanal.updated_at))
        )
        res = await db.execute(stmt)
        rows = res.all()

        canales_resp: List[ChatCanalResponse] = []

        for canal, ultimo_leido_at in rows:
            # 1. Obtener último mensaje
            stmt_msg = (
                select(ChatMensaje)
                .options(selectinload(ChatMensaje.remitente).selectinload(Usuario.rol))
                .where(ChatMensaje.canal_id == canal.id)
                .order_by(desc(ChatMensaje.id))
                .limit(1)
            )
            res_msg = await db.execute(stmt_msg)
            last_msg = res_msg.scalar_one_or_none()

            # 2. Contar mensajes no leídos (mensajes posteriores a ultimo_leido_at y no enviados por el usuario)
            count_stmt = select(func.count(ChatMensaje.id)).where(
                ChatMensaje.canal_id == canal.id,
                ChatMensaje.remitente_id != usuario.id
            )
            if ultimo_leido_at:
                count_stmt = count_stmt.where(ChatMensaje.created_at > ultimo_leido_at)
            res_count = await db.execute(count_stmt)
            no_leidos = res_count.scalar() or 0

            # 3. Formatear participantes
            part_list = []
            nombre_canal = canal.nombre
            for p in canal.participantes:
                u = p.usuario
                if not u:
                    continue
                part_list.append(ChatParticipanteSimple(
                    usuario_id=u.id,
                    nombre=u.nombre,
                    apellido=u.apellido,
                    rol=u.rol.nombre if u.rol else "Personal",
                    rol_slug=u.rol.slug if u.rol else "personal",
                    avatar_url=u.avatar_url,
                    ultimo_leido_at=p.ultimo_leido_at
                ))
                # En canales directos, el nombre visible para este usuario es el del otro interlocutor
                if canal.tipo == "directo" and u.id != usuario.id:
                    nombre_canal = f"{u.nombre} {u.apellido}"

            canales_resp.append(ChatCanalResponse(
                id=canal.id,
                empresa_id=canal.empresa_id,
                sucursal_id=canal.sucursal_id,
                sucursal_nombre=canal.sucursal.nombre if canal.sucursal else "Sede",
                tipo=canal.tipo,
                nombre=nombre_canal,
                descripcion=canal.descripcion,
                activo=canal.activo,
                ultimo_mensaje=ChatService._format_mensaje_response(last_msg) if last_msg else None,
                no_leidos=no_leidos,
                participantes=part_list,
                created_at=canal.created_at,
                updated_at=canal.updated_at
            ))

        return canales_resp

    @staticmethod
    async def get_channel_messages(
        db: AsyncSession,
        canal_id: int,
        usuario_id: int,
        limit: int = 50,
        before_id: Optional[int] = None
    ) -> List[ChatMensajeResponse]:
        """
        Obtiene el historial de mensajes de un canal ordenado cronológicamente.
        """
        query = (
            select(ChatMensaje)
            .options(selectinload(ChatMensaje.remitente).selectinload(Usuario.rol))
            .where(ChatMensaje.canal_id == canal_id)
        )
        if before_id:
            query = query.where(ChatMensaje.id < before_id)

        query = query.order_by(desc(ChatMensaje.id)).limit(limit)
        res = await db.execute(query)
        mensajes = res.scalars().all()

        # Invertir para devolver en orden cronológico ascendente
        return [ChatService._format_mensaje_response(m) for m in reversed(mensajes)]

    @staticmethod
    async def save_message(
        db: AsyncSession,
        canal_id: int,
        empresa_id: int,
        sucursal_id: int,
        remitente: Usuario,
        payload: ChatMensajeCreate
    ) -> Tuple[ChatMensajeResponse, List[int]]:
        """
        Guarda un nuevo mensaje en el canal y actualiza marcas de tiempo.
        Retorna la respuesta formateada y la lista de IDs de participantes para difusión por WS.
        """
        msg = ChatMensaje(
            canal_id=canal_id,
            empresa_id=empresa_id,
            sucursal_id=sucursal_id,
            remitente_id=remitente.id,
            tipo=payload.tipo,
            contenido=payload.contenido,
            archivo_url=payload.archivo_url,
            archivo_nombre=payload.archivo_nombre,
            archivo_tamano=payload.archivo_tamano,
            archivo_tipo=payload.archivo_tipo,
            duracion_audio=payload.duracion_audio,
            created_at=datetime.now()
        )
        db.add(msg)

        # Actualizar updated_at del canal para que suba arriba en la lista
        stmt_c = select(ChatCanal).where(ChatCanal.id == canal_id)
        res_c = await db.execute(stmt_c)
        canal = res_c.scalar_one_or_none()
        if canal:
            canal.updated_at = datetime.now()

        # Actualizar ultimo_leido_at del remitente
        stmt_p = select(ChatParticipante).where(
            ChatParticipante.canal_id == canal_id,
            ChatParticipante.usuario_id == remitente.id
        )
        res_p = await db.execute(stmt_p)
        part = res_p.scalar_one_or_none()
        if part:
            part.ultimo_leido_at = datetime.now()

        await db.commit()
        await db.refresh(msg)

        # Obtener todos los IDs de participantes del canal
        stmt_all_p = select(ChatParticipante.usuario_id).where(
            ChatParticipante.canal_id == canal_id,
            ChatParticipante.activo == True
        )
        res_all_p = await db.execute(stmt_all_p)
        participant_ids = [row[0] for row in res_all_p.all()]

        # Cargar relaciones del remitente para la respuesta
        msg.remitente = remitente
        return ChatService._format_mensaje_response(msg), participant_ids

    @staticmethod
    async def mark_channel_as_read(
        db: AsyncSession,
        canal_id: int,
        usuario_id: int
    ) -> bool:
        """
        Actualiza el timestamp de último mensaje leído del usuario en el canal.
        """
        stmt = select(ChatParticipante).where(
            ChatParticipante.canal_id == canal_id,
            ChatParticipante.usuario_id == usuario_id
        )
        res = await db.execute(stmt)
        part = res.scalar_one_or_none()
        if part:
            part.ultimo_leido_at = datetime.now()
            await db.commit()
            return True
        return False

    @staticmethod
    async def get_unread_summary(
        db: AsyncSession,
        empresa_id: int,
        sucursal_id: int,
        usuario_id: int
    ) -> ChatUnreadSummary:
        """
        Calcula el total de mensajes no leídos del usuario para el badge flotante.
        """
        stmt = (
            select(ChatCanal.id, ChatParticipante.ultimo_leido_at)
            .join(ChatParticipante, ChatParticipante.canal_id == ChatCanal.id)
            .where(
                ChatCanal.empresa_id == empresa_id,
                ChatCanal.sucursal_id == sucursal_id,
                ChatCanal.activo == True,
                ChatParticipante.usuario_id == usuario_id,
                ChatParticipante.activo == True
            )
        )
        res = await db.execute(stmt)
        canales = res.all()

        canales_dict: Dict[int, int] = {}
        total = 0

        for canal_id, ultimo_leido in canales:
            q = select(func.count(ChatMensaje.id)).where(
                ChatMensaje.canal_id == canal_id,
                ChatMensaje.remitente_id != usuario_id
            )
            if ultimo_leido:
                q = q.where(ChatMensaje.created_at > ultimo_leido)
            res_c = await db.execute(q)
            count = res_c.scalar() or 0
            if count > 0:
                canales_dict[canal_id] = count
                total += count

        return ChatUnreadSummary(total_no_leidos=total, canales=canales_dict)

    @staticmethod
    async def get_branch_staff(
        db: AsyncSession,
        empresa_id: int,
        sucursal_id: int,
        current_user_id: int
    ) -> List[ChatPersonalItem]:
        """
        Lista el personal activo asignado a la sucursal clasificado por sus roles
        (Médico, Enfermería, Recepción, Administrador) y busca si ya tiene canal directo.
        """
        # Buscar usuarios vinculados a esta sucursal (por sucursal_defecto o tabla intermedia usuario_sucursales)
        stmt = (
            select(Usuario)
            .options(selectinload(Usuario.rol), selectinload(Usuario.sucursal_defecto))
            .join(UsuarioSucursal, UsuarioSucursal.usuario_id == Usuario.id, isouter=True)
            .where(
                Usuario.empresa_id == empresa_id,
                Usuario.activo == True,
                or_(
                    Usuario.sucursal_defecto_id == sucursal_id,
                    UsuarioSucursal.sucursal_id == sucursal_id
                )
            )
            .distinct()
        )
        res = await db.execute(stmt)
        usuarios = res.scalars().all()

        res_suc = await db.execute(select(Sucursal.nombre).where(Sucursal.id == sucursal_id))
        suc_nombre = res_suc.scalar() or "Sede"

        staff_list: List[ChatPersonalItem] = []

        for u in usuarios:
            if u.id == current_user_id:
                continue  # No listarse a uno mismo

            # Comprobar si ya existe canal directo con este usuario
            stmt_c = (
                select(ChatCanal.id)
                .join(ChatParticipante, ChatParticipante.canal_id == ChatCanal.id)
                .where(
                    ChatCanal.empresa_id == empresa_id,
                    ChatCanal.sucursal_id == sucursal_id,
                    ChatCanal.tipo == "directo",
                    ChatCanal.activo == True,
                    ChatParticipante.usuario_id == current_user_id
                )
            )
            res_c = await db.execute(stmt_c)
            directos_current = [r[0] for r in res_c.all()]

            canal_directo_id = None
            if directos_current:
                stmt_other = select(ChatParticipante.canal_id).where(
                    ChatParticipante.canal_id.in_(directos_current),
                    ChatParticipante.usuario_id == u.id
                )
                res_other = await db.execute(stmt_other)
                canal_directo_id = res_other.scalar_one_or_none()

            staff_list.append(ChatPersonalItem(
                id=u.id,
                nombre=u.nombre,
                apellido=u.apellido,
                email=u.email,
                rol=u.rol.nombre if u.rol else "Personal",
                rol_slug=u.rol.slug if u.rol else "personal",
                avatar_url=u.avatar_url,
                sucursal_id=sucursal_id,
                sucursal_nombre=suc_nombre,
                activo=u.activo,
                canal_directo_id=canal_directo_id
            ))

        return staff_list
