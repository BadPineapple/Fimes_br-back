# app/schemas/rating.py
from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator
import uuid

from app.services.content_filter import ContentFilter


class UserRating(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    film_id: str
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserRatingCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    film_id: str
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]):
        if v:
            is_safe, reason = ContentFilter.is_content_safe(v)
            if not is_safe:
                raise ValueError(f"Comentário rejeitado: {reason}")
        return v
