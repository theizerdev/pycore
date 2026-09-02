import asyncio
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.integracion import WhatsAppTemplate

DEFAULT_TEMPLATES = [
    {
        "empresa_id": 1,
        "nombre": "Recordatorio de Cita Médica",
        "categoria": "recordatorio_cita",
        "contenido": "Hola *{paciente}*, le recordamos su notificación de *PyCore PRO* para el día *{fecha_cita}* a las *{hora}* con el Dr.(a) *{medico}* en la *{sede}*. Por favor responda *CONFIRMAR* o *CANCELAR*.",
        "variables": ["paciente", "fecha_cita", "hora", "medico", "sede"],
        "activo": True
    },
    {
        "empresa_id": 1,
        "nombre": "Llamado de Turno en Sala",
        "categoria": "confirmacion_turno",
        "contenido": "Estimado(a) *{paciente}*, su turno *{turno}* ha sido llamado. Por favor acérquese al *Consultorio {consultorio}* con el Dr.(a) *{medico}*.",
        "variables": ["paciente", "turno", "consultorio", "medico"],
        "activo": True
    },
    {
        "empresa_id": 1,
        "nombre": "Entrega de Receta Electrónica",
        "categoria": "receta_medica",
        "contenido": "Hola *{paciente}*, adjuntamos su receta médica digital y plan de tratamiento emitido en su consulta de hoy. Puede descargarla directamente desde este enlace seguro: {enlace_receta}",
        "variables": ["paciente", "enlace_receta"],
        "activo": True
    },
    {
        "empresa_id": 1,
        "nombre": "Resultados de Laboratorio Listos",
        "categoria": "resultado_estudio",
        "contenido": "Estimado(a) *{paciente}*, le informamos que sus resultados de laboratorio para la orden *#{orden}* ya se encuentran validados y listos para consulta. Ingrese al portal para revisarlos: {enlace_portal}",
        "variables": ["paciente", "orden", "enlace_portal"],
        "activo": True
    }
]

async def seed_templates():
    async with AsyncSessionLocal() as db:
        for tpl_data in DEFAULT_TEMPLATES:
            stmt = select(WhatsAppTemplate).where(
                WhatsAppTemplate.nombre == tpl_data["nombre"],
                WhatsAppTemplate.empresa_id == tpl_data["empresa_id"]
            )
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                tpl = WhatsAppTemplate(**tpl_data)
                db.add(tpl)
        await db.commit()
        print("Default WhatsApp clinical templates seeded!")

if __name__ == '__main__':
    asyncio.run(seed_templates())
