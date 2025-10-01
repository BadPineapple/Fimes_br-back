# app/main.py
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.settings import settings
from app.database.database import create_tables, AsyncSessionLocal, get_session
from app.database.models import Film

# --- Routers: importe os que já estão prontos para SQLAlchemy async ---
from app.routers import auth as auth_router
from app.routers import users as users_router
from app.routers import films as films_router
from app.routers import ratings as ratings_router
from app.routers import film_lists as film_lists_router

# moderation/ai podem ainda depender de coisas antigas; inclua com try/except
try:
    from app.routers import moderation as moderation_router  # se já migrou p/ SQLA
except Exception as e:  # ImportError ou outros
    moderation_router = None

try:
    from app.routers import ai as ai_router
except Exception as e:
    ai_router = None


# --------- Lifespan: criar tabelas e rodar bootstrap ---------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1) Garantir tabelas (em dev/local; em produção confie no Alembic)
    await create_tables()

    # 2) Bootstrap (moderador, filmes exemplo)
    #    Primeiro tentamos versões assíncronas; se não existirem, caímos para as síncronas em threadpool.
    try:
        from app.services.bootstrap import (
            initialize_moderator_async,
            initialize_sample_films_async,
        )

        async with AsyncSessionLocal() as session:
            await initialize_moderator_async(session)
            await initialize_sample_films_async(session)

    except (ImportError, AttributeError):
        # Fallback p/ versões síncronas, caso seu bootstrap ainda não seja async.
        try:
            from app.services.bootstrap import (
                initialize_moderator,
                initialize_sample_films,
            )

            # Criar uma sessão síncrona temporária apontando para o mesmo arquivo .db
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            sync_url = settings.DATABASE_URL.replace(
                "sqlite+aiosqlite://", "sqlite://"
            ).replace(
                "sqlite+aiosqlite:///", "sqlite:///"
            )
            engine = create_engine(sync_url, connect_args={"check_same_thread": False})
            SessionLocalSync = sessionmaker(bind=engine)

            async def _run_sync_bootstrap():
                db = SessionLocalSync()
                try:
                    initialize_moderator(db)
                    initialize_sample_films(db)
                finally:
                    db.close()

            await run_in_threadpool(_run_sync_bootstrap)
        except (ImportError, AttributeError):
            # Sem bootstrap: segue a vida
            pass

    yield
    # teardown se precisar


app = FastAPI(
    title=settings.TITLE,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
    lifespan=lifespan,
)

origins = settings.CORS_ORIGINS
# se estiver vazio, garanta lista
if isinstance(origins, str):
    origins = [o.strip() for o in origins.split(",") if o.strip()]

# --------- Middlewares ---------
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.TRUSTED_HOSTS
        if isinstance(settings.TRUSTED_HOSTS, (list, tuple))
            else [h.strip() for h in str(settings.TRUSTED_HOSTS).split(",") if h.strip()],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=600,
)

# --------- Routers (prefixo /api) ---------
app.include_router(auth_router.router, prefix="/api")
app.include_router(users_router.router, prefix="/api")
app.include_router(films_router.router, prefix="/api")
app.include_router(ratings_router.router, prefix="/api")
app.include_router(film_lists_router.router, prefix="/api")

if moderation_router:
    app.include_router(moderation_router.router, prefix="/api")
if ai_router:
    app.include_router(ai_router.router, prefix="/api")

# --------- Logging ---------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# --------- Endpoints utilitários ---------
@app.get("/api/health")
async def health():
    return {"status": "ok"}

# Endpoint de exemplo usando a sessão assíncrona
@app.get("/api/films_example")
async def list_films_example(session: AsyncSession = Depends(get_session)):
    res = await session.execute(select(Film).order_by(Film.created_at.desc()).limit(25))
    return [
        {
            "id": f.id,
            "title": f.title,
            "year": f.year,
            "description": f.description,
            "banner_url": f.banner_url,
        }
        for f in res.scalars().all()
    ]
