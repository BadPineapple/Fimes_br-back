# app/database/models.py
from __future__ import annotations
from app.database.database import Base
from datetime import datetime, timezone
import uuid

from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime, JSON, Text,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship

# Use o Base central do projeto (em vez de declarative_base local)
from app.core.db import Base


def _uuid_str() -> str:
    return str(uuid.uuid4())


def _utcnow() -> datetime:
    # Armazena em UTC (timezone-aware em Python; no SQLite vira naive)
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id           = Column(String(36), primary_key=True, default=_uuid_str)
    email        = Column(String(254), unique=True, nullable=False, index=True)
    name         = Column(String(100), nullable=False)
    description  = Column(String(500), nullable=True)
    avatar_url   = Column(String, nullable=True)
    role         = Column(String(20), nullable=False, default="user")  # user | moderator | admin
    friends      = Column(JSON, default=list)  # lista de IDs ou objetos (defina depois)
    is_private   = Column(Boolean, default=False, nullable=False)
    is_supporter = Column(Boolean, default=False, nullable=False)
    created_at   = Column(DateTime, default=_utcnow, nullable=False)

    # relacionamentos (opcional)
    ratings    = relationship("UserRating", back_populates="user", cascade="all, delete-orphan")
    film_lists = relationship("FilmList", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"


class Film(Base):
    __tablename__ = "films"

    id          = Column(String(36), primary_key=True, default=_uuid_str)
    title       = Column(String(200), nullable=False, index=True)
    banner_url  = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    tags        = Column(JSON, default=list)  # ex.: ["drama","nacional"]
    year        = Column(Integer, nullable=True, index=True)
    director    = Column(String(200), nullable=True, index=True)
    actors      = Column(JSON, default=list)
    imdb_rating = Column(Float, nullable=True)
    letterboxd_rating = Column(Float, nullable=True)
    watch_links = Column(JSON, default=list)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    ratings = relationship("UserRating", back_populates="film", cascade="all, delete-orphan")
    lists   = relationship("FilmList", back_populates="film", cascade="all, delete-orphan")
    metrics = relationship("FilmMetrics", back_populates="film", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        # busca comum: título+ano
        Index("ix_films_title_year", "title", "year"),
    )

    def __repr__(self) -> str:
        return f"<Film id={self.id} title={self.title!r}>"


class UserRating(Base):
    __tablename__ = "ratings"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    film_id    = Column(String(36), ForeignKey("films.id", ondelete="CASCADE"), nullable=False, index=True)
    rating     = Column(Float, nullable=False)  # 0..10 (valide na camada de serviço)
    comment    = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("User", back_populates="ratings")
    film = relationship("Film", back_populates="ratings")

    __table_args__ = (
        # Um usuário só pode ter UMA nota por filme
        UniqueConstraint("user_id", "film_id", name="uq_ratings_user_film"),
        Index("ix_ratings_film_rating", "film_id", "rating"),
    )

    def __repr__(self) -> str:
        return f"<UserRating user={self.user_id} film={self.film_id} rating={self.rating}>"


class FilmList(Base):
    __tablename__ = "film_lists"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    user_id    = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    film_id    = Column(String(36), ForeignKey("films.id", ondelete="CASCADE"), nullable=False, index=True)
    list_type  = Column(String(20), nullable=False)  # watched | to_watch | favorites
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    user = relationship("User", back_populates="film_lists")
    film = relationship("Film", back_populates="lists")

    __table_args__ = (
        # Evita duplicar o mesmo filme na mesma lista do usuário
        UniqueConstraint("user_id", "film_id", "list_type", name="uq_film_lists_user_film_type"),
        Index("ix_film_lists_user_type", "user_id", "list_type"),
    )

    def __repr__(self) -> str:
        return f"<FilmList user={self.user_id} film={self.film_id} type={self.list_type}>"


class FilmMetrics(Base):
    __tablename__ = "film_metrics"

    film_id = Column(String(36), ForeignKey("films.id", ondelete="CASCADE"), primary_key=True)
    average_rating  = Column(Float, default=0.0, nullable=False)
    favorites_count = Column(Integer, default=0, nullable=False)
    ratings_count   = Column(Integer, default=0, nullable=False)
    watched_count   = Column(Integer, default=0, nullable=False)
    updated_at      = Column(DateTime, default=_utcnow, nullable=False)

    film = relationship("Film", back_populates="metrics")

    def __repr__(self) -> str:
        return f"<FilmMetrics film={self.film_id} avg={self.average_rating} cnt={self.ratings_count}>"
