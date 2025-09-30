# app/schemas/film_list.py
from __future__ import annotations
from typing import Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict
import uuid

# Valores aceitos para o tipo de lista (iguais aos do seu arquivo original)
ListType = Literal["watched", "to_watch", "favorites"]

class FilmList(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    film_id: str
    list_type: ListType
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FilmListCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    film_id: str
    list_type: ListType
