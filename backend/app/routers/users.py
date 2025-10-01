# app/routers/users.py
from typing import Optional, List
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database.database import get_db
from app.database.models import User as UserModel
from app.schemas.user import UserUpdate, User

router = APIRouter(prefix="/users", tags=["users"])


@router.put("/{user_id}")
async def update_user(user_id: str, updates: UserUpdate, db: AsyncSession = Depends(get_db)):
    def _op():
        update_dict = {k: v for k, v in updates.dict().items() if v is not None}
        # Somente moderadores poderiam alterar; removendo campo se vier
        update_dict.pop("is_supporter", None)

        # Aplica o UPDATE
        stmt = update(UserModel).where(UserModel.id == user_id).values(**update_dict)
        db.execute(stmt)
        db.commit()

        # Busca o registro atualizado
        result = db.execute(select(UserModel).where(UserModel.id == user_id))
        user = result.scalars().first()
        return user

    user = await run_in_threadpool(_op)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return User.from_orm(user)


@router.post("/{user_id}/friends/{friend_id}")
async def add_friend(user_id: str, friend_id: str, db: AsyncSession = Depends(get_db)):
    """
    Adiciona 'friend_id' à lista de amigos de 'user_id' e faz o mesmo no inverso.
    O campo 'friends' pode estar armazenado como JSON (str) ou lista; tratamos ambos.
    """
    def _op():
        # Obter usuário atual
        result = db.execute(select(UserModel).where(UserModel.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")

        # Normaliza lista de amigos do user
        friends = user.friends if user.friends else []
        if isinstance(friends, str):
            try:
                friends = json.loads(friends)
            except Exception:
                friends = []

        # Adiciona friend_id se ainda não estiver
        changed_user = False
        if friend_id not in friends:
            friends.append(friend_id)
            db.execute(
                update(UserModel).where(UserModel.id == user_id).values(friends=friends)
            )
            changed_user = True

        # Obter o amigo
        result = db.execute(select(UserModel).where(UserModel.id == friend_id))
        friend = result.scalars().first()

        # Se existir, faz o vínculo recíproco
        if friend:
            friend_friends = friend.friends if friend.friends else []
            if isinstance(friend_friends, str):
                try:
                    friend_friends = json.loads(friend_friends)
                except Exception:
                    friend_friends = []

            if user_id not in friend_friends:
                friend_friends.append(user_id)
                db.execute(
                    update(UserModel)
                    .where(UserModel.id == friend_id)
                    .values(friends=friend_friends)
                )
                changed_user = True

        if changed_user:
            db.commit()

        return True

    await run_in_threadpool(_op)
    return {"message": "Amigo adicionado com sucesso"}
