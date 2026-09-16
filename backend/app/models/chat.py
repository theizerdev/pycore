from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class ChatCanal(Base, TimestampMixin):
    """
    Canal de comunicación interna.
    Puede ser 'canal_sucursal' (grupal de toda la sede) o 'directo' (privado 1-a-1 entre dos usuarios).
    """
    __tablename__ = "chat_canales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    tipo = Column(String(30), default="canal_sucursal", nullable=False, index=True)  # 'canal_sucursal' | 'directo'
    nombre = Column(String(150), nullable=True)  # Nombre del canal grupal o título descriptivo
    descripcion = Column(String(255), nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")
    participantes = relationship("ChatParticipante", back_populates="canal", cascade="all, delete-orphan", lazy="selectin")
    mensajes = relationship("ChatMensaje", back_populates="canal", cascade="all, delete-orphan", lazy="selectin")


class ChatParticipante(Base, TimestampMixin):
    """
    Miembros o participantes de un canal o conversación directa.
    Almacena el timestamp de último mensaje leído para calcular el contador de no leídos.
    """
    __tablename__ = "chat_participantes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    canal_id = Column(Integer, ForeignKey("chat_canales.id", ondelete="CASCADE"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    ultimo_leido_at = Column(DateTime, nullable=True, default=datetime.now)
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    canal = relationship("ChatCanal", back_populates="participantes", lazy="selectin")
    usuario = relationship("Usuario", lazy="selectin")

    __table_args__ = (
        Index("idx_canal_usuario", "canal_id", "usuario_id", unique=True),
    )


class ChatMensaje(Base, TimestampMixin):
    """
    Mensajes internos del chat.
    Soporta texto, audio (notas de voz), imagen y documentos.
    Sujeto a política de retención de 30 días.
    """
    __tablename__ = "chat_mensajes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    canal_id = Column(Integer, ForeignKey("chat_canales.id", ondelete="CASCADE"), nullable=False, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    sucursal_id = Column(Integer, ForeignKey("sucursales.id", ondelete="CASCADE"), nullable=False, index=True)
    remitente_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)

    tipo = Column(String(20), default="texto", nullable=False, index=True)  # 'texto' | 'audio' | 'imagen' | 'documento'
    contenido = Column(Text, nullable=True)  # Texto del mensaje o descripción del adjunto

    # Campos multimedia (con límite de 4 MB)
    archivo_url = Column(String(500), nullable=True)
    archivo_nombre = Column(String(255), nullable=True)
    archivo_tamano = Column(Integer, nullable=True)  # Tamaño en bytes (<= 4MB)
    archivo_tipo = Column(String(100), nullable=True)  # Mimetype: 'audio/webm', 'image/jpeg', 'application/pdf'
    duracion_audio = Column(Float, nullable=True)  # Duración en segundos para notas de voz

    # Relaciones
    canal = relationship("ChatCanal", back_populates="mensajes", lazy="selectin")
    remitente = relationship("Usuario", lazy="selectin")
    sucursal = relationship("Sucursal", lazy="selectin")

    __table_args__ = (
        Index("idx_chat_mensajes_created", "created_at"),
        Index("idx_chat_mensajes_canal_created", "canal_id", "created_at"),
    )
