# app/core/settings.py
from pathlib import Path
from dotenv import load_dotenv
import os

# .../backend/app/core/settings.py -> parents[2] = .../backend
ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

def _coerce_async_sqlite(url: str) -> str:
    """
    Garante driver async no SQLite:
    - sqlite:///  -> sqlite+aiosqlite:///
    - sqlite://   -> sqlite+aiosqlite://
    """
    if url.startswith("sqlite:///") and not url.startswith("sqlite+aiosqlite:///"):
        return url.replace("sqlite:///", "sqlite+aiosqlite:///")
    if url.startswith("sqlite://") and not url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite://", "sqlite+aiosqlite://")
    return url

class Settings:
    TITLE = "Filmes.br API"
    DESCRIPTION = "API completa para plataforma de cinema brasileiro"
    VERSION = "1.0.0"
    DOCS_URL = "/api/docs"
    REDOC_URL = "/api/redoc"

    DATABASE_URL = _coerce_async_sqlite(
        os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./filmes_br.db")
    )

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
    TRUSTED_HOSTS = [h.strip() for h in os.getenv("TRUSTED_HOSTS", "*").split(",")]

    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

settings = Settings()
