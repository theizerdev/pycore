"""
Script para inicializar las 14 especialidades médicas oficiales y sus plantillas clínicas.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal, ensure_tables_exist
from app.models.especialidad import Especialidad
from app.models.plantilla_especialidad import EspecialidadPlantilla
from app.models.empresa import Empresa
from app.services.clinical_templates_seed import (
    CATALOGO_ESPECIALIDADES_OFICIALES,
    get_template_for_specialty
)

async def seed_especialidades_all():
    print("Iniciando verificación y siembra de tablas y especialidades...")
    await ensure_tables_exist()

    async with AsyncSessionLocal() as db:
        # Obtener la empresa principal
        res_emp = await db.execute(select(Empresa).limit(1))
        empresa = res_emp.scalar_one_or_none()
        if not empresa:
            print("No se encontró empresa. Creando empresa por defecto ID 1...")
            empresa = Empresa(id=1, nombre="Centro Médico Principal", activo=True)
            db.add(empresa)
            await db.commit()
            await db.refresh(empresa)

        empresa_id = empresa.id
        print(f"Empresa destino: ID {empresa_id} ({empresa.nombre})")

        total_creadas = 0
        total_actualizadas = 0
        plantillas_creadas = 0

        for esp_def in CATALOGO_ESPECIALIDADES_OFICIALES:
            nombre = esp_def["nombre"]
            stmt = select(Especialidad).where(
                Especialidad.empresa_id == empresa_id,
                func.lower(Especialidad.nombre) == nombre.lower()
            )
            res = await db.execute(stmt)
            esp = res.scalar_one_or_none()

            if not esp:
                esp = Especialidad(
                    empresa_id=empresa_id,
                    sucursal_id=None,
                    nombre=nombre,
                    codigo=esp_def["codigo"],
                    descripcion=esp_def["descripcion"],
                    color=esp_def["color"],
                    icono=esp_def["icono"],
                    activo=True
                )
                db.add(esp)
                await db.flush()
                total_creadas += 1
                print(f"[NUEVA] Especialidad creada: {nombre} ({esp_def['codigo']})")
            else:
                esp.codigo = esp_def["codigo"]
                esp.descripcion = esp_def["descripcion"]
                esp.color = esp_def["color"]
                esp.icono = esp_def["icono"]
                esp.activo = True
                total_actualizadas += 1
                print(f"[EXISTENTE] Especialidad actualizada: {nombre} ({esp.codigo})")

            # Verificar/Crear su plantilla clínica
            stmt_p = select(EspecialidadPlantilla).where(
                EspecialidadPlantilla.especialidad_id == esp.id,
                EspecialidadPlantilla.empresa_id == empresa_id
            )
            res_p = await db.execute(stmt_p)
            plantilla = res_p.scalar_one_or_none()

            sugerencia = get_template_for_specialty(esp.nombre)
            if not plantilla:
                plantilla = EspecialidadPlantilla(
                    empresa_id=empresa_id,
                    especialidad_id=esp.id,
                    esquema_preconsulta=sugerencia.get("esquema_preconsulta", []),
                    esquema_consulta=sugerencia.get("esquema_consulta", []),
                    widgets_activos=sugerencia.get("widgets_activos", []),
                    version=1,
                    activo=True
                )
                db.add(plantilla)
                plantillas_creadas += 1
                print(f"   -> Plantilla clínica inicializada para {nombre}")
            else:
                # Sincronizar esquema si estaba vacío
                if not plantilla.esquema_consulta or len(plantilla.esquema_consulta) == 0:
                    plantilla.esquema_preconsulta = sugerencia.get("esquema_preconsulta", [])
                    plantilla.esquema_consulta = sugerencia.get("esquema_consulta", [])
                    plantilla.widgets_activos = sugerencia.get("widgets_activos", [])
                    plantillas_creadas += 1
                    print(f"   -> Plantilla clínica actualizada con catálogo oficial para {nombre}")

        await db.commit()
        print("\nRESUMEN DE SIEMBRA:")
        print(f"- Especialidades nuevas: {total_creadas}")
        print(f"- Especialidades actualizadas: {total_actualizadas}")
        print(f"- Plantillas clínicas aseguradas: {plantillas_creadas}")
        print("Operación completada con éxito.")

if __name__ == "__main__":
    asyncio.run(seed_especialidades_all())
