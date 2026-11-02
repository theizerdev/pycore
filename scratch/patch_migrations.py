from pathlib import Path

path = Path("backend/app/core/migrations_citas.py")
content = path.read_text(encoding="utf-8")

crlf = "\r\n" in content
nl = "\r\n" if crlf else "\n"

target_def = f"            # Columnas para cobros{nl}            cobros_columns = [{nl}                (\"liquidacion_id\", \"INT NULL\"),{nl}            ]"
replacement_def = (
    f"            # Columnas para cobros{nl}"
    f"            cobros_columns = [{nl}"
    f"                (\"liquidacion_id\", \"INT NULL\"),{nl}"
    f"            ]{nl}{nl}"
    f"            # Columnas para liquidaciones_honorarios (Marco Legal Venezolano - Decreto 1.808 ISLR){nl}"
    f"            liquidaciones_columns = [{nl}"
    f"                (\"porcentaje_retencion_islr\", \"DECIMAL(5, 2) DEFAULT 3.00\"),{nl}"
    f"                (\"monto_retencion_islr_usd\", \"DECIMAL(12, 2) DEFAULT 0.00\"),{nl}"
    f"                (\"monto_retencion_islr_ves\", \"DECIMAL(12, 2) DEFAULT 0.00\"),{nl}"
    f"                (\"numero_comprobante_islr\", \"VARCHAR(50) NULL\"),{nl}"
    f"            ]"
)

if target_def in content:
    content = content.replace(target_def, replacement_def)
    print("Added liquidaciones_columns definition")
else:
    print("WARNING: target_def not found")

target_loop = (
    f"                for col_name, col_type in cobros_columns:{nl}"
    f"                    try:{nl}"
    f"                        res = await conn.execute(text({nl}"
    f"                            f\"SELECT COUNT(*) FROM information_schema.columns \"{nl}"
    f"                            f\"WHERE table_schema = DATABASE() AND table_name = 'cobros' AND column_name = '{{col_name}}'\"{nl}"
    f"                        )){nl}"
    f"                        exists = res.scalar() > 0{nl}"
    f"                        if not exists:{nl}"
    f"                            logger.info(f\"Agregando columna {{col_name}} a cobros...\"){nl}"
    f"                            await conn.execute(text(f\"ALTER TABLE cobros ADD COLUMN {{col_name}} {{col_type}}\")){nl}"
    f"                    except Exception as err:{nl}"
    f"                        logger.warning(f\"Error verificando columna {{col_name}} en cobros: {{err}}\")"
)

replacement_loop = (
    f"                for col_name, col_type in cobros_columns:{nl}"
    f"                    try:{nl}"
    f"                        res = await conn.execute(text({nl}"
    f"                            f\"SELECT COUNT(*) FROM information_schema.columns \"{nl}"
    f"                            f\"WHERE table_schema = DATABASE() AND table_name = 'cobros' AND column_name = '{{col_name}}'\"{nl}"
    f"                        )){nl}"
    f"                        exists = res.scalar() > 0{nl}"
    f"                        if not exists:{nl}"
    f"                            logger.info(f\"Agregando columna {{col_name}} a cobros...\"){nl}"
    f"                            await conn.execute(text(f\"ALTER TABLE cobros ADD COLUMN {{col_name}} {{col_type}}\")){nl}"
    f"                    except Exception as err:{nl}"
    f"                        logger.warning(f\"Error verificando columna {{col_name}} en cobros: {{err}}\"){nl}"
    f"                for col_name, col_type in liquidaciones_columns:{nl}"
    f"                    try:{nl}"
    f"                        res = await conn.execute(text({nl}"
    f"                            f\"SELECT COUNT(*) FROM information_schema.columns \"{nl}"
    f"                            f\"WHERE table_schema = DATABASE() AND table_name = 'liquidaciones_honorarios' AND column_name = '{{col_name}}'\"{nl}"
    f"                        )){nl}"
    f"                        exists = res.scalar() > 0{nl}"
    f"                        if not exists:{nl}"
    f"                            logger.info(f\"Agregando columna {{col_name}} a liquidaciones_honorarios...\"){nl}"
    f"                            await conn.execute(text(f\"ALTER TABLE liquidaciones_honorarios ADD COLUMN {{col_name}} {{col_type}}\")){nl}"
    f"                    except Exception as err:{nl}"
    f"                        logger.warning(f\"Error verificando columna {{col_name}} en liquidaciones_honorarios: {{err}}\")"
)

if target_loop in content:
    content = content.replace(target_loop, replacement_loop)
    print("Added liquidaciones_columns loop")
else:
    print("WARNING: target_loop not found")

path.write_text(content, encoding="utf-8")
print("Done updating migrations_citas.py")

