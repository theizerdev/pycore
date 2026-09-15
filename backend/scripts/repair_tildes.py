import asyncio
import os
import sys
import json
import unicodedata

sys.path.insert(0, os.path.abspath("backend"))

from app.core.database import AsyncSessionLocal
from sqlalchemy import text
from app.services.clinical_templates_seed import (
    CATALOGO_ESPECIALIDADES_OFICIALES,
    get_template_for_specialty,
    normalize_specialty_name
)

def try_fix_mojibake(val: str) -> str:
    if not val or not isinstance(val, str):
        return val
    if 'Ã' in val or 'Â' in val:
        try:
            fixed = val.encode('latin1').decode('utf-8')
            return fixed
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return val

def fix_obj(obj):
    if isinstance(obj, str):
        return try_fix_mojibake(obj)
    elif isinstance(obj, list):
        return [fix_obj(x) for x in obj]
    elif isinstance(obj, dict):
        return {fix_obj(k): fix_obj(v) for k, v in obj.items()}
    return obj

async def run_repair():
    print("=== INICIANDO REPARACIÓN DE TILDES Y CARACTERES ESPECIALES ===")
    
    async with AsyncSessionLocal() as session:
        # 1. Eliminar duplicados no referenciados en especialidades (IDs >= 17)
        print("\n1. Verificando y eliminando duplicados en especialidades (IDs >= 17)...")
        res_del_p = await session.execute(text("DELETE FROM especialidad_plantillas WHERE especialidad_id >= 17"))
        print(f"   Plantillas huérfanas/duplicadas eliminadas: {res_del_p.rowcount}")
        
        res_del_e = await session.execute(text("DELETE FROM especialidades WHERE id >= 17"))
        print(f"   Especialidades duplicadas eliminadas: {res_del_e.rowcount}")
        
        # 2. Reparar mojibake en todas las tablas de la base de datos
        print("\n2. Reparando mojibake en todas las tablas...")
        res_tables = await session.execute(text("SHOW TABLES"))
        tables = [r[0] for r in res_tables.fetchall()]
        
        total_fields_repaired = 0
        for table in tables:
            col_res = await session.execute(text(f"""
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'pycore_db' AND TABLE_NAME = '{table}'
                AND DATA_TYPE IN ('varchar', 'text', 'mediumtext', 'longtext', 'json')
            """))
            cols = [r[0] for r in col_res.fetchall()]
            if not cols:
                continue
                
            pk_res = await session.execute(text(f"""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = 'pycore_db' AND TABLE_NAME = '{table}' AND CONSTRAINT_NAME = 'PRIMARY'
            """))
            pk_rows = pk_res.fetchall()
            pk = pk_rows[0][0] if pk_rows else 'id'
            
            for col in cols:
                try:
                    q = f"SELECT `{pk}`, `{col}` FROM `{table}` WHERE `{col}` IS NOT NULL"
                    rows = (await session.execute(text(q))).fetchall()
                    for r in rows:
                        row_id = r[0]
                        val = r[1]
                        if isinstance(val, str):
                            fixed = try_fix_mojibake(val)
                            if fixed != val:
                                upd_q = f"UPDATE `{table}` SET `{col}` = :new_val WHERE `{pk}` = :row_id"
                                await session.execute(text(upd_q), {"new_val": fixed, "row_id": row_id})
                                total_fields_repaired += 1
                        elif isinstance(val, (dict, list)):
                            fixed_obj = fix_obj(val)
                            s_orig = json.dumps(val, ensure_ascii=False)
                            s_fixed = json.dumps(fixed_obj, ensure_ascii=False)
                            if s_orig != s_fixed:
                                upd_q = f"UPDATE `{table}` SET `{col}` = :new_val WHERE `{pk}` = :row_id"
                                await session.execute(text(upd_q), {"new_val": json.dumps(fixed_obj), "row_id": row_id})
                                total_fields_repaired += 1
                except Exception as e:
                    print(f"   Error escaneando {table}.{col}: {e}")
                    
        print(f"   Total de campos de texto/JSON corregidos: {total_fields_repaired}")
        
        # 3. Asegurar catálogo oficial en especialidades 1 a 16
        print("\n3. Sincronizando especialidades y plantillas oficiales...")
        for esp_def in CATALOGO_ESPECIALIDADES_OFICIALES:
            # Buscar por código primero
            res_esp = await session.execute(
                text("SELECT id, nombre, codigo, descripcion FROM especialidades WHERE codigo = :cod"),
                {"cod": esp_def["codigo"]}
            )
            esp_row = res_esp.fetchone()
            
            if esp_row:
                esp_id = esp_row[0]
                await session.execute(
                    text("""
                        UPDATE especialidades 
                        SET nombre = :nom, descripcion = :desc, color = :col, icono = :ico, activo = 1 
                        WHERE id = :id
                    """),
                    {
                        "nom": esp_def["nombre"],
                        "desc": esp_def["descripcion"],
                        "col": esp_def["color"],
                        "ico": esp_def["icono"],
                        "id": esp_id
                    }
                )
                print(f"   [SYNC] Especialidad ID {esp_id}: {esp_def['nombre']}")
                
                # Sincronizar plantilla clínica oficial con tildes correctas
                sugerencia = get_template_for_specialty(esp_def["nombre"])
                await session.execute(
                    text("""
                        UPDATE especialidad_plantillas
                        SET esquema_preconsulta = :pre, esquema_consulta = :con, widgets_activos = :wid, activo = 1
                        WHERE especialidad_id = :esp_id
                    """),
                    {
                        "pre": json.dumps(sugerencia.get("esquema_preconsulta", [])),
                        "con": json.dumps(sugerencia.get("esquema_consulta", [])),
                        "wid": json.dumps(sugerencia.get("widgets_activos", [])),
                        "esp_id": esp_id
                    }
                )
                
        # Especialidad ID 1 (Cardiología Clínica) que tiene código CARD-01
        res_card = await session.execute(text("SELECT id FROM especialidades WHERE id = 1"))
        if res_card.fetchone():
            card_sug = get_template_for_specialty("Cardiología")
            await session.execute(
                text("""
                    UPDATE especialidades 
                    SET nombre = 'Cardiología Clínica',
                        descripcion = 'Diagnóstico cardiológico integral y ritmo cardíaco',
                        color = '#ef4444',
                        icono = 'HeartPulse',
                        activo = 1
                    WHERE id = 1
                """)
            )
            await session.execute(
                text("""
                    UPDATE especialidad_plantillas
                    SET esquema_preconsulta = :pre, esquema_consulta = :con, widgets_activos = :wid, activo = 1
                    WHERE especialidad_id = 1
                """),
                {
                    "pre": json.dumps(card_sug.get("esquema_preconsulta", [])),
                    "con": json.dumps(card_sug.get("esquema_consulta", [])),
                    "wid": json.dumps(card_sug.get("widgets_activos", [])),
                }
            )
            print("   [SYNC] Especialidad ID 1: Cardiología Clínica")

        await session.commit()
        print("\n=== REPARACIÓN COMPLETADA Y GUARDADA EN BASE DE DATOS ===")

if __name__ == "__main__":
    asyncio.run(run_repair())

