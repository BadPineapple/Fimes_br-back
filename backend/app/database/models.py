from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime, timezone
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    avatar_url = Column(String, nullable=True)
    role = Column(String(20), nullable=False, default="user")
    friends = Column(JSON, default=list)
    is_private = Column(Boolean, default=False)
    is_supporter = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Film(Base):
    __tablename__ = "films"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False, index=True)
    banner_url = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    tags = Column(JSON, default=list)
    year = Column(Integer, nullable=True)
    director = Column(String(200), nullable=True)
    actors = Column(JSON, default=list)
    imdb_rating = Column(Float, nullable=True)
    letterboxd_rating = Column(Float, nullable=True)
    watch_links = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class UserRating(Base):
    __tablename__ = "ratings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    film_id = Column(String, nullable=False, index=True)
    rating = Column(Float, nullable=False)
    comment = Column(String(1000), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FilmList(Base):
    __tablename__ = "film_lists"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    film_id = Column(String, nullable=False, index=True)
    list_type = Column(String(20), nullable=False)  # watched, to_watch, favorites
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class FilmMetrics(Base):
    __tablename__ = "film_metrics"
    
    film_id = Column(String, primary_key=True)
    average_rating = Column(Float, default=0.0)
    favorites_count = Column(Integer, default=0)
    ratings_count = Column(Integer, default=0)
    watched_count = Column(Integer, default=0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))