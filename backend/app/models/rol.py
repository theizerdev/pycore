from sqlalchemy import Column, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin
from app.models.permiso import rol_permisos

class Rol(Base, TimestampMixin):
    __tablename__ = "roles"

    nombre = Column(String(100), nullable=False, unique=True, index=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    descripcion = Column(Text, nullable=True)
    es_sistema = Column(Boolean, default=False, nullable=False) # Roles no eliminables como superadmin
    activo = Column(Boolean, default=True, nullable=False)

    # Relaciones
    permisos = relationship("Permiso", secondary=rol_permisos, back_populates="roles", lazy="selectin")
    usuarios = relationship("Usuario", back_populates="rol")
