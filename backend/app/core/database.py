import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import event
from app.core.config import settings

async def ensure_database_exists():
    """Crea la base de datos automáticamente si no existe en MySQL."""
    if "mysql" in settings.DATABASE_URL:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(settings.DATABASE_URL)
            db_name = parsed.path.lstrip('/')
            if db_name:
                import pymysql
                host = parsed.hostname or '127.0.0.1'
                port = parsed.port or 3306
                user = parsed.username or 'root'
                password = parsed.password or ''
                conn = pymysql.connect(host=host, port=port, user=user, password=password)
                with conn.cursor() as cursor:
                    cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                conn.commit()
                conn.close()
        except Exception as e:
            print(f"Advertencia al verificar base de datos: {e}")

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False, "timeout": 30} if "sqlite" in settings.DATABASE_URL else {},
    pool_pre_ping=True
)

# Configurar SQLite para WAL mode y alto rendimiento concurrente
if "sqlite" in settings.DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA busy_timeout=15000")
        cursor.execute("PRAGMA cache_size=-64000") # 64MB cache
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            try:
                await session.close()
            except (asyncio.CancelledError, Exception):
                pass
