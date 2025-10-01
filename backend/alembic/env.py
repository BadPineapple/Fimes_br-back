from logging.config import fileConfig
import os, sys
from pathlib import Path
from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from dotenv import load_dotenv

# --- Descobrir diretórios ---
ALEMBIC_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ALEMBIC_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# --- Carregar .env ---
load_dotenv(BACKEND_DIR / ".env")

# --- Forçar driver async no SQLite (caso venha 'sqlite:///') ---
def _coerce_async_sqlite(url: str | None) -> str:
    if not url:
        return "sqlite+aiosqlite:///./filmes_br.db"
    if url.startswith("sqlite:///") and not url.startswith("sqlite+aiosqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///")
    if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://")
    return url

# Importar Base e modelos
from app.database.database import Base
from app.database import models  # popular metadata

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

# Resolver URL efetiva
env_url = os.getenv("DATABASE_URL")
ini_url = config.get_main_option("sqlalchemy.url")
final_url = _coerce_async_sqlite(env_url or ini_url)
config.set_main_option("sqlalchemy.url", final_url)
print("ALEMBIC EFFECTIVE URL =", final_url)

target_metadata = Base.metadata

def run_migrations_offline():
    """Migrações no modo offline."""
    context.configure(
        url=final_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=True,  # bom para SQLite
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    """Tudo que toca no banco fica dentro deste bloco síncrono."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        render_as_batch=True,  # bom para SQLite
    )
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    """Migrações no modo online (async)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio
    asyncio.run(run_migrations_online())
