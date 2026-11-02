import logging
from sqlalchemy import text
from app.core.database import engine, Base
from app.models.bloqueo import BloqueoAgenda

logger = logging.getLogger(__name__)

async def run_citas_migrations():
    """
    Asegura que las columnas nuevas en citas_medicas y medicos,
    así como la tabla bloqueos_agenda, existan en la base de datos (MySQL o SQLite).
    """
    try:
        # 1. Asegurar creación de tablas nuevas (ej. bloqueos_agenda)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # 2. Agregar columnas dinámicamente si no existen
        async with engine.begin() as conn:
            # Detectar si es MySQL o SQLite
            dialect_name = conn.dialect.name

            # Columnas para citas_medicas
            citas_columns = [
                ("servicio_id", "INT NULL"),
                ("precio_estimado", "FLOAT DEFAULT 0.0"),
                ("estado_pago", "VARCHAR(30) DEFAULT 'pendiente'"),
                ("metodo_pago", "VARCHAR(50) NULL"),
                ("es_sobreturno", "BOOLEAN DEFAULT 0"),
                ("motivo_sobreturno", "VARCHAR(255) NULL"),
                ("modalidad", "VARCHAR(30) DEFAULT 'presencial'"),
                ("sala_virtual_id", "VARCHAR(120) NULL"),
                ("teleconsulta_token", "VARCHAR(64) NULL"),
                ("paciente_conectado_at", "DATETIME NULL"),
                ("link_teleconsulta_enviado", "BOOLEAN DEFAULT 0"),
                ("link_teleconsulta_enviado_at", "DATETIME NULL"),
                ("recordatorio_enviado", "BOOLEAN DEFAULT 0"),
                ("recordatorio_enviado_at", "DATETIME NULL"),
            ]

            # Columnas para medicos
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
            ]

            # Columnas para liquidaciones_honorarios (Marco Legal Venezolano - Decreto 1.808 ISLR)
            liquidaciones_columns = [
                ("porcentaje_retencion_islr", "DECIMAL(5, 2) DEFAULT 3.00"),
                ("monto_retencion_islr_usd", "DECIMAL(12, 2) DEFAULT 0.00"),
                ("monto_retencion_islr_ves", "DECIMAL(12, 2) DEFAULT 0.00"),
                ("numero_comprobante_islr", "VARCHAR(50) NULL"),
            ]

            # Columnas para empresas
            empresas_columns = [
                ("moneda_principal", "VARCHAR(10) DEFAULT 'USD'"),
                ("jitsi_active", "BOOLEAN DEFAULT 1"),
                ("jitsi_provider", "VARCHAR(30) DEFAULT 'public'"),
                ("jitsi_domain", "VARCHAR(255) DEFAULT 'meet.jit.si'"),
                ("jitsi_app_id", "VARCHAR(255) NULL"),
                ("jitsi_jwt_secret", "TEXT NULL"),
                ("jitsi_key_id", "VARCHAR(255) NULL"),
                ("jitsi_room_prefix", "VARCHAR(50) DEFAULT 'medisoft'"),
                ("jitsi_lobby_enabled", "BOOLEAN DEFAULT 1"),
                ("jitsi_recording_enabled", "BOOLEAN DEFAULT 0"),
                ("jitsi_e2ee_enabled", "BOOLEAN DEFAULT 0"),
                ("telemedicina_requiere_pago", "BOOLEAN DEFAULT 1"),
                ("telemedicina_consentimiento_texto", "TEXT NULL"),
            ]

            # Columnas para especialidad_plantillas
            plantillas_columns = [
                ("estudios_sugeridos", "JSON NULL" if dialect_name == "mysql" else "TEXT NULL"),
            ]

            if dialect_name == "mysql":
                for col_name, col_type in plantillas_columns:
                    try:
                        res = await conn.execute(text(
                            f"SELECT COUNT(*) FROM information_schema.columns "
                            f"WHERE table_schema = DATABASE() AND table_name = 'especialidad_plantillas' AND column_name = '{col_name}'"
                        ))
                        exists = res.scalar() > 0
                        if not exists:
                            logger.info(f"Agregando columna {col_name} a especialidad_plantillas...")
                            await conn.execute(text(f"ALTER TABLE especialidad_plantillas ADD COLUMN {col_name} {col_type}"))
                    except Exception as err:
                        logger.warning(f"Error verificando columna {col_name} en especialidad_plantillas: {err}")
                for col_name, col_type in citas_columns:
                    try:
                        res = await conn.execute(text(
                            f"SELECT COUNT(*) FROM information_schema.columns "
                            f"WHERE table_schema = DATABASE() AND table_name = 'citas_medicas' AND column_name = '{col_name}'"
                        ))
                        exists = res.scalar() > 0
                        if not exists:
                            logger.info(f"Agregando columna {col_name} a citas_medicas...")
                            await conn.execute(text(f"ALTER TABLE citas_medicas ADD COLUMN {col_name} {col_type}"))
                    except Exception as err:
                        logger.warning(f"Error verificando columna {col_name} en citas_medicas: {err}")

                for col_name, col_type in medicos_columns:
                    try:
                        res = await conn.execute(text(
                            f"SELECT COUNT(*) FROM information_schema.columns "
                            f"WHERE table_schema = DATABASE() AND table_name = 'medicos' AND column_name = '{col_name}'"
                        ))
                        exists = res.scalar() > 0
                        if not exists:
                            logger.info(f"Agregando columna {col_name} a medicos...")
                            await conn.execute(text(f"ALTER TABLE medicos ADD COLUMN {col_name} {col_type}"))
                    except Exception as err:
                        logger.warning(f"Error verificando columna {col_name} en medicos: {err}")

                for col_name, col_type in empresas_columns:
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
                        logger.warning(f"Error verificando columna {col_name} en empresas: {err}")
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
                        logger.warning(f"Error verificando columna {col_name} en cobros: {err}")
                for col_name, col_type in liquidaciones_columns:
                    try:
                        res = await conn.execute(text(
                            f"SELECT COUNT(*) FROM information_schema.columns "
                            f"WHERE table_schema = DATABASE() AND table_name = 'liquidaciones_honorarios' AND column_name = '{col_name}'"
                        ))
                        exists = res.scalar() > 0
                        if not exists:
                            logger.info(f"Agregando columna {col_name} a liquidaciones_honorarios...")
                            await conn.execute(text(f"ALTER TABLE liquidaciones_honorarios ADD COLUMN {col_name} {col_type}"))
                    except Exception as err:
                        logger.warning(f"Error verificando columna {col_name} en liquidaciones_honorarios: {err}")

            elif dialect_name == "sqlite":
                res_plan = await conn.execute(text("PRAGMA table_info(especialidad_plantillas)"))
                existing_plan_cols = [row[1] for row in res_plan.fetchall()]
                for col_name, col_type in plantillas_columns:
                    if col_name not in existing_plan_cols:
                        logger.info(f"Agregando columna SQLite {col_name} a especialidad_plantillas...")
                        await conn.execute(text(f"ALTER TABLE especialidad_plantillas ADD COLUMN {col_name} {col_type}"))
                res = await conn.execute(text("PRAGMA table_info(citas_medicas)"))
                existing_citas_cols = [row[1] for row in res.fetchall()]
                for col_name, col_type in citas_columns:
                    if col_name not in existing_citas_cols:
                        logger.info(f"Agregando columna SQLite {col_name} a citas_medicas...")
                        await conn.execute(text(f"ALTER TABLE citas_medicas ADD COLUMN {col_name} {col_type}"))

                res_med = await conn.execute(text("PRAGMA table_info(medicos)"))
                existing_med_cols = [row[1] for row in res_med.fetchall()]
                for col_name, col_type in medicos_columns:
                    if col_name not in existing_med_cols:
                        logger.info(f"Agregando columna SQLite {col_name} a medicos...")
                        await conn.execute(text(f"ALTER TABLE medicos ADD COLUMN {col_name} {col_type}"))

                res_emp = await conn.execute(text("PRAGMA table_info(empresas)"))
                existing_emp_cols = [row[1] for row in res_emp.fetchall()]
                for col_name, col_type in empresas_columns:
                    if col_name not in existing_emp_cols:
                        logger.info(f"Agregando columna SQLite {col_name} a empresas...")
                        await conn.execute(text(f"ALTER TABLE empresas ADD COLUMN {col_name} {col_type}"))

        logger.info("Migraciones de Citas Médicas y Empresas verificadas y actualizadas exitosamente.")
    except Exception as e:
        logger.error(f"Error en run_citas_migrations: {e}")
