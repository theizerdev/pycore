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
                ("recordatorio_enviado", "BOOLEAN DEFAULT 0"),
                ("recordatorio_enviado_at", "DATETIME NULL"),
            ]

            # Columnas para medicos
            medicos_columns = [
                ("horario_atencion", "JSON NULL" if dialect_name == "mysql" else "TEXT NULL"),
            ]

            if dialect_name == "mysql":
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

            elif dialect_name == "sqlite":
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

        logger.info("Migraciones de Citas Médicas verificadas y actualizadas exitosamente.")
    except Exception as e:
        logger.error(f"Error en run_citas_migrations: {e}")
