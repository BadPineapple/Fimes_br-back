# app/database/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base
from ..core.setting import settings  # observe: 'setting' (singular), como ajustado antes

# Cria o engine síncrono para SQLite
# check_same_thread=False é necessário quando o SQLite é acessado por múltiplas threads (FastAPI + threadpool)
engine = create_engine(
    settings.DATABASE_URL,              # ex.: "sqlite:///./filmes_br.db"
    echo=False,                         # True para logs SQL em debug
    connect_args={"check_same_thread": False},
)

# Session factory (síncrona)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables() -> None:
    """Cria todas as tabelas conforme os modelos declarados em Base."""
    Base.metadata.create_all(bind=engine)

def get_db():
    """
    Dependency do FastAPI que fornece uma Session por request.
    Em rotas async, use operações de DB dentro de run_in_threadpool para não bloquear o event loop.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
