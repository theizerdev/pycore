from sqlalchemy import Column, String, Boolean, Float, Integer
from app.core.database import Base
from app.models.base import TimestampMixin

class Pais(Base, TimestampMixin):
    __tablename__ = "pais"

    nombre = Column(String(100), nullable=False, index=True)
    codigo_iso2 = Column(String(2), unique=True, index=True, nullable=False)  # Ej: MX, VE, CO, AR, US
    codigo_iso3 = Column(String(3), unique=True, index=True, nullable=False)  # Ej: MEX, VEN, COL, ARG, USA
    codigo_telefonico = Column(String(10), nullable=True)                     # Ej: +52, +58, +57, +1
    moneda_principal = Column(String(10), nullable=True)                      # USD, VES, COP, MXN, ARS, EUR
    idioma_principal = Column(String(10), nullable=True)                      # es, en, pt
    continente = Column(String(50), nullable=True)                            # América del Norte, América del Sur, Europa, etc.
    latitud = Column(Float, nullable=True)
    longitud = Column(Float, nullable=True)
    zona_horaria = Column(String(50), nullable=True)                          # America/Mexico_City, America/Caracas, etc.
    formato_fecha = Column(String(20), default="dd/mm/yyyy", nullable=True)
    formato_moneda = Column(String(20), default="1.234,56", nullable=True)
    impuesto_predeterminado = Column(Float, default=0.00, nullable=True)
    separador_miles = Column(String(1), default=".", nullable=True)
    separador_decimales = Column(String(1), default=",", nullable=True)
    decimales_moneda = Column(Integer, default=2, nullable=True)
    activo = Column(Boolean, default=True, nullable=False)

    @property
    def simbolo_moneda(self) -> str:
        simbolos = {
            "VES": "Bs.",
            "EUR": "€",
            "COP": "$",
            "MXN": "$",
            "USD": "$",
            "ARS": "$",
            "CLP": "$",
            "PEN": "S/",
            "BRL": "R$",
            "GBP": "£"
        }
        return simbolos.get(self.moneda_principal, "$")
