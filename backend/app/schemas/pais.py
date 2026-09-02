from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class PaisBase(BaseModel):
    nombre: str = Field(..., max_length=100, description="Nombre oficial del país")
    codigo_iso2: str = Field(..., min_length=2, max_length=2, description="Código ISO 3166-1 alpha-2 (ej. MX, VE, US)")
    codigo_iso3: str = Field(..., min_length=3, max_length=3, description="Código ISO 3166-1 alpha-3 (ej. MEX, VEN, USA)")
    codigo_telefonico: Optional[str] = Field(None, max_length=10, description="Prefijo telefónico internacional (ej. +52, +58)")
    moneda_principal: Optional[str] = Field(None, max_length=10, description="Código de moneda ISO (ej. MXN, USD, VES)")
    idioma_principal: Optional[str] = Field(None, max_length=10, description="Código de idioma principal (ej. es, en, pt)")
    continente: Optional[str] = Field(None, max_length=50, description="Continente (ej. América del Norte, América del Sur)")
    latitud: Optional[float] = Field(None, description="Latitud geográfica central")
    longitud: Optional[float] = Field(None, description="Longitud geográfica central")
    zona_horaria: Optional[str] = Field(None, max_length=50, description="Zona horaria principal (ej. America/Mexico_City)")
    formato_fecha: Optional[str] = Field("dd/mm/yyyy", max_length=20, description="Formato de fecha preferido")
    formato_moneda: Optional[str] = Field("1.234,56", max_length=20, description="Formato visual de moneda")
    impuesto_predeterminado: Optional[float] = Field(0.00, description="Porcentaje de impuesto predeterminado (IVA, etc.)")
    separador_miles: Optional[str] = Field(".", max_length=1, description="Separador de miles (. o ,)")
    separador_decimales: Optional[str] = Field(",", max_length=1, description="Separador de decimales (, o .)")
    decimales_moneda: Optional[int] = Field(2, description="Cantidad de decimales para importes")
    activo: Optional[bool] = Field(True, description="Estado activo o inactivo del país")

class PaisCreate(PaisBase):
    pass

class PaisUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    codigo_iso2: Optional[str] = Field(None, min_length=2, max_length=2)
    codigo_iso3: Optional[str] = Field(None, min_length=3, max_length=3)
    codigo_telefonico: Optional[str] = Field(None, max_length=10)
    moneda_principal: Optional[str] = Field(None, max_length=10)
    idioma_principal: Optional[str] = Field(None, max_length=10)
    continente: Optional[str] = Field(None, max_length=50)
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    zona_horaria: Optional[str] = Field(None, max_length=50)
    formato_fecha: Optional[str] = Field(None, max_length=20)
    formato_moneda: Optional[str] = Field(None, max_length=20)
    impuesto_predeterminado: Optional[float] = None
    separador_miles: Optional[str] = Field(None, max_length=1)
    separador_decimales: Optional[str] = Field(None, max_length=1)
    decimales_moneda: Optional[int] = None
    activo: Optional[bool] = None

class PaisResponse(PaisBase):
    id: int
    simbolo_moneda: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
