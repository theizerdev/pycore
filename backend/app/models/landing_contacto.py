from sqlalchemy import Column, Integer, String, Text, Boolean
from app.core.database import Base
from app.models.base import TimestampMixin

class MensajeContactoLanding(Base, TimestampMixin):
    __tablename__ = "landing_contactos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    telefono = Column(String(50), nullable=True)
    institucion = Column(String(150), nullable=True)  # Clínica, consultorio o especialidad
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False, nullable=False)
