# app/core/db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Use um caminho absoluto no seu projeto se preferir (ex.: sqlite:///./data/app.db)
DATABASE_URL = "sqlite:///./app.db"

# check_same_thread=False é necessário para SQLite em apps multi-thread (como FastAPI em prod)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency que abre e fecha a sessão por requisição."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
