# run.py
import os
import uvicorn

def _get_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    workers = int(os.getenv("WORKERS", "1"))
    log_level = os.getenv("LOG_LEVEL", "info")

    # Em dev, RELOAD=True; em prod, mantenha False.
    reload_enabled = _get_bool("RELOAD", True)
    # Uvicorn não permite reload com múltiplos workers
    if workers > 1 and reload_enabled:
        reload_enabled = False

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=workers,
        reload=reload_enabled,
        log_level=log_level,
        # http="h11",  # padrão
        # proxy_headers=True, forwarded_allow_ips="*",
    )
