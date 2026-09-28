import logging
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func, and_

from app.models.caja import Caja, TurnoCaja, Cobro, CobroDetalle, CobroPago, MovimientoCaja
from app.models.cita import CitaMedica
from app.models.consulta import ConsultaMedica
from app.models.usuario import Usuario
from app.models.paciente import Paciente
from app.models.medico import Medico
from app.models.empresa import Empresa
from app.schemas.caja import (
    CajaCreate,
    CajaUpdate,
    TurnoAperturaRequest,
    TurnoCierreRequest,
    MovimientoCajaCreateRequest,
    CobroCreateRequest
)
from app.services.exchange_rate_service import ExchangeRateService

logger = logging.getLogger(__name__)


class CajaService:

    @staticmethod
    async def get_or_create_default_caja(empresa_id: int, sucursal_id: int, db: AsyncSession) -> Caja:
        """Garantiza que exista al menos una caja por defecto para la sucursal."""
        stmt = select(Caja).where(
            Caja.empresa_id == empresa_id,
            Caja.sucursal_id == sucursal_id,
            Caja.activa == True
        ).limit(1)
        res = await db.execute(stmt)
        caja = res.scalar_one_or_none()

        if not caja:
            caja = Caja(
                empresa_id=empresa_id,
                sucursal_id=sucursal_id,
                nombre="Caja Principal Recepción",
                descripcion="Caja principal de cobranza para citas, consultas y odontología",
                activa=True
            )
            db.add(caja)
            await db.commit()
            await db.refresh(caja)

        return caja

    @staticmethod
    async def get_cajas(empresa_id: int, sucursal_id: Optional[int], db: AsyncSession) -> List[Caja]:
        stmt = select(Caja).where(Caja.empresa_id == empresa_id)
        if sucursal_id:
            stmt = stmt.where(Caja.sucursal_id == sucursal_id)
        stmt = stmt.order_by(Caja.nombre)
        res = await db.execute(stmt)
        cajas = list(res.scalars().all())

        if not cajas and sucursal_id:
            default_caja = await CajaService.get_or_create_default_caja(empresa_id, sucursal_id, db)
            cajas = [default_caja]

        return cajas

    @staticmethod
    async def create_caja(empresa_id: int, data: CajaCreate, db: AsyncSession) -> Caja:
        caja = Caja(
            empresa_id=empresa_id,
            sucursal_id=data.sucursal_id,
            nombre=data.nombre.strip(),
            descripcion=data.descripcion.strip() if data.descripcion else None,
            activa=data.activa
        )
        db.add(caja)
        await db.commit()
        await db.refresh(caja)
        return caja

    @staticmethod
    async def get_active_turno(empresa_id: int, usuario_id: int, db: AsyncSession) -> Optional[TurnoCaja]:
        """Consulta si el usuario actual tiene un turno de caja abierto."""
        stmt = select(TurnoCaja).where(
            TurnoCaja.empresa_id == empresa_id,
            TurnoCaja.usuario_id == usuario_id,
            TurnoCaja.estado == "abierta"
        ).order_by(desc(TurnoCaja.apertura_at)).limit(1)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def open_turno(empresa_id: int, usuario_id: int, data: TurnoAperturaRequest, db: AsyncSession) -> TurnoCaja:
        """Abre un nuevo turno de caja con fondo inicial."""
        # Verificar si el usuario ya tiene un turno abierto
        existente = await CajaService.get_active_turno(empresa_id, usuario_id, db)
        if existente:
            return existente

        turno = TurnoCaja(
            empresa_id=empresa_id,
            sucursal_id=data.sucursal_id,
            caja_id=data.caja_id,
            usuario_id=usuario_id,
            apertura_at=datetime.utcnow(),
            estado="abierta",
            fondo_inicial_usd=data.fondo_inicial_usd,
            fondo_inicial_ves=data.fondo_inicial_ves,
            notas_apertura=data.notas_apertura
        )
        db.add(turno)
        await db.commit()
        await db.refresh(turno)
        return turno

    @staticmethod
    async def close_turno(
        empresa_id: int,
        turno_id: int,
        usuario_id: int,
        data: TurnoCierreRequest,
        db: AsyncSession
    ) -> TurnoCaja:
        """Cierra el turno de caja, calculando el arqueo y las diferencias."""
        stmt = select(TurnoCaja).where(
            TurnoCaja.id == turno_id,
            TurnoCaja.empresa_id == empresa_id,
            TurnoCaja.estado == "abierta"
        )
        res = await db.execute(stmt)
        turno = res.scalar_one_or_none()
        if not turno:
            raise ValueError("Turno de caja no encontrado o ya cerrado")

        now = datetime.utcnow()
        turno.cierre_at = now
        turno.estado = "cerrada"
        turno.arqueo_declarado_usd = data.arqueo_declarado_usd
        turno.arqueo_declarado_ves = data.arqueo_declarado_ves
        turno.notas_cierre = data.notas_cierre

        # Conteo esperado de efectivo = Fondo Inicial + Ingresos Efectivo - Egresos Efectivo
        # Para USD:
        esperado_usd = float(turno.fondo_inicial_usd) + float(turno.total_ingresos_usd) - float(turno.total_egresos_usd)
        # Para VES:
        esperado_ves = float(turno.fondo_inicial_ves) + float(turno.total_ingresos_ves) - float(turno.total_egresos_ves)

        turno.diferencia_usd = round(data.arqueo_declarado_usd - esperado_usd, 2)
        turno.diferencia_ves = round(data.arqueo_declarado_ves - esperado_ves, 2)

        await db.commit()
        await db.refresh(turno)
        return turno

    @staticmethod
    async def create_movimiento(
        empresa_id: int,
        usuario_id: int,
        data: MovimientoCajaCreateRequest,
        db: AsyncSession
    ) -> MovimientoCaja:
        """Registra un egreso o ingreso menor en caja chica."""
        stmt = select(TurnoCaja).where(
            TurnoCaja.id == data.turno_caja_id,
            TurnoCaja.empresa_id == empresa_id,
            TurnoCaja.estado == "abierta"
        )
        res = await db.execute(stmt)
        turno = res.scalar_one_or_none()
        if not turno:
            raise ValueError("El turno de caja no existe o no está abierto")

        mov = MovimientoCaja(
            empresa_id=empresa_id,
            sucursal_id=turno.sucursal_id,
            turno_caja_id=turno.id,
            usuario_id=usuario_id,
            tipo=data.tipo.lower(),
            concepto=data.concepto.strip(),
            moneda=data.moneda.upper(),
            monto=data.monto,
            comprobante_adjunto=data.comprobante_adjunto
        )
        db.add(mov)

        # Actualizar totales del turno
        if data.tipo.lower() == "egreso":
            if data.moneda.upper() == "USD":
                turno.total_egresos_usd = float(turno.total_egresos_usd) + float(data.monto)
            else:
                turno.total_egresos_ves = float(turno.total_egresos_ves) + float(data.monto)
        else:
            if data.moneda.upper() == "USD":
                turno.total_ingresos_usd = float(turno.total_ingresos_usd) + float(data.monto)
            else:
                turno.total_ingresos_ves = float(turno.total_ingresos_ves) + float(data.monto)

        await db.commit()
        await db.refresh(mov)
        return mov

    @staticmethod
    async def generate_numero_recibo(empresa_id: int, db: AsyncSession) -> str:
        """Genera un correlativo secuencial único para el recibo (ej. REC-2026-000001)."""
        year = datetime.utcnow().year
        stmt = select(func.count(Cobro.id)).where(
            Cobro.empresa_id == empresa_id,
            func.extract("year", Cobro.fecha_emision) == year
        )
        res = await db.execute(stmt)
        total_year = res.scalar() or 0
        return f"REC-{year}-{str(total_year + 1).zfill(6)}"

    @staticmethod
    async def create_cobro(
        empresa_id: int,
        usuario_id: int,
        data: CobroCreateRequest,
        db: AsyncSession
    ) -> Cobro:
        """Registra una transacción completa de cobro con soporte multimoneda y pago mixto."""
        # 1. Validar turno de caja abierto
        stmt_turno = select(TurnoCaja).where(
            TurnoCaja.id == data.turno_caja_id,
            TurnoCaja.empresa_id == empresa_id,
            TurnoCaja.estado == "abierta"
        )
        res_turno = await db.execute(stmt_turno)
        turno = res_turno.scalar_one_or_none()
        if not turno:
            raise ValueError("El turno de caja especificado no existe o ya ha sido cerrado")

        # 2. Obtener la tasa oficial de cobro activa en la empresa (USD o EUR)
        rate_info = await ExchangeRateService.get_active_billing_rate(empresa_id, db)
        moneda_ref = rate_info.get("moneda", "USD")
        tasa_bcv = float(rate_info.get("tasa", 1.0))
        fuente_tasa = rate_info.get("fuente", "BCV Oficial")

        # 3. Calcular subtotales de los conceptos/servicios
        subtotal_divisa = 0.0
        detalles_objs = []

        for d in data.detalles:
            subt_div = round(float(d.precio_unitario_divisa) * int(d.cantidad), 2)
            subt_ves = round(subt_div * tasa_bcv, 2)
            subtotal_divisa += subt_div

            detalles_objs.append(CobroDetalle(
                servicio_id=d.servicio_id,
                tipo_concepto=d.tipo_concepto,
                descripcion=d.descripcion.strip(),
                cantidad=d.cantidad,
                precio_unitario_divisa=d.precio_unitario_divisa,
                subtotal_divisa=subt_div,
                subtotal_ves=subt_ves,
                diente_fdi=d.diente_fdi
            ))

        descuento_divisa = round(float(data.descuento_divisa or 0.0), 2)
        total_divisa = max(0.0, round(subtotal_divisa - descuento_divisa, 2))
        total_ves = round(total_divisa * tasa_bcv, 2)

        # 4. Procesar desglose de pagos y equivalencias
        total_pagado_equivalente_divisa = 0.0
        pagos_objs = []

        for p in data.pagos:
            monto_orig = float(p.monto_moneda_origen)
            moneda_pago = p.moneda.upper()

            # Normalizar a la moneda de cobro de referencia
            if moneda_pago == moneda_ref:
                tasa_aplicada = 1.0
                monto_equiv = monto_orig
            elif moneda_pago == "VES":
                tasa_aplicada = tasa_bcv
                monto_equiv = round(monto_orig / tasa_bcv, 2) if tasa_bcv > 0 else 0.0
            else:
                # Conversión entre divisas extranjeras si difieren
                tasa_aplicada = 1.0
                monto_equiv = monto_orig

            total_pagado_equivalente_divisa += monto_equiv

            pagos_objs.append(CobroPago(
                metodo=p.metodo,
                moneda=moneda_pago,
                monto_moneda_origen=monto_orig,
                tasa_cambio=tasa_aplicada,
                monto_equivalente_divisa=monto_equiv,
                banco_origen=p.banco_origen,
                banco_destino=p.banco_destino,
                referencia=p.referencia,
                lote_punto=p.lote_punto,
                ultimos_digitos_tarjeta=p.ultimos_digitos_tarjeta,
                notas=p.notas
            ))

            # Si el pago fue en efectivo, sumar al arqueo de ingresos del turno
            if "efectivo" in p.metodo.lower():
                if moneda_pago == "USD":
                    turno.total_ingresos_usd = float(turno.total_ingresos_usd) + monto_orig
                elif moneda_pago == "EUR":
                    turno.total_ingresos_eur = float(turno.total_ingresos_eur) + monto_orig
                elif moneda_pago == "VES":
                    turno.total_ingresos_ves = float(turno.total_ingresos_ves) + monto_orig

        # 5. Calcular vuelto (si el pago supera el total)
        vuelto_divisa = max(0.0, round(total_pagado_equivalente_divisa - total_divisa, 2))
        vuelto_ves = round(vuelto_divisa * tasa_bcv, 2)

        numero_recibo = await CajaService.generate_numero_recibo(empresa_id, db)

        # 6. Crear entidad principal Cobro
        cobro = Cobro(
            empresa_id=empresa_id,
            sucursal_id=data.sucursal_id,
            turno_caja_id=data.turno_caja_id,
            cajero_id=usuario_id,
            paciente_id=data.paciente_id,
            medico_id=data.medico_id,
            cita_id=data.cita_id,
            consulta_id=data.consulta_id,
            numero_recibo=numero_recibo,
            fecha_emision=datetime.utcnow(),
            moneda_referencia=moneda_ref,
            tasa_bcv_aplicada=tasa_bcv,
            fuente_tasa=fuente_tasa,
            subtotal_divisa=subtotal_divisa,
            descuento_divisa=descuento_divisa,
            total_divisa=total_divisa,
            total_ves=total_ves,
            monto_pagado_divisa=round(total_pagado_equivalente_divisa, 2),
            monto_vuelto_divisa=vuelto_divisa,
            monto_vuelto_ves=vuelto_ves,
            estado="completado",
            notas=data.notas,
            detalles=detalles_objs,
            pagos=pagos_objs
        )
        db.add(cobro)

        # 7. Si está vinculado a una Cita Médica, marcar como pagada
        if data.cita_id:
            stmt_cita = select(CitaMedica).where(
                CitaMedica.id == data.cita_id,
                CitaMedica.empresa_id == empresa_id
            )
            res_cita = await db.execute(stmt_cita)
            cita = res_cita.scalar_one_or_none()
            if cita:
                cita.estado_pago = "pagado"
                cita.metodo_pago = data.pagos[0].metodo if len(data.pagos) == 1 else "mixto"

        # 8. Si está vinculado a una Consulta Médica (o la cita tiene consulta vinculada), marcar como pagada
        consulta_obj = None
        if data.consulta_id:
            stmt_cons = select(ConsultaMedica).where(
                ConsultaMedica.id == data.consulta_id,
                ConsultaMedica.empresa_id == empresa_id
            )
            res_cons = await db.execute(stmt_cons)
            consulta_obj = res_cons.scalar_one_or_none()
        elif data.cita_id:
            stmt_cons = select(ConsultaMedica).where(
                ConsultaMedica.cita_id == data.cita_id,
                ConsultaMedica.empresa_id == empresa_id
            )
            res_cons = await db.execute(stmt_cons)
            consulta_obj = res_cons.scalar_one_or_none()

        if consulta_obj:
            consulta_obj.estado_pago = "pagado"

        await db.commit()
        await db.refresh(cobro)
        return cobro

    @staticmethod
    async def get_cobros(
        empresa_id: int,
        sucursal_id: Optional[int] = None,
        paciente_id: Optional[int] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        limit: int = 50,
        db: AsyncSession = None
    ) -> List[Cobro]:
        """Consulta historial de cobros con filtros."""
        stmt = select(Cobro).where(Cobro.empresa_id == empresa_id)
        if sucursal_id:
            stmt = stmt.where(Cobro.sucursal_id == sucursal_id)
        if paciente_id:
            stmt = stmt.where(Cobro.paciente_id == paciente_id)
        if fecha_desde:
            stmt = stmt.where(func.date(Cobro.fecha_emision) >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(func.date(Cobro.fecha_emision) <= fecha_hasta)

        stmt = stmt.order_by(desc(Cobro.fecha_emision)).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_cobro_by_id(empresa_id: int, cobro_id: int, db: AsyncSession) -> Optional[Cobro]:
        stmt = select(Cobro).where(
            Cobro.id == cobro_id,
            Cobro.empresa_id == empresa_id
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def anular_cobro(
        empresa_id: int,
        cobro_id: int,
        usuario_id: int,
        motivo: str,
        db: AsyncSession
    ) -> Cobro:
        """Anula un cobro y revierte el estado de pago de la cita asociada."""
        cobro = await CajaService.get_cobro_by_id(empresa_id, cobro_id, db)
        if not cobro:
            raise ValueError("Cobro no encontrado")
        if cobro.estado == "anulado":
            return cobro

        cobro.estado = "anulado"
        cobro.motivo_anulacion = motivo.strip()
        cobro.anulado_at = datetime.utcnow()
        cobro.anulado_por_id = usuario_id

        # Revertir cita si existe
        if cobro.cita_id:
            stmt_cita = select(CitaMedica).where(
                CitaMedica.id == cobro.cita_id,
                CitaMedica.empresa_id == empresa_id
            )
            res_cita = await db.execute(stmt_cita)
            cita = res_cita.scalar_one_or_none()
            if cita:
                cita.estado_pago = "pendiente"

        # Revertir consulta si existe
        consulta_to_revert = None
        if cobro.consulta_id:
            stmt_cons = select(ConsultaMedica).where(
                ConsultaMedica.id == cobro.consulta_id,
                ConsultaMedica.empresa_id == empresa_id
            )
            res_cons = await db.execute(stmt_cons)
            consulta_to_revert = res_cons.scalar_one_or_none()
        elif cobro.cita_id:
            stmt_cons = select(ConsultaMedica).where(
                ConsultaMedica.cita_id == cobro.cita_id,
                ConsultaMedica.empresa_id == empresa_id
            )
            res_cons = await db.execute(stmt_cons)
            consulta_to_revert = res_cons.scalar_one_or_none()

        if consulta_to_revert:
            consulta_to_revert.estado_pago = "pendiente"

        await db.commit()
        await db.refresh(cobro)
        return cobro

    @staticmethod
    async def get_turnos(
        empresa_id: int,
        sucursal_id: Optional[int] = None,
        caja_id: Optional[int] = None,
        estado: Optional[str] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        limit: int = 50,
        db: AsyncSession = None
    ) -> List[TurnoCaja]:
        """Consulta historial de turnos y arqueos de caja."""
        stmt = select(TurnoCaja).where(TurnoCaja.empresa_id == empresa_id)
        if sucursal_id:
            stmt = stmt.where(TurnoCaja.sucursal_id == sucursal_id)
        if caja_id:
            stmt = stmt.where(TurnoCaja.caja_id == caja_id)
        if estado:
            stmt = stmt.where(TurnoCaja.estado == estado)
        if fecha_desde:
            stmt = stmt.where(func.date(TurnoCaja.apertura_at) >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(func.date(TurnoCaja.apertura_at) <= fecha_hasta)

        stmt = stmt.order_by(desc(TurnoCaja.apertura_at)).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_movimientos(
        empresa_id: int,
        sucursal_id: Optional[int] = None,
        turno_caja_id: Optional[int] = None,
        tipo: Optional[str] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        limit: int = 100,
        db: AsyncSession = None
    ) -> List[MovimientoCaja]:
        """Consulta historial de movimientos menores (entradas y salidas de efectivo)."""
        stmt = select(MovimientoCaja).where(MovimientoCaja.empresa_id == empresa_id)
        if sucursal_id:
            stmt = stmt.where(MovimientoCaja.sucursal_id == sucursal_id)
        if turno_caja_id:
            stmt = stmt.where(MovimientoCaja.turno_caja_id == turno_caja_id)
        if tipo:
            stmt = stmt.where(MovimientoCaja.tipo == tipo.lower())
        if fecha_desde:
            stmt = stmt.where(func.date(MovimientoCaja.created_at) >= fecha_desde)
        if fecha_hasta:
            stmt = stmt.where(func.date(MovimientoCaja.created_at) <= fecha_hasta)

        stmt = stmt.order_by(desc(MovimientoCaja.created_at)).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_resumen_analitico(
        empresa_id: int,
        sucursal_id: Optional[int] = None,
        turno_caja_id: Optional[int] = None,
        fecha_desde: Optional[date] = None,
        fecha_hasta: Optional[date] = None,
        db: AsyncSession = None
    ) -> Dict[str, Any]:
        """Calcula el resumen financiero consolidado: métodos de pago, conceptos y top servicios."""
        # 1. Cobros en rango
        stmt_cobros = select(Cobro).where(Cobro.empresa_id == empresa_id)
        if sucursal_id:
            stmt_cobros = stmt_cobros.where(Cobro.sucursal_id == sucursal_id)
        if turno_caja_id:
            stmt_cobros = stmt_cobros.where(Cobro.turno_caja_id == turno_caja_id)
        if fecha_desde:
            stmt_cobros = stmt_cobros.where(func.date(Cobro.fecha_emision) >= fecha_desde)
        if fecha_hasta:
            stmt_cobros = stmt_cobros.where(func.date(Cobro.fecha_emision) <= fecha_hasta)

        res_cobros = await db.execute(stmt_cobros)
        todos_cobros = list(res_cobros.scalars().all())

        cobros_completados = [c for c in todos_cobros if c.estado != "anulado"]
        cobros_anulados = [c for c in todos_cobros if c.estado == "anulado"]

        total_ventas_divisa = sum(float(c.total_divisa or 0) for c in cobros_completados)
        total_ventas_ves = sum(float(c.total_ves or 0) for c in cobros_completados)
        total_descuentos_divisa = sum(float(c.descuento_divisa or 0) for c in cobros_completados)

        # 2. Desglose por método de pago
        nombres_metodos = {
            "efectivo_usd": ("Efectivo Dólares ($)", "USD"),
            "efectivo_ves": ("Efectivo Bolívares (Bs.)", "VES"),
            "efectivo_eur": ("Efectivo Euros (€)", "EUR"),
            "pago_movil": ("Pago Móvil (VES)", "VES"),
            "punto_venta": ("Punto de Venta / Tarjeta", "VES"),
            "transferencia": ("Transferencia Bancaria", "VES"),
            "zelle": ("Zelle ($)", "USD"),
            "seguro_medico": ("Seguro Médico / Póliza", "USD"),
        }

        metodos_map: Dict[str, Dict[str, Any]] = {}
        for c in cobros_completados:
            for p in c.pagos:
                met = p.metodo or "otro"
                if met not in metodos_map:
                    nombre, mon_default = nombres_metodos.get(met, (met.replace("_", " ").title(), p.moneda or "USD"))
                    metodos_map[met] = {
                        "metodo": met,
                        "nombre_legible": nombre,
                        "moneda": p.moneda or mon_default,
                        "total_monto_origen": 0.0,
                        "total_equivalente_divisa": 0.0,
                        "cantidad_transacciones": 0,
                    }
                metodos_map[met]["total_monto_origen"] += float(p.monto_moneda_origen or 0)
                metodos_map[met]["total_equivalente_divisa"] += float(p.monto_equivalente_divisa or 0)
                metodos_map[met]["cantidad_transacciones"] += 1

        lista_metodos = []
        for m in metodos_map.values():
            pct = round((m["total_equivalente_divisa"] / total_ventas_divisa * 100), 1) if total_ventas_divisa > 0 else 0.0
            lista_metodos.append({
                **m,
                "total_monto_origen": round(m["total_monto_origen"], 2),
                "total_equivalente_divisa": round(m["total_equivalente_divisa"], 2),
                "porcentaje": pct
            })
        lista_metodos.sort(key=lambda x: x["total_equivalente_divisa"], reverse=True)

        # 3. Desglose por concepto
        nombres_conceptos = {
            "consulta": "Consultas Médicas",
            "odontologia": "Tratamientos Odontológicos",
            "servicio": "Servicios Clínicos Especializados",
            "estudio": "Estudios & Diagnósticos",
            "insumo": "Insumos & Medicamentos",
            "otro": "Otros Conceptos",
        }

        conceptos_map: Dict[str, Dict[str, Any]] = {}
        top_servicios_map: Dict[str, Dict[str, Any]] = {}

        for c in cobros_completados:
            for d in c.detalles:
                tipo = d.tipo_concepto or "servicio"
                if tipo not in conceptos_map:
                    conceptos_map[tipo] = {
                        "tipo_concepto": tipo,
                        "nombre_legible": nombres_conceptos.get(tipo, tipo.title()),
                        "total_divisa": 0.0,
                        "total_ves": 0.0,
                        "cantidad_items": 0,
                    }
                conceptos_map[tipo]["total_divisa"] += float(d.subtotal_divisa or 0)
                conceptos_map[tipo]["total_ves"] += float(d.subtotal_ves or 0)
                conceptos_map[tipo]["cantidad_items"] += int(d.cantidad or 1)

                desc = (d.descripcion or "Servicio").strip()
                if desc not in top_servicios_map:
                    top_servicios_map[desc] = {
                        "descripcion": desc,
                        "tipo_concepto": tipo,
                        "total_divisa": 0.0,
                        "cantidad": 0,
                    }
                top_servicios_map[desc]["total_divisa"] += float(d.subtotal_divisa or 0)
                top_servicios_map[desc]["cantidad"] += int(d.cantidad or 1)

        lista_conceptos = []
        for con in conceptos_map.values():
            pct = round((con["total_divisa"] / total_ventas_divisa * 100), 1) if total_ventas_divisa > 0 else 0.0
            lista_conceptos.append({
                **con,
                "total_divisa": round(con["total_divisa"], 2),
                "total_ves": round(con["total_ves"], 2),
                "porcentaje": pct
            })
        lista_conceptos.sort(key=lambda x: x["total_divisa"], reverse=True)

        # Top servicios
        top_servicios_lista = list(top_servicios_map.values())
        top_servicios_lista.sort(key=lambda x: x["total_divisa"], reverse=True)
        top_servicios_lista = [
            {**s, "total_divisa": round(s["total_divisa"], 2)}
            for s in top_servicios_lista[:10]
        ]

        # 4. Movimientos extraordinarios de efectivo
        stmt_movs = select(MovimientoCaja).where(MovimientoCaja.empresa_id == empresa_id)
        if sucursal_id:
            stmt_movs = stmt_movs.where(MovimientoCaja.sucursal_id == sucursal_id)
        if turno_caja_id:
            stmt_movs = stmt_movs.where(MovimientoCaja.turno_caja_id == turno_caja_id)
        if fecha_desde:
            stmt_movs = stmt_movs.where(func.date(MovimientoCaja.created_at) >= fecha_desde)
        if fecha_hasta:
            stmt_movs = stmt_movs.where(func.date(MovimientoCaja.created_at) <= fecha_hasta)

        res_movs = await db.execute(stmt_movs)
        movs = list(res_movs.scalars().all())

        total_ingresos_usd = sum(float(m.monto or 0) for m in movs if m.tipo == "ingreso" and m.moneda == "USD")
        total_egresos_usd = sum(float(m.monto or 0) for m in movs if m.tipo == "egreso" and m.moneda == "USD")
        total_ingresos_ves = sum(float(m.monto or 0) for m in movs if m.tipo == "ingreso" and m.moneda == "VES")
        total_egresos_ves = sum(float(m.monto or 0) for m in movs if m.tipo == "egreso" and m.moneda == "VES")

        return {
            "fecha_desde": str(fecha_desde) if fecha_desde else None,
            "fecha_hasta": str(fecha_hasta) if fecha_hasta else None,
            "total_ventas_divisa": round(total_ventas_divisa, 2),
            "total_ventas_ves": round(total_ventas_ves, 2),
            "total_cobros_count": len(cobros_completados),
            "total_cobros_anulados": len(cobros_anulados),
            "total_descuentos_divisa": round(total_descuentos_divisa, 2),
            "total_ingresos_extra_usd": round(total_ingresos_usd, 2),
            "total_egresos_extra_usd": round(total_egresos_usd, 2),
            "total_ingresos_extra_ves": round(total_ingresos_ves, 2),
            "total_egresos_extra_ves": round(total_egresos_ves, 2),
            "por_metodo_pago": lista_metodos,
            "por_concepto": lista_conceptos,
            "top_servicios": top_servicios_lista,
        }

