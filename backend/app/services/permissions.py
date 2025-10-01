# app/services/permissions.py
from typing import Any, List
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import User as UserModel

async def check_user_banned(db: AsyncSession, user_id: str) -> bool:
    """
    Retorna True se o usuário estiver banido.
    Placeholder: atualmente sempre retorna False.
    """
    # TODO: implementar tabela/lista de banimentos, ex.: UserBans
    return False

async def can_view_user_profile(db: AsyncSession, viewer_id: str, profile_user_id: str) -> bool:
    """
    Regras:
      - O próprio usuário sempre pode ver.
      - Se o perfil não existe ou não é privado, pode ver.
      - Se é privado, somente amigos do perfil podem ver.
    """
    if viewer_id == profile_user_id:
        return True

    # Carrega o perfil do usuário
    profile = db.scalars(
        select(UserModel).where(UserModel.id == profile_user_id)
    ).first()

    # Se não existe ou não é privado, acesso liberado
    if not profile or not getattr(profile, "is_private", False):
        return True

    # Perfil é privado: verificar se viewer é amigo
    viewer = db.scalars(
        select(UserModel).where(UserModel.id == viewer_id)
    ).first()
    if not viewer:
        return False

    friends = getattr(viewer, "friends", []) or []
    if isinstance(friends, str):
        try:
            friends = json.loads(friends)
        except Exception:
            friends = []

    return profile_user_id in friends
