# 1. Update backend/app/models/__init__.py
with open('backend/app/models/__init__.py', 'r', encoding='utf-8') as f:
    init_content = f.read()

if '"LiquidacionHonorario"' not in init_content:
    init_content = init_content.replace(
        '"MovimientoCaja",\n]',
        '"MovimientoCaja",\n    "LiquidacionHonorario",\n]'
    ).replace(
        '"MovimientoCaja",\r\n]',
        '"MovimientoCaja",\r\n    "LiquidacionHonorario",\r\n]'
    )
    with open('backend/app/models/__init__.py', 'w', encoding='utf-8') as f:
        f.write(init_content)
    print("backend/app/models/__init__.py updated")

# 2. Update backend/app/core/migrations_citas.py
with open('backend/app/core/migrations_citas.py', 'r', encoding='utf-8') as f:
    mig_content = f.read()

target_med_cols = '''            # Columnas para medicos
            medicos_columns = [
                ("horario_atencion", "JSON NULL" if dialect_name == "mysql" else "TEXT NULL"),
            ]'''

new_med_cols = '''            # Columnas para medicos
            medicos_columns = [
                ("horario_atencion", "JSON NULL" if dialect_name == "mysql" else "TEXT NULL"),
                ("tipo_comision", "VARCHAR(20) DEFAULT 'porcentaje'"),
                ("porcentaje_honorario", "DECIMAL(5, 2) DEFAULT 70.00"),
                ("monto_fijo_honorario", "DECIMAL(12, 2) DEFAULT 0.00"),
                ("datos_bancarios", "JSON NULL" if dialect_name == "mysql" else "TEXT NULL"),
            ]

            # Columnas para cobros
            cobros_columns = [
                ("liquidacion_id", "INT NULL"),
            ]'''

if target_med_cols in mig_content:
    mig_content = mig_content.replace(target_med_cols, new_med_cols)
elif target_med_cols.replace('\n', '\r\n') in mig_content:
    mig_content = mig_content.replace(target_med_cols.replace('\n', '\r\n'), new_med_cols.replace('\n', '\r\n'))

# Add execution for cobros_columns in MySQL and SQLite
mysql_target = '''                for col_name, col_type in empresas_columns:
                    try:
                        res = await conn.execute(text(
                            f"SELECT COUNT(*) FROM information_schema.columns "
                            f"WHERE table_schema = DATABASE() AND table_name = 'empresas' AND column_name = '{col_name}'"
                        ))
                        exists = res.scalar() > 0
                        if not exists:
                            logger.info(f"Agregando columna {col_name} a empresas...")
                            await conn.execute(text(f"ALTER TABLE empresas ADD COLUMN {col_name} {col_type}"))
                    except Exception as err:
                        logger.warning(f"Error verificando columna {col_name} en empresas: {err}")'''

mysql_addition = '''
                for col_name, col_type in cobros_columns:
                    try:
                        res = await conn.execute(text(
                            f"SELECT COUNT(*) FROM information_schema.columns "
                            f"WHERE table_schema = DATABASE() AND table_name = 'cobros' AND column_name = '{col_name}'"
                        ))
                        exists = res.scalar() > 0
                        if not exists:
                            logger.info(f"Agregando columna {col_name} a cobros...")
                            await conn.execute(text(f"ALTER TABLE cobros ADD COLUMN {col_name} {col_type}"))
                    except Exception as err:
                        logger.warning(f"Error verificando columna {col_name} en cobros: {err}")'''

if mysql_target in mig_content and 'table_name = \'cobros\'' not in mig_content:
    mig_content = mig_content.replace(mysql_target, mysql_target + mysql_addition)
elif mysql_target.replace('\n', '\r\n') in mig_content and 'table_name = \'cobros\'' not in mig_content:
    mig_content = mig_content.replace(mysql_target.replace('\n', '\r\n'), mysql_target.replace('\n', '\r\n') + mysql_addition.replace('\n', '\r\n'))

with open('backend/app/core/migrations_citas.py', 'w', encoding='utf-8') as f:
    f.write(mig_content)
print("backend/app/core/migrations_citas.py updated")

