# app/routers/moderation.py
from datetime import datetime, timedelta, timezone
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc, and_

from app.core.db import get_db
from app.schemas.moderation import CommentReportCreate, CommentReport
from app.services.rate_limit import check_rate_limit
from app.services.permissions import check_user_banned

from app.models.user import User as UserModel
from app.models.user_rating import UserRating as UserRatingModel
from app.models.comment_report import CommentReport as CommentReportModel
from app.models.film import Film as FilmModel
from app.models.film_metrics import FilmMetrics as FilmMetricsModel

router = APIRouter(prefix="/moderation", tags=["moderation"])


@router.post("/comments/report")
async def report_comment(
    report_data: CommentReportCreate,
    user_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Registrar denúncia de um comentário (user_rating).
    Evita duplicidade por (comment_id, reporter_user_id).
    """
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=3, window_seconds=300):
        raise HTTPException(status_code=429, detail="Muitas denúncias")

    # Se seu check_user_banned for síncrono, remova o await
    if await check_user_banned(db, user_id):
        raise HTTPException(status_code=403, detail="Usuário banido")

    def _op():
        # Verificar se o comentário existe
        comment = db.scalars(
            select(UserRatingModel).where(UserRatingModel.id == report_data.comment_id)
        ).first()
        if not comment:
            raise HTTPException(status_code=404, detail="Comentário não encontrado")

        # Verificar duplicidade de denúncia (mesmo user já reportou este comment)
        existing = db.scalars(
            select(CommentReportModel).where(
                (CommentReportModel.comment_id == report_data.comment_id)
                & (CommentReportModel.reporter_user_id == user_id)
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=400, detail="Você já denunciou este comentário"
            )

        # Criar denúncia
        now = datetime.now(timezone.utc)
        # Se o seu schema Pydantic tiver campos diferentes, ajuste:
        data = CommentReport(
            reporter_user_id=user_id,
            **report_data.dict(),
        ).model_dump()

        # Se o modelo ORM já tiver default para status/created_at, não precisa setar aqui.
        report = CommentReportModel(**data)
        if getattr(report, "created_at", None) is None:
            report.created_at = now
        if getattr(report, "status", None) is None:
            report.status = "pending"

        db.add(report)
        db.commit()

    try:
        await run_in_threadpool(_op)
        return {"message": "Denúncia registrada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar denúncia: {str(e)}")


@router.get("/reports")
async def get_pending_reports(
    moderator_id: str,
    db: Session = Depends(get_db),
):
    """
    Lista denúncias pendentes com dados do comentário e do autor da denúncia.
    """
    def _op():
        # Verificar moderador
        moderator = db.scalars(
            select(UserModel).where(UserModel.id == moderator_id)
        ).first()
        if not moderator or getattr(moderator, "role", None) != "moderator":
            raise HTTPException(status_code=403, detail="Acesso negado")

        # Buscar reports pendentes, com JOINs para comentário e repórter
        # Estratégia: trazer tuplas (report, comment, reporter)
        stmt = (
            select(
                CommentReportModel,
                UserRatingModel,
                UserModel,
            )
            .join(
                UserRatingModel,
                CommentReportModel.comment_id == UserRatingModel.id,
                isouter=True,
            )
            .join(
                UserModel,
                CommentReportModel.reporter_user_id == UserModel.id,
                isouter=True,
            )
            .where(CommentReportModel.status == "pending")
            .order_by(desc(CommentReportModel.created_at))
            .limit(100)
        )
        rows = db.execute(stmt).all()

        results = []
        for report, comment, reporter in rows:
            # Montar payload com base no schema CommentReport
            try:
                report_payload = CommentReport.from_orm(report).model_dump()
            except Exception:
                # fallback: montar manualmente campos comuns
                report_payload = {
                    "id": getattr(report, "id", None),
                    "comment_id": getattr(report, "comment_id", None),
                    "reporter_user_id": getattr(report, "reporter_user_id", None),
                    "reason": getattr(report, "reason", None),
                    "status": getattr(report, "status", None),
                    "created_at": getattr(report, "created_at", None),
                }

            comment_text = getattr(comment, "comment", None) if comment else None
            reporter_name = getattr(reporter, "name", None) if reporter else None

            results.append(
                {
                    **report_payload,
                    "comment_text": comment_text or "Comentário não encontrado",
                    "reporter_name": reporter_name or "Usuário desconhecido",
                }
            )
        return results

    try:
        return await run_in_threadpool(_op)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar denúncias: {str(e)}")


@router.get("/dashboard")
async def get_moderator_dashboard(
    moderator_id: str,
    db: Session = Depends(get_db),
):
    """
    KPIs do moderador:
      - pending_reports: total de denúncias pendentes
      - new_profiles: usuários criados nos últimos 30 dias
      - top_rated_films: top 5 por média (com pelo menos 1 avaliação), com filme + métricas
    """
    def _op():
        # Verificar moderador
        moderator = db.scalars(
            select(UserModel).where(UserModel.id == moderator_id)
        ).first()
        if not moderator or getattr(moderator, "role", None) != "moderator":
            raise HTTPException(status_code=403, detail="Acesso negado")

        # Contar denúncias pendentes
        pending_reports = db.execute(
            select(func.count(CommentReportModel.id)).where(
                CommentReportModel.status == "pending"
            )
        ).scalar() or 0

        # Novos perfis (últimos 30 dias)
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        new_profiles = db.execute(
            select(func.count(UserModel.id)).where(
                getattr(UserModel, "created_at").between(thirty_days_ago, now)
                if hasattr(UserModel, "created_at")
                else False  # se não existir a coluna, retorna 0
            )
        ).scalar() or 0

        # Top filmes por média (com pelo menos 1 avaliação)
        # Trazemos métricas e juntamos ao filme
        top_stmt = (
            select(FilmMetricsModel, FilmModel)
            .join(FilmModel, FilmMetricsModel.film_id == FilmModel.id, isouter=True)
            .where(FilmMetricsModel.ratings_count >= 1)
            .order_by(desc(FilmMetricsModel.average_rating))
            .limit(5)
        )
        top_rows = db.execute(top_stmt).all()

        top_payload = []
        for metrics, film in top_rows:
            film_obj = {}
            if film:
                # Se você tem schema Pydantic para Film, poderia usar Film.from_orm(film).model_dump()
                film_obj = {
                    "id": getattr(film, "id", None),
                    "title": getattr(film, "title", None),
                    "year": getattr(film, "year", None),
                    "tags": getattr(film, "tags", None),
                }
                # Se tags for JSON em string, tente fazer parse para lista
                if isinstance(film_obj.get("tags"), str):
                    try:
                        film_obj["tags"] = json.loads(film_obj["tags"])
                    except Exception:
                        pass

            top_payload.append(
                {
                    "film": film_obj,
                    "metrics": {
                        "average_rating": getattr(metrics, "average_rating", 0.0),
                        "ratings_count": getattr(metrics, "ratings_count", 0),
                    },
                }
            )

        return {
            "pending_reports": pending_reports,
            "new_profiles": new_profiles,
            "top_rated_films": top_payload,
        }

    try:
        return await run_in_threadpool(_op)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao montar dashboard: {str(e)}")
