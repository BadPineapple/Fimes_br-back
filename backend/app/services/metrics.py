# app/services/metrics.py
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func, update

from app.models.film_list import FilmList as FilmListModel
from app.models.user_rating import UserRating as UserRatingModel
from app.models.film_metrics import FilmMetrics as FilmMetricsModel


def update_film_metrics(db: Session, film_id: str) -> None:
    """Recalcula métricas do filme (favoritos, assistidos, média/qtde de notas) e persiste no banco.
    Observação: se chamar a partir de um endpoint async, execute dentro de run_in_threadpool.
    """
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

    # Calcular média de avaliações e quantidade
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

    # Verificar se já existe registro em FilmMetrics
    metrics = db.scalars(
        select(FilmMetricsModel).where(FilmMetricsModel.film_id == film_id)
    ).first()

    now = datetime.now(timezone.utc)
    if metrics:
        # Atualizar existente
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
        # Criar nova
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
