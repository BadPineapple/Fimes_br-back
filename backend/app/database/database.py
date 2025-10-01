# app/core/database.py
from __future__ import annotations

from typing import AsyncGenerator, Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.settings import settings


# ==========================
# Config & helpers
# ==========================
def _coerce_sqlite_async_url(url: str) -> str:
    """
    Se o URL for sqlite síncrono (sqlite:///...), converte para aiosqlite.
    Caso já seja async (sqlite+aiosqlite:///...) ou outro SGBD, retorna como está.
    """
    if url.startswith("sqlite:///") and "+aiosqlite" not in url:
        return url.replace("sqlite:///", "sqlite+aiosqlite:///")
    return url


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


DATABASE_URL_SYNC = settings.DATABASE_URL
DATABASE_URL_ASYNC = _coerce_sqlite_async_url(settings.DATABASE_URL)

class Base(DeclarativeBase):
    pass

# Engine síncrona (útil para scripts, testes, jobs)
sync_engine = create_engine(
    DATABASE_URL_SYNC,
    connect_args={"check_same_thread": False} if _is_sqlite(DATABASE_URL_SYNC) else {},
    future=True,
)

# Engine assíncrona (para FastAPI/ASGI)
async_engine = create_async_engine(
    DATABASE_URL_ASYNC,
    echo=False,
    future=True,
)

# PRAGMAs úteis para SQLite (FKs + WAL) — síncrono
@event.listens_for(sync_engine, "connect")
def _set_sqlite_pragmas_sync(dbapi_conn, _):
    if not _is_sqlite(DATABASE_URL_SYNC):
        return
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()
    except Exception:
        # Ignora se não for SQLite/driver compatível
        pass

# PRAGMAs úteis para SQLite (FKs + WAL) — assíncrono
@event.listens_for(async_engine.sync_engine, "connect")
def _set_sqlite_pragmas_async(dbapi_conn, _):
    if not _is_sqlite(DATABASE_URL_ASYNC):
        return
    try:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()
    except Exception:
        pass

# Sessão síncrona
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False,
    future=True,
)

# Sessão assíncrona
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


def get_db() -> Generator:
    """Dependency síncrona (use apenas se seu endpoint/batch/script for síncrono)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency assíncrona para FastAPI (recomendado)."""
    async with AsyncSessionLocal() as session:
        yield session

def create_tables_sync() -> None:
    """Cria tabelas via engine síncrona (scripts/migrações manuais)."""
    Base.metadata.create_all(bind=sync_engine)


async def create_tables() -> None:
    """Cria tabelas via engine assíncrona (útil em inicialização async)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
