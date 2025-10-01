# app/routers/films.py
from typing import List
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.database import get_session

from app.core.db import get_db
from app.database.models import Film as FilmModel
from app.database.models import FilmMetrics as FilmMetricsModel
from app.schemas.film import Film, FilmCreate

router = APIRouter(prefix="/films", tags=["films"])

@router.get("", response_model=List[Film])
async def get_films(db: AsyncSession = Depends(get_db)):
    def _op():
        result = db.execute(select(FilmModel).limit(1000))
        return result.scalars().all()

    films = await run_in_threadpool(_op)
    return [Film.from_orm(f) for f in films]


@router.get("/featured")
async def get_featured_films(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(FilmModel).order_by(FilmModel.created_at.desc()).limit(12)
    )
    films = result.scalars().all()
    return [
        {"id": f.id, "title": f.title, "year": f.year, "banner_url": f.banner_url}
        for f in films
    ]


@router.get("/genres")
async def get_available_genres(db: AsyncSession = Depends(get_db)):
    def _op():
        result = db.execute(select(FilmModel.tags))
        return result.scalars().all()

    films_tags = await run_in_threadpool(_op)

    # Processar tags JSON para contar gêneros (em memória)
    genre_count = {}
    for film_tags in films_tags:
        if film_tags:
            tags = json.loads(film_tags) if isinstance(film_tags, str) else film_tags
            for tag in tags:
                genre_count[tag] = genre_count.get(tag, 0) + 1

    sorted_genres = sorted(genre_count.items(), key=lambda x: x[1], reverse=True)
    return [{"genre": genre, "count": count} for genre, count in sorted_genres]


@router.get("/by-genre/{genre}")
async def get_films_by_genre(genre: str, db: AsyncSession = Depends(get_db)):
    # Observação: filtro textual no JSON; pode gerar falsos positivos
    def _op():
        result = db.execute(
            select(FilmModel).where(FilmModel.tags.like(f"%{genre}%"))
        )
        return result.scalars().all()

    films = await run_in_threadpool(_op)
    return [Film.from_orm(f) for f in films]


@router.get("/{film_id}", response_model=Film)
async def get_film(film_id: str, db: AsyncSession = Depends(get_db)):
    def _op():
        result = db.execute(select(FilmModel).where(FilmModel.id == film_id))
        return result.scalars().first()

    film = await run_in_threadpool(_op)
    if not film:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return Film.from_orm(film)


@router.post("", response_model=Film)
async def create_film(film_data: FilmCreate, db: AsyncSession = Depends(get_db)):
    def _op():
        # Criar filme
        film_model = FilmModel(**film_data.dict())
        db.add(film_model)
        db.commit()
        db.refresh(film_model)

        # Criar métricas iniciais
        metrics = FilmMetricsModel(
            film_id=film_model.id,
            favorites_count=0,
            watched_count=0,
            average_rating=0.0,
            ratings_count=0,
        )
        db.add(metrics)
        db.commit()

        return film_model

    film_model = await run_in_threadpool(_op)
    return Film.from_orm(film_model)
