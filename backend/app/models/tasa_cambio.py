from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class TasaCambio(Base):
    __tablename__ = "tasas_cambio"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    moneda_origen = Column(String(10), nullable=False, index=True)  # USD, EUR, USDT
    moneda_destino = Column(String(10), default="VES", nullable=False) # VES / Bs.
    tasa = Column(Float, nullable=False)
    fuente = Column(String(100), nullable=False) # BCV Oficial, BCV Euro, Binance P2P, Manual
    variacion_24h = Column(Float, nullable=True) # % de variación con respecto a la tasa anterior
    variacion_mes = Column(Float, nullable=True) # % de variación con respecto al inicio de mes
    es_oficial = Column(Boolean, default=True, nullable=False)
    fecha_tasa = Column(DateTime, default=datetime.now, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # Relaciones
    empresa = relationship("Empresa", lazy="selectin")
    usuario = relationship("Usuario", lazy="selectin")
