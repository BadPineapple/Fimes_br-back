# app/routers/ai.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.db import get_db
from app.database.models import Film
from app.schemas.ai import AIRecommendationRequest, AIRecommendationResponse
from app.services.ai_recommender import recommend_from_description

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/recommend", response_model=AIRecommendationResponse)
async def get_ai_recommendations(
    request_data: AIRecommendationRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        # Busca só os títulos (máx. 100) sem bloquear o event loop
        def _load_titles():
            # select(Film.title) retorna 1 coluna; scalars() devolve só os valores
            return db.scalars(select(Film.title).limit(100)).all()

        titles = await run_in_threadpool(_load_titles)

        # Serviço de recomendação (já era async)
        recs, expl = await recommend_from_description(titles, request_data.description)

        return AIRecommendationResponse(
            recommendations=recs[:5],
            explanation=expl
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na recomendação: {str(e)}")
