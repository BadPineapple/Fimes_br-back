# app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.database import get_db
from app.database.models import User as UserModel
from app.schemas.user import User
from app.services.rate_limit import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login_user(email: str, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Muitas tentativas de login")

    normalized_email = (email or "").lower().strip()
    if not normalized_email:
        raise HTTPException(status_code=400, detail="E-mail é obrigatório")

    # Funções síncronas executadas no threadpool
    def _get_user_by_email() -> UserModel | None:
        return db.scalars(
            select(UserModel).where(UserModel.email == normalized_email)
        ).first()

    def _create_user() -> UserModel:
        user_data = User(email=normalized_email, name=normalized_email.split("@")[0])
        new_user = UserModel(**user_data.dict())
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    try:
        user = await run_in_threadpool(_get_user_by_email)
        if not user:
            user = await run_in_threadpool(_create_user)
        return User.from_orm(user)
    except Exception as e:
        # Opcionalmente: logar o erro aqui
        raise HTTPException(status_code=500, detail=f"Erro no login: {str(e)}")


@router.get("/me")
async def get_current_user(user_id: str, db: AsyncSession = Depends(get_db)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id é obrigatório")

    def _get_user_by_id() -> UserModel | None:
        return db.scalars(
            select(UserModel).where(UserModel.id == user_id)
        ).first()

    try:
        user = await run_in_threadpool(_get_user_by_id)
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return User.from_orm(user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar usuário: {str(e)}")


@router.get("/test-user")
async def get_test_user(db: AsyncSession = Depends(get_db)):
    test_email = "cinefilo.teste@filmes.br"

    def _get_by_email() -> UserModel | None:
        return db.scalars(
            select(UserModel).where(UserModel.email == test_email)
        ).first()

    def _create_test_user() -> UserModel:
        test_user_data = User(
            email=test_email,
            name="Cinéfilo Brasileiro",
            description=(
                "Apaixonado pelo cinema nacional brasileiro. "
                "Amo desde os clássicos do Cinema Novo às produções contemporâneas."
            ),
        )
        new_user = UserModel(**test_user_data.dict())
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    try:
        user = await run_in_threadpool(_get_by_email)
        if not user:
            user = await run_in_threadpool(_create_test_user)
        return User.from_orm(user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter usuário de teste: {str(e)}")
