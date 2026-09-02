import httpx
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class BcvRateService:
    @staticmethod
    async def get_live_rate() -> Dict[str, Any]:
        """
        Obtiene la tasa oficial de cambio USD/VED del BCV utilizando triple cascada de proveedores.
        """
        async with httpx.AsyncClient(timeout=8.0) as client:
            # Proveedor 1: ve.dolarapi.com
            try:
                r1 = await client.get("https://ve.dolarapi.com/v1/dolares/oficial")
                if r1.status_code == 200:
                    data = r1.json()
                    rate = data.get("promedio") or data.get("venta") or data.get("compra")
                    if rate and float(rate) > 0:
                        return {
                            "rate": round(float(rate), 4),
                            "fuente": "DolarAPI Oficial (BCV)",
                            "fecha_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "moneda_base": "USD",
                            "moneda_destino": "VED",
                            "exitoso": True
                        }
            except Exception as e:
                logger.warning(f"Error consultando DolarAPI: {e}")

            # Proveedor 2: pydolarve.org
            try:
                r2 = await client.get("https://pydolarve.org/api/v1/dollar?page=bcv")
                if r2.status_code == 200:
                    data = r2.json()
                    rate = (data.get("moneda", {}).get("usd", {}).get("promedio") or
                            data.get("price"))
                    if rate and float(rate) > 0:
                        return {
                            "rate": round(float(rate), 4),
                            "fuente": "PyDolarVE (BCV)",
                            "fecha_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "moneda_base": "USD",
                            "moneda_destino": "VED",
                            "exitoso": True
                        }
            except Exception as e:
                logger.warning(f"Error consultando PyDolarVE: {e}")

            # Proveedor 3: bcv-api fallback
            try:
                r3 = await client.get("https://bcv-api.uiconsulting.com.ve/api/v1/dolar")
                if r3.status_code == 200:
                    data = r3.json()
                    rate = data.get("rate") or data.get("monto")
                    if rate and float(rate) > 0:
                        return {
                            "rate": round(float(rate), 4),
                            "fuente": "BCV-API Contingencia",
                            "fecha_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            "moneda_base": "USD",
                            "moneda_destino": "VED",
                            "exitoso": True
                        }
            except Exception as e:
                logger.warning(f"Error consultando BCV-API fallback: {e}")

        # Fallback de seguridad en caso de fallo de conexión de red
        return {
            "rate": 36.50,
            "fuente": "Tasa Referencial Estática (Offline)",
            "fecha_actualizacion": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "moneda_base": "USD",
            "moneda_destino": "VED",
            "exitoso": False
        }
