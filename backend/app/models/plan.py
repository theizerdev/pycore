from sqlalchemy import Column, String, Boolean, Text, Float, Integer, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.base import TimestampMixin

class Plan(Base, TimestampMixin):
    __tablename__ = "planes"

    nombre = Column(String(100), nullable=False) # ej: "Gratuito", "Profesional", "Enterprise"
    codigo = Column(String(50), nullable=False, unique=True, index=True) # ej: "free", "pro", "enterprise"
    descripcion = Column(Text, nullable=True)
    
    # Tarifas por Ciclo de Duración
    precio_regular_mensual = Column(Float, default=0.0, nullable=False)
    precio_promocional_mensual = Column(Float, default=0.0, nullable=False)
    precio_3_meses = Column(Float, default=0.0, nullable=False)
    precio_6_meses = Column(Float, default=0.0, nullable=False)
    precio_12_meses = Column(Float, default=0.0, nullable=False)
    precio_mensual = Column(Float, default=0.0, nullable=False) # Compatibilidad
    precio_anual = Column(Float, default=0.0, nullable=False) # Compatibilidad

    # Configuración de Sucursales Extra
    sucursales_incluidas = Column(Integer, default=1, nullable=False)
    precio_sucursal_extra_mensual = Column(Float, default=15.0, nullable=False)

    # Límites de Recursos
    max_usuarios = Column(Integer, default=3, nullable=False) # 999 para ilimitado
    max_sucursales = Column(Integer, default=1, nullable=False)
    max_mensajes_whatsapp = Column(Integer, default=100, nullable=False)

    # Promociones & Presentación
    tiene_promocion = Column(Boolean, default=False, nullable=False)
    badge_promocion = Column(String(50), nullable=True) # ej: "AHORRA 20%", "OFERTA VIP"
    destacado = Column(Boolean, default=False, nullable=False)
    orden = Column(Integer, default=1, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)

    # Módulos Autorizados
    modulos_permitidos = Column(JSON, nullable=True) # ["dashboard", "pacientes", "citas", "whatsapp", "tasas", "auditoria"]
    
    # Relaciones
    empresas = relationship("Empresa", back_populates="plan")

    @property
    def precio_mensual_efectivo(self) -> float:
        if self.tiene_promocion and self.precio_promocional_mensual > 0:
            return self.precio_promocional_mensual
        if self.precio_regular_mensual > 0:
            return self.precio_regular_mensual
        return self.precio_mensual or 0.0

    def calcular_precio(self, meses: int = 1, total_sucursales: int = 1, aplicar_promo: bool = False) -> float:
        """Calcula el costo total para un número de meses y sucursales (con costo extra por sucursal adicional)."""
        meses = max(1, meses)
        
        # Determinar precio base mensual
        if meses == 12 and self.precio_12_meses > 0:
            base_price = self.precio_12_meses
        elif meses == 6 and self.precio_6_meses > 0:
            base_price = self.precio_6_meses
        elif meses == 3 and self.precio_3_meses > 0:
            base_price = self.precio_3_meses
        else:
            precio_unitario = self.precio_promocional_mensual if (aplicar_promo and self.tiene_promocion and self.precio_promocional_mensual > 0) else self.precio_mensual_efectivo
            base_price = precio_unitario * meses

        # Costo de sucursales adicionales
        precio_extra = self.precio_sucursal_extra_mensual if self.precio_sucursal_extra_mensual > 0 else 15.0
        sucursales_extra = max(0, total_sucursales - (self.sucursales_incluidas or 1))
        costo_sucursales_extra = sucursales_extra * precio_extra * meses

        return round(base_price + costo_sucursales_extra, 2)
