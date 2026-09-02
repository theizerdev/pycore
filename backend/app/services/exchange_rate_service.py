import httpx
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.models.tasa_cambio import TasaCambio
from app.models.empresa import Empresa

logger = logging.getLogger(__name__)

class ExchangeRateService:
    @staticmethod
    async def fetch_usd_bcv() -> Optional[Dict[str, Any]]:
        """Consulta la tasa oficial del Dólar BCV con triple fallback."""
        # 1. ve.dolarapi.com
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.get("https://ve.dolarapi.com/v1/dolares/oficial")
                if r.status_code == 200:
                    data = r.json()
                    rate = data.get("promedio") or data.get("venta") or data.get("compra")
                    if rate and float(rate) > 0:
                        return {
                            "moneda": "USD",
                            "tasa": round(float(rate), 4),
                            "fuente": "BCV Oficial (DolarAPI)",
                            "fecha_oficial": data.get("fechaActualizacion")
                        }
        except Exception as e:
            logger.warning(f"Error consultando DolarAPI USD: {e}")

        # 2. pydolarve fallback
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.get("https://pydolarve.org/api/v1/dollar?page=bcv")
                if r.status_code == 200:
                    data = r.json()
                    rate = data.get("moneda", {}).get("usd", {}).get("promedio") or data.get("price")
                    if rate and float(rate) > 0:
                        return {
                            "moneda": "USD",
                            "tasa": round(float(rate), 4),
                            "fuente": "BCV Oficial (PyDolarVe)",
                            "fecha_oficial": None
                        }
        except Exception as e:
            logger.warning(f"Error consultando PyDolarVe USD: {e}")

        # 3. bcv-api fallback
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.get("https://bcv-api.uiconsulting.com.ve/api/v1/dolar")
                if r.status_code == 200:
                    data = r.json()
                    rate = data.get("rate") or data.get("monto")
                    if rate and float(rate) > 0:
                        return {
                            "moneda": "USD",
                            "tasa": round(float(rate), 4),
                            "fuente": "BCV Oficial (BCV-API)",
                            "fecha_oficial": None
                        }
        except Exception as e:
            logger.warning(f"Error consultando BCV-API USD: {e}")

        return None

    @staticmethod
    async def fetch_eur_bcv() -> Optional[Dict[str, Any]]:
        """Consulta la tasa oficial del Euro BCV."""
        # 1. ve.dolarapi.com
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.get("https://ve.dolarapi.com/v1/euros/oficial")
                if r.status_code == 200:
                    data = r.json()
                    rate = data.get("promedio") or data.get("venta") or data.get("compra")
                    if rate and float(rate) > 0:
                        return {
                            "moneda": "EUR",
                            "tasa": round(float(rate), 4),
                            "fuente": "BCV Oficial Euro (DolarAPI)",
                            "fecha_oficial": data.get("fechaActualizacion")
                        }
        except Exception as e:
            logger.warning(f"Error consultando DolarAPI EUR: {e}")

        # 2. pydolarve fallback
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.get("https://pydolarve.org/api/v1/euro?page=bcv")
                if r.status_code == 200:
                    data = r.json()
                    rate = data.get("moneda", {}).get("eur", {}).get("promedio") or data.get("price")
                    if rate and float(rate) > 0:
                        return {
                            "moneda": "EUR",
                            "tasa": round(float(rate), 4),
                            "fuente": "BCV Oficial Euro (PyDolarVe)",
                            "fecha_oficial": None
                        }
        except Exception as e:
            logger.warning(f"Error consultando PyDolarVe EUR: {e}")

        return None

    @staticmethod
    async def fetch_usdt_binance() -> Optional[Dict[str, Any]]:
        """Consulta la tasa de cambio de USDT/VES en el mercado P2P de Binance."""
        # 1. Binance P2P API Pública
        try:
            async with httpx.AsyncClient(timeout=7.0) as client:
                payload = {
                    "asset": "USDT",
                    "fiat": "VES",
                    "merchantCheck": False,
                    "page": 1,
                    "payTypes": [],
                    "publisherType": None,
                    "rows": 5,
                    "tradeType": "BUY"
                }
                r = await client.post("https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", json=payload)
                if r.status_code == 200:
                    data = r.json().get("data", [])
                    prices = [float(item["adv"]["price"]) for item in data if "adv" in item and "price" in item["adv"]]
                    if prices:
                        avg_price = sum(prices) / len(prices)
                        return {
                            "moneda": "USDT",
                            "tasa": round(float(avg_price), 4),
                            "fuente": "Binance P2P (USDT/VES)",
                            "precios_muestra": prices[:3]
                        }
        except Exception as e:
            logger.warning(f"Error consultando Binance P2P: {e}")

        # 2. DolarAPI Paralelo/USDT fallback
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                r = await client.get("https://ve.dolarapi.com/v1/dolares/paralelo")
                if r.status_code == 200:
                    data = r.json()
                    rate = data.get("promedio") or data.get("venta")
                    if rate and float(rate) > 0:
                        return {
                            "moneda": "USDT",
                            "tasa": round(float(rate), 4),
                            "fuente": "Mercado Paralelo/USDT (DolarAPI)",
                            "fecha_oficial": data.get("fechaActualizacion")
                        }
        except Exception as e:
            logger.warning(f"Error consultando Paralelo USDT: {e}")

        return None

    @classmethod
    async def get_current_rates(cls, empresa_id: int, db: AsyncSession) -> Dict[str, Any]:
        """Obtiene las tasas activas más recientes para USD, EUR y USDT guardadas en BD."""
        monedas = ["USD", "EUR", "USDT"]
        rates_dict = {}

        for m in monedas:
            stmt = select(TasaCambio).where(
                TasaCambio.empresa_id == empresa_id,
                TasaCambio.moneda_origen == m
            ).order_by(desc(TasaCambio.created_at)).limit(1)
            res = await db.execute(stmt)
            tasa = res.scalar_one_or_none()
            if tasa:
                rates_dict[m] = {
                    "id": tasa.id,
                    "moneda": tasa.moneda_origen,
                    "destino": tasa.moneda_destino,
                    "tasa": tasa.tasa,
                    "fuente": tasa.fuente,
                    "variacion_24h": tasa.variacion_24h,
                    "fecha_tasa": tasa.fecha_tasa.isoformat() if tasa.fecha_tasa else None,
                    "created_at": tasa.created_at.isoformat() if tasa.created_at else None,
                    "es_oficial": tasa.es_oficial,
                }
            else:
                rates_dict[m] = None

        # Si alguna tasa no existe en BD, sincronizar automáticamente
        if not rates_dict.get("USD") or not rates_dict.get("EUR") or not rates_dict.get("USDT"):
            return await cls.sync_all_rates(empresa_id, db)

        return {
            "tasas": rates_dict,
            "sincronizado_at": datetime.now().isoformat()
        }

    @classmethod
    async def sync_all_rates(
        cls,
        empresa_id: int,
        db: AsyncSession,
        usuario_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Sincroniza en vivo las 3 divisas, calcula variación 24h, almacena en DB y actualiza Empresa."""
        usd_info = await cls.fetch_usd_bcv()
        eur_info = await cls.fetch_eur_bcv()
        usdt_info = await cls.fetch_usdt_binance()

        now = datetime.now()
        rates_res = {}

        # 1. Procesar USD
        if usd_info:
            var_usd = await cls._compute_variation(empresa_id, "USD", usd_info["tasa"], db)
            tasa_usd = TasaCambio(
                empresa_id=empresa_id,
                moneda_origen="USD",
                moneda_destino="VES",
                tasa=usd_info["tasa"],
                fuente=usd_info["fuente"],
                variacion_24h=var_usd,
                es_oficial=True,
                fecha_tasa=now,
                usuario_id=usuario_id,
                created_at=now
            )
            db.add(tasa_usd)
            rates_res["USD"] = {
                "moneda": "USD",
                "destino": "VES",
                "tasa": usd_info["tasa"],
                "fuente": usd_info["fuente"],
                "variacion_24h": var_usd,
                "fecha_tasa": now.isoformat(),
                "created_at": now.isoformat(),
                "es_oficial": True
            }

            # Actualizar caché en la empresa
            empresa_stmt = select(Empresa).where(Empresa.id == empresa_id)
            emp_res = await db.execute(empresa_stmt)
            emp = emp_res.scalar_one_or_none()
            if emp:
                emp.bcv_rate_cached = usd_info["tasa"]
                emp.bcv_rate_updated_at = now

        # 2. Procesar EUR
        if eur_info:
            var_eur = await cls._compute_variation(empresa_id, "EUR", eur_info["tasa"], db)
            tasa_eur = TasaCambio(
                empresa_id=empresa_id,
                moneda_origen="EUR",
                moneda_destino="VES",
                tasa=eur_info["tasa"],
                fuente=eur_info["fuente"],
                variacion_24h=var_eur,
                es_oficial=True,
                fecha_tasa=now,
                usuario_id=usuario_id,
                created_at=now
            )
            db.add(tasa_eur)
            rates_res["EUR"] = {
                "moneda": "EUR",
                "destino": "VES",
                "tasa": eur_info["tasa"],
                "fuente": eur_info["fuente"],
                "variacion_24h": var_eur,
                "fecha_tasa": now.isoformat(),
                "created_at": now.isoformat(),
                "es_oficial": True
            }

        # 3. Procesar USDT
        if usdt_info:
            var_usdt = await cls._compute_variation(empresa_id, "USDT", usdt_info["tasa"], db)
            tasa_usdt = TasaCambio(
                empresa_id=empresa_id,
                moneda_origen="USDT",
                moneda_destino="VES",
                tasa=usdt_info["tasa"],
                fuente=usdt_info["fuente"],
                variacion_24h=var_usdt,
                es_oficial=False,
                fecha_tasa=now,
                usuario_id=usuario_id,
                created_at=now
            )
            db.add(tasa_usdt)
            rates_res["USDT"] = {
                "moneda": "USDT",
                "destino": "VES",
                "tasa": usdt_info["tasa"],
                "fuente": usdt_info["fuente"],
                "variacion_24h": var_usdt,
                "fecha_tasa": now.isoformat(),
                "created_at": now.isoformat(),
                "es_oficial": False
            }

        await db.commit()

        return {
            "status": "success",
            "message": "Tasas actualizadas exitosamente desde BCV y Binance",
            "tasas": rates_res,
            "sincronizado_at": now.isoformat()
        }

    @classmethod
    async def record_manual_rate(
        cls,
        empresa_id: int,
        moneda: str,
        tasa_valor: float,
        db: AsyncSession,
        usuario_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Permite a un administrador registrar manualmente una tasa personalizada."""
        now = datetime.now()
        var = await cls._compute_variation(empresa_id, moneda.upper(), tasa_valor, db)
        
        tasa_obj = TasaCambio(
            empresa_id=empresa_id,
            moneda_origen=moneda.upper(),
            moneda_destino="VES",
            tasa=round(tasa_valor, 4),
            fuente="Ajuste Manual / Clínica",
            variacion_24h=var,
            es_oficial=(moneda.upper() in ["USD", "EUR"]),
            fecha_tasa=now,
            usuario_id=usuario_id,
            created_at=now
        )
        db.add(tasa_obj)

        if moneda.upper() == "USD":
            empresa_stmt = select(Empresa).where(Empresa.id == empresa_id)
            emp_res = await db.execute(empresa_stmt)
            emp = emp_res.scalar_one_or_none()
            if emp:
                emp.bcv_rate_cached = round(tasa_valor, 4)
                emp.bcv_rate_updated_at = now

        await db.commit()
        await db.refresh(tasa_obj)

        return {
            "id": tasa_obj.id,
            "moneda": tasa_obj.moneda_origen,
            "tasa": tasa_obj.tasa,
            "fuente": tasa_obj.fuente,
            "variacion_24h": tasa_obj.variacion_24h,
            "fecha_tasa": tasa_obj.fecha_tasa.isoformat(),
            "created_at": tasa_obj.created_at.isoformat()
        }

    @classmethod
    async def get_history(
        cls,
        empresa_id: int,
        db: AsyncSession,
        moneda: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Devuelve el histórico de tasas de cambio ordenado de forma descendente."""
        stmt = select(TasaCambio).where(TasaCambio.empresa_id == empresa_id)
        if moneda and moneda.upper() != "TODOS":
            stmt = stmt.where(TasaCambio.moneda_origen == moneda.upper())
        
        stmt = stmt.order_by(desc(TasaCambio.created_at)).limit(limit)
        res = await db.execute(stmt)
        registros = res.scalars().all()

        return [
            {
                "id": r.id,
                "moneda": r.moneda_origen,
                "destino": r.moneda_destino,
                "tasa": r.tasa,
                "fuente": r.fuente,
                "variacion_24h": r.variacion_24h,
                "es_oficial": r.es_oficial,
                "fecha_tasa": r.fecha_tasa.isoformat() if r.fecha_tasa else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "usuario": r.usuario.nombre if r.usuario else "Sistema Automático",
            }
            for r in registros
        ]

    @staticmethod
    async def _compute_variation(
        empresa_id: int,
        moneda: str,
        nueva_tasa: float,
        db: AsyncSession
    ) -> Optional[float]:
        """Calcula el porcentaje de variación respecto al último valor registrado."""
        stmt = select(TasaCambio).where(
            TasaCambio.empresa_id == empresa_id,
            TasaCambio.moneda_origen == moneda
        ).order_by(desc(TasaCambio.created_at)).limit(1)
        res = await db.execute(stmt)
        anterior = res.scalar_one_or_none()

        if anterior and anterior.tasa and anterior.tasa > 0:
            var = ((nueva_tasa - anterior.tasa) / anterior.tasa) * 100
            return round(var, 2)
        return 0.0
