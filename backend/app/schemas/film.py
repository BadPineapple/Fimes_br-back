# app/schemas/film.py
from __future__ import annotations
from typing import Optional, List, Dict
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator
import uuid
import json

class Film(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    banner_url: Optional[str] = None
    description: str = Field(..., min_length=10, max_length=2000)
    tags: List[str] = Field(default_factory=list)
    year: Optional[int] = Field(None, ge=1890, le=2030)
    director: Optional[str] = Field(None, max_length=200)
    actors: List[str] = Field(default_factory=list)
    imdb_rating: Optional[float] = Field(None, ge=0, le=10)
    letterboxd_rating: Optional[float] = Field(None, ge=0, le=5)
    watch_links: List[Dict[str, str]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("tags", "actors", "watch_links", mode="before")
    @classmethod
    def parse_json_text_fields(cls, v):
        # Permite que campos venham como TEXT JSON do SQLite
        if v is None or isinstance(v, (list, tuple)):
            return list(v) if isinstance(v, tuple) else v
        if isinstance(v, str):
            try:
                data = json.loads(v)
                return data
            except Exception:
                return v  # deixa como está se não for JSON válido
        return v


class FilmCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str = Field(..., min_length=1, max_length=200)
    banner_url: Optional[str] = None
    description: str = Field(..., min_length=10, max_length=2000)
    tags: List[str] = Field(default_factory=list)
    year: Optional[int] = Field(None, ge=1890, le=2030)
    director: Optional[str] = Field(None, max_length=200)
    actors: List[str] = Field(default_factory=list)
    imdb_rating: Optional[float] = Field(None, ge=0, le=10)
    letterboxd_rating: Optional[float] = Field(None, ge=0, le=5)
    watch_links: List[Dict[str, str]] = Field(default_factory=list)

    @field_validator("tags", "actors", "watch_links", mode="before")
    @classmethod
    def parse_json_text_fields(cls, v):
        if v is None or isinstance(v, (list, tuple)):
            return list(v) if isinstance(v, tuple) else v
        if isinstance(v, str):
            try:
                import json
                return json.loads(v)
            except Exception:
                return v
        return v
