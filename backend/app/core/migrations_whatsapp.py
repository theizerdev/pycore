import logging
from sqlalchemy import text
from app.core.database import engine

logger = logging.getLogger(__name__)


async def run_whatsapp_migrations():
    """
    Asegura que las columnas del motor nativo de WhatsApp en Python y políticas Anti-Ban
    existan en las tablas empresas, sucursales y whatsapp_messages (MySQL y SQLite).
    """
    entity_columns = [
        ("whatsapp_hourly_limit", "INT DEFAULT 25"),
        ("whatsapp_simulate_typing", "BOOLEAN DEFAULT 1"),
        ("whatsapp_typing_min_sec", "FLOAT DEFAULT 2.0"),
        ("whatsapp_typing_max_sec", "FLOAT DEFAULT 6.0"),
        ("whatsapp_delay_min_sec", "INT DEFAULT 8"),
        ("whatsapp_delay_max_sec", "INT DEFAULT 20"),
        ("whatsapp_batch_size", "INT DEFAULT 10"),
        ("whatsapp_batch_pause_sec", "INT DEFAULT 60"),
        ("whatsapp_verify_number", "BOOLEAN DEFAULT 1"),
        ("whatsapp_queue_paused", "BOOLEAN DEFAULT 0"),
        ("whatsapp_connected_at", "DATETIME NULL"),
    ]

    message_columns = [
        ("instance_name", "VARCHAR(100) NULL"),
        ("external_message_id", "VARCHAR(120) NULL"),
        ("scheduled_at", "DATETIME NULL"),
    ]

    try:
        async with engine.begin() as conn:
            dialect = conn.dialect.name
            table_specs = [
                ("empresas", entity_columns),
                ("sucursales", entity_columns),
                ("whatsapp_messages", message_columns),
            ]

            for table_name, cols in table_specs:
                for col_name, col_type in cols:
                    try:
                        if dialect == "mysql":
                            res = await conn.execute(
                                text(
                                    "SELECT COUNT(*) FROM information_schema.columns "
                                    "WHERE table_schema = DATABASE() "
                                    "AND table_name = :tbl AND column_name = :col"
                                ),
                                {"tbl": table_name, "col": col_name},
                            )
                            if (res.scalar() or 0) == 0:
                                await conn.execute(
                                    text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                                )
                                logger.info(f"[WA MIGRATION] Columna {table_name}.{col_name} agregada.")
                        else:
                            await conn.execute(
                                text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                            )
                    except Exception:
                        pass
    except Exception as e:
        logger.warning(f"Aviso en migración WhatsApp: {e}")
