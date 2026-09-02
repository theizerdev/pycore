from sqlalchemy import Column, String, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class AuditoriaLog(Base, TimestampMixin):
    __tablename__ = "auditoria_logs"

    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="SET NULL"), nullable=True, index=True)
    accion = Column(String(100), nullable=False, index=True) # LOGIN, LOGOUT, CREAR, ACTUALIZAR, ELIMINAR, CAMBIO_PASSWORD
    modulo = Column(String(50), nullable=False, index=True)  # auth, usuarios, roles, empresas, sucursales, etc.
    ip = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    detalles = Column(JSON, nullable=True)

    usuario = relationship("Usuario", lazy="selectin")
    empresa = relationship("Empresa", lazy="selectin")
