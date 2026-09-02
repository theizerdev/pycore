from sqlalchemy import Column, String, Text, Table, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

rol_permisos = Table(
    "rol_permisos",
    Base.metadata,
    Column("rol_id", Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permiso_id", Integer, ForeignKey("permisos.id", ondelete="CASCADE"), primary_key=True)
)

class Permiso(Base, TimestampMixin):
    __tablename__ = "permisos"

    sector = Column(String(50), nullable=False, default="seguridad", index=True) # seguridad, clinico, turnero, teleconsulta, reportes
    modulo = Column(String(50), nullable=False, index=True) # usuarios, empresas, sucursales, pacientes, citas, consultas, turnero, auditoria
    accion = Column(String(50), nullable=False) # ver, crear, editar, eliminar, exportar, llamar, etc.
    slug = Column(String(100), unique=True, nullable=False, index=True) # usuarios.crear, pacientes.ver
    descripcion = Column(Text, nullable=True)

    roles = relationship("Rol", secondary=rol_permisos, back_populates="permisos")
