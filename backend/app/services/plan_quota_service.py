"""
🛡️ PlanQuotaService - MediSoftSuite / PyCore Platform
Control estricto y centralizado de cuotas, límites de recursos y consumo SaaS
(Sucursales, Usuarios y Mensajería de WhatsApp) según el plan contratado por la empresa.
"""
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.empresa import Empresa
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.suscripcion import Suscripcion
from app.models.integracion import WhatsAppMessage

class PlanQuotaService:
    @staticmethod
    async def check_user_limit(db: AsyncSession, empresa_id: int) -> None:
        """Verifica si la empresa puede crear o activar un usuario adicional según su plan."""
        stmt_emp = select(Empresa).where(Empresa.id == empresa_id)
        res_emp = await db.execute(stmt_emp)
        empresa = res_emp.scalar_one_or_none()

        if not empresa or empresa.is_exempt_from_subscription():
            return

        plan = empresa.plan
        max_usuarios = plan.max_usuarios if plan else 3

        stmt_count = select(func.count(Usuario.id)).where(
            Usuario.empresa_id == empresa_id,
            Usuario.activo == True
        )
        res_count = await db.execute(stmt_count)
        current_users = res_count.scalar() or 0

        if current_users >= max_usuarios:
            plan_nombre = plan.nombre if plan else "Plan Básico"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Límite de usuarios alcanzado ({current_users}/{max_usuarios}). "
                    f"Tu suscripción con el '{plan_nombre}' no permite agregar más usuarios activos. "
                    f"Para ampliar la capacidad de tu equipo médico y administrativo, actualiza tu plan en Planes & Facturación."
                )
            )

    @staticmethod
    async def check_sucursal_limit(db: AsyncSession, empresa_id: int) -> None:
        """Verifica si la empresa puede crear una sucursal adicional según su plan o suscripción contratada."""
        stmt_emp = select(Empresa).where(Empresa.id == empresa_id)
        res_emp = await db.execute(stmt_emp)
        empresa = res_emp.scalar_one_or_none()

        if not empresa or empresa.is_exempt_from_subscription():
            return

        # Verificar si tiene una suscripción aprobada con sucursales extras contratadas
        stmt_sub = (
            select(Suscripcion)
            .where(Suscripcion.empresa_id == empresa.id, Suscripcion.estado.in_(["aprobado", "active"]))
            .order_by(Suscripcion.id.desc())
            .limit(1)
        )
        res_sub = await db.execute(stmt_sub)
        sub_aprobada = res_sub.scalar_one_or_none()

        if sub_aprobada and sub_aprobada.max_sucursales:
            max_allowed = sub_aprobada.max_sucursales
        elif empresa.plan and empresa.plan.sucursales_incluidas:
            max_allowed = empresa.plan.sucursales_incluidas
        else:
            max_allowed = 1

        stmt_count = select(func.count(Sucursal.id)).where(Sucursal.empresa_id == empresa.id)
        res_count = await db.execute(stmt_count)
        current_count = res_count.scalar() or 0

        if current_count >= max_allowed:
            plan_nombre = empresa.plan.nombre if empresa.plan else "Plan Básico"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Límite de sucursales alcanzado ({current_count}/{max_allowed}). "
                    f"Tu plan '{plan_nombre}' o suscripción actual permite un máximo de {max_allowed} sede(s). "
                    f"Para agregar sucursales adicionales, contrata sedes extras en Planes & Facturación."
                )
            )

    @staticmethod
    async def check_whatsapp_limit(db: AsyncSession, empresa_id: int, count: int = 1) -> None:
        """Verifica si la empresa dispone de cuota mensual de WhatsApp para despachar 'count' mensaje(s)."""
        stmt_emp = select(Empresa).where(Empresa.id == empresa_id)
        res_emp = await db.execute(stmt_emp)
        empresa = res_emp.scalar_one_or_none()

        if not empresa or empresa.is_exempt_from_subscription():
            return

        plan = empresa.plan
        max_wa = plan.max_mensajes_whatsapp if plan else 100

        now = datetime.now()
        first_day_month = datetime(now.year, now.month, 1)
        stmt_count = select(func.count(WhatsAppMessage.id)).where(
            WhatsAppMessage.empresa_id == empresa.id,
            WhatsAppMessage.created_at >= first_day_month
        )
        res_count = await db.execute(stmt_count)
        current_mes = res_count.scalar() or 0

        if (current_mes + count) > max_wa:
            disponibles = max(0, max_wa - current_mes)
            plan_nombre = plan.nombre if plan else "Plan Básico"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Límite mensual de WhatsApp superado. Has consumido {current_mes} de {max_wa} mensajes permitidos este mes "
                    f"(cupo restante: {disponibles}, solicitados: {count}). "
                    f"Tu plan '{plan_nombre}' ha llegado al tope mensual. Actualiza tu plan para aumentar la cuota de mensajería."
                )
            )
