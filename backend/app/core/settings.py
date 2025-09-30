from pathlib import Path
from dotenv import load_dotenv
import os

ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

class Settings:
    TITLE = "Filmes.br API"
    DESCRIPTION = "API completa para plataforma de cinema brasileiro"
    VERSION = "1.0.0"
    DOCS_URL = "/api/docs"
    REDOC_URL = "/api/redoc"


    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./filmes_br.db")

    CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
    TRUSTED_HOSTS = [h.strip() for h in os.getenv("TRUSTED_HOSTS", "*").split(",")]

    EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY", None)

settings = Settings()
