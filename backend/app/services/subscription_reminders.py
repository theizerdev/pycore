import logging
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import AsyncSessionLocal
from app.models import Empresa, Suscripcion, WhatsAppMessage
import httpx

logger = logging.getLogger(__name__)

TARGET_MILESTONE_DAYS = [10, 5, 3, 1, 0]

async def check_and_send_subscription_reminders():
    """
    Verifica el estado de las suscripciones de todas las empresas inquilinas
    y envía alertas automáticas de vencimiento por WhatsApp en los hitos: 10, 5, 3, 1 y 0 días restantes.
    """
    logger.info("🔍 Ejecutando análisis de vencimiento de suscripciones e hitos WhatsApp...")
    
    async with AsyncSessionLocal() as db:
        stmt = select(Empresa).where(Empresa.id != 1) # Excluir la empresa dueña del SaaS
        res = await db.execute(stmt)
        empresas = res.scalars().all()

        now = datetime.now()
        enviados = 0

        for empresa in empresas:
            if empresa.is_exempt_from_subscription():
                continue

            # Obtener última suscripción
            stmt_sub = select(Suscripcion).where(Suscripcion.empresa_id == empresa.id).order_by(Suscripcion.id.desc()).limit(1)
            res_sub = await db.execute(stmt_sub)
            sub = res_sub.scalar_one_or_none()

            if not sub or not sub.fecha_vencimiento:
                continue

            # Calcular días restantes
            diff_days = (sub.fecha_vencimiento - now).days
            if diff_days < 0 and now > sub.fecha_vencimiento:
                dias_restantes = 0
            else:
                dias_restantes = max(0, diff_days)

            # Auto-expirar en DB si ya venció
            if now > sub.fecha_vencimiento and sub.estado != 'expired':
                sub.estado = 'expired'
                empresa.plan_estado = 'vencido'
                await db.commit()

            if dias_restantes not in TARGET_MILESTONE_DAYS:
                continue

            # Evitar enviar más de un recordatorio el mismo día
            if sub.last_reminder_sent_at and sub.last_reminder_sent_at.date() == now.date():
                continue

            telefono = empresa.telefono
            if not telefono:
                continue

            # Encabezado formateado FixSale POS
            encabezado = {
                0: "🚨 *¡ATENCIÓN URGENTE! SU SUSCRIPCIÓN VENCE HOY*",
                1: "🚨 *URGENTE: SU SUSCRIPCIÓN VENCE MAÑANA (1 DÍA)*",
                3: "⚠️ *IMPORTANTE: SU SUSCRIPCIÓN VENCE EN 3 DÍAS*",
                5: "🔔 *RECORDATORIO: SU SUSCRIPCIÓN VENCE EN 5 DÍAS*",
                10: "🔔 *AVISO: SU SUSCRIPCIÓN VENCE EN 10 DÍAS*"
            }.get(dias_restantes, f"🔔 *RECORDATORIO DE VENCIMIENTO PYCORE ({dias_restantes} DÍAS)*")

            dias_texto = "¡VENCE HOY!" if dias_restantes == 0 else ("1 día restante (¡Mañana!)" if dias_restantes == 1 else f"{dias_restantes} días restantes")
            fecha_fmt = sub.fecha_vencimiento.strftime("%d/%m/%Y")

            mensaje = (
                f"{encabezado}\n\n"
                f"Estimado/a *{empresa.nombre}*,\n\n"
                f"Le recordamos que su suscripción al plan *{sub.nombre_plan}* está próxima a su fecha de corte.\n\n"
                f"📅 *Fecha de vencimiento:* {fecha_fmt}\n"
                f"⏳ *Tiempo restante:* {dias_texto}\n"
                f"🏢 *Sucursales activas:* {sub.max_sucursales}\n\n"
                f"Para garantizar la continuidad ininterrumpida del servicio, puede reportar su pago o renovar en línea desde su panel:\n"
                f"👉 Planes y Suscripciones PyCore PRO\n\n"
                f"Si ya realizó su pago, por favor ignore este mensaje.\n"
                f"_Equipo de Soporte PyCore SaaS_"
            )

            # Registrar mensaje de WhatsApp saliente
            wa_msg = WhatsAppMessage(
                empresa_id=empresa.id,
                destinatario=telefono,
                mensaje=mensaje,
                estado="sent",
                tipo="recordatorio_vencimiento_suscripcion"
            )
            db.add(wa_msg)

            sub.last_reminder_sent_at = now
            sub.reminder_sent_count = (sub.reminder_sent_count or 0) + 1
            await db.commit()
            enviados += 1
            logger.info(f"✅ Recordatorio enviado a {empresa.nombre} ({telefono}) - Días restantes: {dias_restantes}")

        logger.info(f"📊 Análisis de vencimiento finalizado: {enviados} alertas enviadas.")

