# app/routers/user_film_lists.py
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, update

from app.core.db import get_db
from app.schemas.film_list import FilmList, FilmListCreate
from app.schemas.film import Film
from app.database.models import FilmList as FilmListModel
from app.database.models import Film as FilmModel
from app.database.models import UserRating as UserRatingModel
from app.database.models import FilmMetrics as FilmMetricsModel
from app.services.rate_limit import check_rate_limit
from app.services.permissions import check_user_banned, can_view_user_profile

router = APIRouter(prefix="/users", tags=["film_lists"])


@router.post("/{user_id}/film-lists")
async def add_to_film_list(
    user_id: str,
    list_data: FilmListCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Adicionar filme à lista do usuário"""

    # Rate limiting por IP
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Muitas tentativas")

    # Verificar se usuário está banido
    async def _check_banned():
        return await check_user_banned(db, user_id)

    # Se seu check_user_banned é síncrono, troque por chamada direta sem await/run_in_threadpool
    is_banned = await _check_banned()
    if is_banned:
        raise HTTPException(status_code=403, detail="Usuário banido")

    # Operações de DB síncronas no threadpool
    def _op():
        # Verificar se o filme existe
        film = db.scalars(
            select(FilmModel).where(FilmModel.id == list_data.film_id)
        ).first()
        if not film:
            raise HTTPException(status_code=404, detail="Filme não encontrado")

        # Remover entrada existente (unicidade por user_id/film_id/list_type)
        db.execute(
            delete(FilmListModel).where(
                (FilmListModel.user_id == user_id)
                & (FilmListModel.film_id == list_data.film_id)
                & (FilmListModel.list_type == list_data.list_type)
            )
        )

        # Adicionar nova entrada
        film_list_data = FilmList(user_id=user_id, **list_data.dict())
        film_list_model = FilmListModel(**film_list_data.dict())
        db.add(film_list_model)
        db.commit()

    try:
        await run_in_threadpool(_op)
        await update_film_metrics(list_data.film_id, db)
        return {"message": "Filme adicionado à lista com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar: {str(e)}")


@router.delete("/{user_id}/film-lists/{film_id}/{list_type}")
async def remove_from_film_list(
    user_id: str, film_id: str, list_type: str, db: AsyncSession = Depends(get_db)
):
    """Remover filme da lista do usuário"""

    def _op():
        result = db.execute(
            delete(FilmListModel).where(
                (FilmListModel.user_id == user_id)
                & (FilmListModel.film_id == film_id)
                & (FilmListModel.list_type == list_type)
            )
        )
        # rowcount pode ser None em alguns drivers; no SQLite funciona
        if getattr(result, "rowcount", 0) == 0:
            raise HTTPException(status_code=404, detail="Item não encontrado na lista")
        db.commit()

    try:
        await run_in_threadpool(_op)
        await update_film_metrics(film_id, db)
        return {"message": "Filme removido da lista com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao remover: {str(e)}")


@router.get("/{user_id}/film-lists/{list_type}")
async def get_user_film_list(
    user_id: str,
    list_type: str,
    viewer_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Obter lista de filmes do usuário, respeitando privacidade"""

    # Verificar permissões de privacidade (se sua função for síncrona, remova await)
    if viewer_id and not await can_view_user_profile(db, viewer_id, user_id):
        raise HTTPException(status_code=403, detail="Perfil privado")

    def _op():
        res = db.execute(
            select(FilmListModel, FilmModel)
            .join(FilmModel, FilmListModel.film_id == FilmModel.id)
            .where(
                (FilmListModel.user_id == user_id)
                & (FilmListModel.list_type == list_type)
            )
            .order_by(FilmListModel.created_at.desc())
            .limit(1000)
        )
        results = res.all()
        films: List[dict] = []
        for film_list, film in results:
            film_dict = Film.from_orm(film).model_dump()  # Pydantic v2
            film_dict["added_at"] = film_list.created_at
            films.append(film_dict)
        return films

    try:
        films = await run_in_threadpool(_op)
        return films
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar lista: {str(e)}")


async def update_film_metrics(film_id: str, db: AsyncSession):
    """Atualizar métricas agregadas do filme (favoritos, assistidos, média/qtde de notas)"""
    from datetime import datetime, timezone

    def _op():
        # Contar favoritos
        favorites_count = (
            db.execute(
                select(func.count(FilmListModel.id)).where(
                    (FilmListModel.film_id == film_id)
                    & (FilmListModel.list_type == "favorites")
                )
            ).scalar()
            or 0
        )

        # Contar assistidos
        watched_count = (
            db.execute(
                select(func.count(FilmListModel.id)).where(
                    (FilmListModel.film_id == film_id)
                    & (FilmListModel.list_type == "watched")
                )
            ).scalar()
            or 0
        )

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

        # Upsert em FilmMetrics
        metrics = db.scalars(
            select(FilmMetricsModel).where(FilmMetricsModel.film_id == film_id)
        ).first()

        now = datetime.now(timezone.utc)
        if metrics:
            db.execute(
                update(FilmMetricsModel)
                .where(FilmMetricsModel.film_id == film_id)
                .values(
                    favorites_count=favorites_count,
                    watched_count=watched_count,
                    average_rating=avg_rating,
                    ratings_count=ratings_count,
                    updated_at=now,
                )
            )
        else:
            new_metrics = FilmMetricsModel(
                film_id=film_id,
                favorites_count=favorites_count,
                watched_count=watched_count,
                average_rating=avg_rating,
                ratings_count=ratings_count,
                updated_at=now,
            )
            db.add(new_metrics)

        db.commit()

    await run_in_threadpool(_op)
