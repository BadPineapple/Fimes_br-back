# app/routers/ratings.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, func

from app.core.db import get_db
from app.models.film import Film as FilmModel
from app.models.user_rating import UserRating as UserRatingModel
from app.models.user import User as UserModel
from app.models.film_metrics import FilmMetrics as FilmMetricsModel
from app.schemas.rating import UserRatingCreate, UserRating
from app.services.rate_limit import check_rate_limit
from app.services.permissions import check_user_banned

router = APIRouter(prefix="/films/{film_id}/ratings", tags=["ratings"])


@router.post("")
async def create_rating(
    film_id: str,
    rating_data: UserRatingCreate,
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Muitas tentativas")

    # Se sua função for síncrona, remova o await:
    if await check_user_banned(db, user_id):
        raise HTTPException(status_code=403, detail="Usuário banido do sistema")

    def _op():
        # Verificar se o filme existe
        film = db.scalars(select(FilmModel).where(FilmModel.id == film_id)).first()
        if not film:
            raise HTTPException(status_code=404, detail="Filme não encontrado")

        # Remover avaliação anterior do mesmo usuário (se existir)
        db.execute(
            delete(UserRatingModel).where(
                (UserRatingModel.user_id == user_id)
                & (UserRatingModel.film_id == film_id)
            )
        )

        # Criar nova avaliação
        payload = rating_data.dict()
        payload["film_id"] = film_id  # complementar com o film_id da rota
        rating_obj = UserRating(user_id=user_id, **payload)
        rating_model = UserRatingModel(**rating_obj.dict())

        db.add(rating_model)
        db.commit()
        db.refresh(rating_model)

        return rating_model

    try:
        rating_model = await run_in_threadpool(_op)
        # Recalcular métricas após o commit
        await recalc_film_metrics(film_id, db)
        # Pydantic v1: from_orm(...).dict(); v2: from_orm + model_config(from_attributes=True) ou model_dump()
        return UserRating.from_orm(rating_model).dict()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao criar avaliação: {str(e)}")


@router.get("")
async def get_film_ratings(film_id: str, db: Session = Depends(get_db)):
    def _op():
        # JOIN ratings ← users para trazer nome e avatar
        result = db.execute(
            select(UserRatingModel, UserModel.name, UserModel.avatar_url)
            .join(UserModel, UserRatingModel.user_id == UserModel.id)
            .where(UserRatingModel.film_id == film_id)
            .order_by(UserRatingModel.created_at.desc())
            .limit(1000)
        )
        return result.all()

    try:
        rows = await run_in_threadpool(_op)
        response: List[dict] = []
        for rating, user_name, user_avatar in rows:
            item = UserRating.from_orm(rating).dict()
            item.update(
                {
                    "user_name": user_name or "Usuário",
                    "user_avatar": user_avatar,
                }
            )
            response.append(item)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar avaliações: {str(e)}")


@router.get("/average")
async def get_film_average_rating(film_id: str, db: Session = Depends(get_db)):
    def _op():
        result = db.execute(
            select(func.avg(UserRatingModel.rating), func.count(UserRatingModel.id)).where(
                UserRatingModel.film_id == film_id
            )
        )
        return result.first()

    row = await run_in_threadpool(_op)
    if row and row[0] is not None:
        return {"average": round(float(row[0]), 1), "count": int(row[1])}
    return {"average": 0, "count": 0}


# --------- Utilitário local para métricas (equivalente ao serviço antigo) ---------
async def recalc_film_metrics(film_id: str, db: Session):
    """Recalcula favorites_count, watched_count, average_rating e ratings_count em FilmMetrics."""
    from datetime import datetime, timezone

    def _op():
        # Counts por tipos de lista (se você usa FilmList, adapte aqui);
        # Como este router trata apenas ratings, vamos focar nas métricas de avaliação:

        # Média e contagem de avaliações
        avg_row = db.execute(
            select(func.avg(UserRatingModel.rating), func.count(UserRatingModel.id)).where(
                UserRatingModel.film_id == film_id
            )
        ).first()
        avg_rating = 0.0
        ratings_count = 0
        if avg_row and avg_row[0] is not None:
            avg_rating = round(float(avg_row[0]), 2)
            ratings_count = int(avg_row[1])

        # Buscar registro existente em FilmMetrics
        metrics = db.scalars(
            select(FilmMetricsModel).where(FilmMetricsModel.film_id == film_id)
        ).first()

        now = datetime.now(timezone.utc)

        if metrics:
            # Atualiza apenas os campos de rating aqui; (favorites/watched são recalculados em outro módulo)
            metrics.average_rating = avg_rating
            metrics.ratings_count = ratings_count
            metrics.updated_at = now
            db.commit()
        else:
            # Cria se não existir
            new_metrics = FilmMetricsModel(
                film_id=film_id,
                favorites_count=getattr(FilmMetricsModel, "favorites_count", 0) and 0,  # garante campo
                watched_count=getattr(FilmMetricsModel, "watched_count", 0) and 0,
                average_rating=avg_rating,
                ratings_count=ratings_count,
                updated_at=now,
            )
            db.add(new_metrics)
            db.commit()

    await run_in_threadpool(_op)
