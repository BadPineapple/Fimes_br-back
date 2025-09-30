# app/services/rate_limit.py
import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict, Optional

class RateLimiter:
    def __init__(self) -> None:
        self._buckets: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _make_key(self, scope: str, client_id: str) -> str:
        # escopo ajuda a separar limites por rota/uso (ex.: "login", "ratings:create")
        return f"{scope}:{client_id}"

    def allow(self, client_id: str, max_requests: int, window_seconds: int, scope: str = "global") -> bool:
        """
        Retorna True se pode passar, False se excedeu.
        client_id: pode ser o user_id ou o IP (fallback).
        scope: agrupa buckets por uso/rota.
        """
        now = time.time()
        key = self._make_key(scope, client_id)
        with self._lock:
            dq = self._buckets[key]
            # remove timestamps fora da janela
            while dq and (now - dq[0]) >= window_seconds:
                dq.popleft()
            if len(dq) >= max_requests:
                return False
            dq.append(now)
            return True

    def get_count(self, client_id: str, window_seconds: int, scope: str = "global") -> int:
        """Retorna quantas requisições existem no bucket neste instante (após limpeza)."""
        now = time.time()
        key = self._make_key(scope, client_id)
        with self._lock:
            dq = self._buckets[key]
            while dq and (now - dq[0]) >= window_seconds:
                dq.popleft()
            return len(dq)

# instância global
rate_limiter = RateLimiter()

# --- Função compatível com sua assinatura antiga (para drop-in) ---
def check_rate_limit(client_ip: str, max_requests: int, window_seconds: int, *, scope: str = "global") -> bool:
    return rate_limiter.allow(client_ip, max_requests, window_seconds, scope=scope)

# --- Dependency para FastAPI (opcional, prático) ---
from fastapi import Request, HTTPException

def rate_limit_dependency(max_requests: int, window_seconds: int, scope: str = "global", use_user_id: bool = False):
    """
    Exemplo de uso:
    @router.post("/login", dependencies=[Depends(rate_limit_dependency(5, 300, scope="login", use_user_id=False))])
    """
    async def _dep(request: Request):
        # tenta user_id no header/contexto se quiser; aqui só opção simples:
        client_id: Optional[str] = None
        if use_user_id:
            # exemplo: pegar de header/atributo; ajuste conforme seu auth
            client_id = request.headers.get("X-User-ID")
        if not client_id:
            client_id = request.client.host if request.client else "unknown"

        allowed = rate_limiter.allow(client_id, max_requests, window_seconds, scope=scope)
        if not allowed:
            raise HTTPException(status_code=429, detail="Too Many Requests")
    return _dep
