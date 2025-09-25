from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re
import time
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Filmes.br API", description="API for Brazilian Cinema Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"  # user, moderator
    friends: List[str] = []
    is_private: bool = False
    is_supporter: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str
    description: Optional[str] = None

class Film(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    banner_url: Optional[str] = None
    description: str
    tags: List[str] = []
    year: Optional[int] = None
    director: Optional[str] = None
    imdb_rating: Optional[float] = None
    letterboxd_rating: Optional[float] = None
    watch_links: List[dict] = []  # [{"platform": "Netflix", "url": "..."}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FilmCreate(BaseModel):
    title: str
    banner_url: Optional[str] = None
    description: str
    tags: List[str] = []
    year: Optional[int] = None
    director: Optional[str] = None
    imdb_rating: Optional[float] = None
    letterboxd_rating: Optional[float] = None
    watch_links: List[dict] = []

class UserRating(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    film_id: str
    rating: float  # 0-5 stars
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRatingCreate(BaseModel):
    film_id: str
    rating: float
    comment: Optional[str] = None
    
    @validator('rating')
    def validate_rating(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('Nota deve estar entre 1 e 5')
        return v
    
    @validator('comment')
    def validate_comment(cls, v):
        if v:
            is_safe, reason = ContentFilter.is_content_safe(v)
            if not is_safe:
                raise ValueError(f'Comentário rejeitado: {reason}')
        return v

class AIRecommendationRequest(BaseModel):
    description: str

class AIRecommendationResponse(BaseModel):
    recommendations: List[str]
    explanation: str

class CommentReport(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    comment_id: str
    reporter_user_id: str
    reason: str
    description: Optional[str] = None
    status: str = "pending"  # pending, reviewed, dismissed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentReportCreate(BaseModel):
    comment_id: str
    reason: str
    description: Optional[str] = None
    
    @validator('reason')
    def validate_reason(cls, v):
        allowed_reasons = ['spam', 'inappropriate', 'harassment', 'off_topic', 'other']
        if v not in allowed_reasons:
            raise ValueError('Razão inválida')
        return v

class UserBan(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    moderator_id: str
    reason: str
    duration_hours: Optional[int] = None  # None = permanent ban
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None

class FilmList(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    film_id: str
    list_type: str  # "watched", "to_watch", "favorites"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FilmListCreate(BaseModel):
    film_id: str
    list_type: str
    
    @validator('list_type')
    def validate_list_type(cls, v):
        allowed_types = ['watched', 'to_watch', 'favorites']
        if v not in allowed_types:
            raise ValueError('Tipo de lista inválido')
        return v

class UserUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    is_private: Optional[bool] = None
    is_supporter: Optional[bool] = None  # Only moderators can set this

class ModeratorAction(BaseModel):
    action_type: str  # "delete_comment", "ban_user", "add_film", "mark_supporter"
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if v != "1357":  # 4 dígitos não repetidos
            raise ValueError('Senha incorreta')
        return v

class FilmMetrics(BaseModel):
    film_id: str
    views: int = 0
    favorites_count: int = 0
    watched_count: int = 0
    average_rating: float = 0.0
    ratings_count: int = 0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentFilter:
    """Filtro de conteúdo para prevenir spam, links maliciosos e linguagem inadequada"""
    
    FORBIDDEN_WORDS = [
        'merda', 'bosta', 'caralho', 'porra', 'cu', 'buceta', 'piroca',
        'fdp', 'pqp', 'vsf', 'krl', 'puta', 'vagabundo', 'viado'
    ]
    
    SPAM_PATTERNS = [
        r'https?://[^\s]+',  # URLs
        r'www\.[^\s]+',      # www links
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # emails
        r'(\d{4,5}[-.\s]?\d{4,5})',  # phone numbers
        r'(whatsapp|telegram|instagram|facebook)',  # social media
    ]
    
    @staticmethod
    def is_content_safe(text: str) -> tuple[bool, str]:
        """Verifica se o conteúdo é seguro. Retorna (is_safe, reason)"""
        if not text or len(text.strip()) == 0:
            return False, "Comentário vazio"
            
        text_lower = text.lower()
        
        # Verifica palavrões
        for word in ContentFilter.FORBIDDEN_WORDS:
            if word in text_lower:
                return False, "Linguagem inadequada detectada"
        
        # Verifica padrões de spam
        for pattern in ContentFilter.SPAM_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return False, "Conteúdo suspeito de spam ou links não permitidos"
        
        # Verifica repetição excessiva
        if len(set(text.lower().split())) < len(text.split()) * 0.5:
            return False, "Conteúdo repetitivo detectado"
            
        # Verifica se é muito curto ou muito longo
        if len(text.strip()) < 3:
            return False, "Comentário muito curto"
        if len(text.strip()) > 1000:
            return False, "Comentário muito longo (máximo 1000 caracteres)"
            
        return True, ""

# Rate limiting simples
rate_limit_store = defaultdict(list)

def check_rate_limit(client_ip: str, max_requests: int = 10, window_seconds: int = 60) -> bool:
    """Verifica rate limiting por IP"""
    now = time.time()
    # Remove requisições antigas
    rate_limit_store[client_ip] = [
        timestamp for timestamp in rate_limit_store[client_ip]
        if now - timestamp < window_seconds
    ]
    
    # Verifica se excedeu o limite
    if len(rate_limit_store[client_ip]) >= max_requests:
        return False
    
    # Registra a nova requisição
    rate_limit_store[client_ip].append(now)
    return True

async def check_user_banned(user_id: str) -> bool:
    """Verifica se o usuário está banido"""
    now = datetime.now(timezone.utc)
    ban = await db.user_bans.find_one({
        "user_id": user_id,
        "$or": [
            {"expires_at": None},  # Ban permanente
            {"expires_at": {"$gt": now}}  # Ban ainda ativo
        ]
    })
    return ban is not None

async def can_view_user_profile(viewer_id: str, profile_user_id: str) -> bool:
    """Verifica se o usuário pode ver o perfil de outro usuário"""
    if viewer_id == profile_user_id:
        return True
    
    profile_user = await db.users.find_one({"id": profile_user_id})
    if not profile_user or not profile_user.get("is_private", False):
        return True
    
    # Perfil privado - verificar se são amigos
    viewer = await db.users.find_one({"id": viewer_id})
    if viewer and profile_user_id in viewer.get("friends", []):
        return True
    
    return False

async def initialize_moderator():
    """Inicializar usuário moderador se não existir"""
    moderator = await db.users.find_one({"email": "Moderador@Moderador.com"})
    if not moderator:
        mod_user = User(
            email="Moderador@Moderador.com",
            name="Moderador Filmes.br",
            description="Administrador da plataforma Filmes.br",
            role="moderator"
        )
        await db.users.insert_one(mod_user.dict())
        print("Moderador criado com sucesso")

# Auth endpoints
@api_router.post("/auth/login")
async def login_user(email: str):
    """Simple email-based authentication"""
    user = await db.users.find_one({"email": email})
    if not user:
        # Create new user
        new_user = User(email=email, name=email.split('@')[0])
        await db.users.insert_one(new_user.dict())
        return new_user
    return User(**user)

@api_router.get("/auth/me")
async def get_current_user(user_id: str):
    """Get current user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/auth/test-user")
async def get_test_user():
    """Get pre-authenticated test user"""
    test_email = "cinefilo.teste@filmes.br"
    user = await db.users.find_one({"email": test_email})
    if not user:
        # Create test user if doesn't exist
        test_user = User(
            email=test_email,
            name="Cinéfilo Brasileiro",
            description="Apaixonado pelo cinema nacional brasileiro. Amo desde os clássicos do Cinema Novo até as produções contemporâneas."
        )
        await db.users.insert_one(test_user.dict())
        return test_user
    return User(**user)

# User endpoints
@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict):
    """Update user profile"""
    await db.users.update_one({"id": user_id}, {"$set": updates})
    updated_user = await db.users.find_one({"id": user_id})
    return User(**updated_user)

@api_router.post("/users/{user_id}/friends/{friend_id}")
async def add_friend(user_id: str, friend_id: str):
    """Add a friend"""
    await db.users.update_one({"id": user_id}, {"$addToSet": {"friends": friend_id}})
    await db.users.update_one({"id": friend_id}, {"$addToSet": {"friends": user_id}})
    return {"message": "Friend added successfully"}

# Film endpoints
@api_router.get("/films", response_model=List[Film])
async def get_films():
    """Get all films"""
    films = await db.films.find().to_list(1000)
    return [Film(**film) for film in films]

@api_router.get("/films/featured", response_model=List[Film])
async def get_featured_films():
    """Get featured films for homepage catalog"""
    films = await db.films.find().limit(12).to_list(12)
    return [Film(**film) for film in films]

@api_router.get("/films/genres")
async def get_available_genres():
    """Get all available genres/tags"""
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    genres = await db.films.aggregate(pipeline).to_list(100)
    return [{"genre": genre["_id"], "count": genre["count"]} for genre in genres]

@api_router.get("/films/by-genre/{genre}")
async def get_films_by_genre(genre: str):
    """Get films filtered by genre"""
    films = await db.films.find({"tags": {"$regex": genre, "$options": "i"}}).to_list(1000)
    return [Film(**film) for film in films]

@api_router.get("/films/{film_id}", response_model=Film)
async def get_film(film_id: str):
    """Get specific film"""
    film = await db.films.find_one({"id": film_id})
    if not film:
        raise HTTPException(status_code=404, detail="Film not found")
    return Film(**film)

@api_router.post("/films", response_model=Film)
async def create_film(film_data: FilmCreate):
    """Create new film (moderator only)"""
    film = Film(**film_data.dict())
    await db.films.insert_one(film.dict())
    return film

@api_router.put("/films/{film_id}")
async def update_film(film_id: str, updates: dict):
    """Update film (moderator only)"""
    await db.films.update_one({"id": film_id}, {"$set": updates})
    updated_film = await db.films.find_one({"id": film_id})
    return Film(**updated_film)

@api_router.delete("/films/{film_id}")
async def delete_film(film_id: str):
    """Delete film (moderator only)"""
    result = await db.films.delete_one({"id": film_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Film not found")
    return {"message": "Film deleted successfully"}

# Rating endpoints
@api_router.post("/films/{film_id}/ratings")
async def create_rating(film_id: str, rating_data: UserRatingCreate, user_id: str, request: Request):
    """Create or update user rating for a film"""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=5, window_seconds=300):  # 5 avaliações por 5 min
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em alguns minutos.")
    
    # Verificar se usuário está banido
    if await check_user_banned(user_id):
        raise HTTPException(status_code=403, detail="Usuário banido do sistema.")
    
    # Verificar se o filme existe
    film = await db.films.find_one({"id": film_id})
    if not film:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    rating = UserRating(user_id=user_id, **rating_data.dict())
    
    # Remove existing rating if any
    await db.ratings.delete_one({"user_id": user_id, "film_id": film_id})
    
    # Insert new rating
    await db.ratings.insert_one(rating.dict())
    return rating.dict()

@api_router.get("/films/{film_id}/ratings")
async def get_film_ratings(film_id: str):
    """Get all ratings for a film with user info"""
    pipeline = [
        {"$match": {"film_id": film_id}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id", 
            "foreignField": "id",
            "as": "user"
        }},
        {"$sort": {"created_at": -1}}
    ]
    ratings = await db.ratings.aggregate(pipeline).to_list(1000)
    
    result = []
    for rating in ratings:
        rating_obj = UserRating(**rating)
        user_info = rating.get("user", [{}])[0] if rating.get("user") else {}
        result.append({
            **rating_obj.dict(),
            "user_name": user_info.get("name", "Usuário"),
            "user_avatar": user_info.get("avatar_url")
        })
    
    return result

@api_router.get("/films/{film_id}/average-rating")
async def get_film_average_rating(film_id: str):
    """Get average user rating for a film"""
    pipeline = [
        {"$match": {"film_id": film_id}},
        {"$group": {"_id": None, "average": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    result = await db.ratings.aggregate(pipeline).to_list(1)
    if result:
        return {"average": round(result[0]["average"], 1), "count": result[0]["count"]}
    return {"average": 0, "count": 0}

@api_router.get("/users/{user_id}/ratings")
async def get_user_ratings(user_id: str):
    """Get all ratings by a specific user"""
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$lookup": {
            "from": "films",
            "localField": "film_id",
            "foreignField": "id", 
            "as": "film"
        }},
        {"$sort": {"created_at": -1}}
    ]
    ratings = await db.ratings.aggregate(pipeline).to_list(1000)
    
    result = []
    for rating in ratings:
        film_info = rating.get("film", [{}])[0] if rating.get("film") else {}
        result.append({
            **UserRating(**rating).dict(),
            "film_title": film_info.get("title", "Filme não encontrado"),
            "film_year": film_info.get("year"),
            "film_banner": film_info.get("banner_url")
        })
    
    return result

# Film Lists endpoints
@api_router.post("/users/{user_id}/film-lists")
async def add_to_film_list(user_id: str, list_data: FilmListCreate, request: Request):
    """Add film to user's list (watched, to_watch, favorites)"""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Muitas tentativas.")
    
    # Verificar se usuário está banido
    if await check_user_banned(user_id):
        raise HTTPException(status_code=403, detail="Usuário banido do sistema.")
    
    # Verificar se o filme existe
    film = await db.films.find_one({"id": list_data.film_id})
    if not film:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    # Remove existing entry for this film and list type
    await db.film_lists.delete_one({
        "user_id": user_id,
        "film_id": list_data.film_id,
        "list_type": list_data.list_type
    })
    
    # Add new entry
    film_list = FilmList(user_id=user_id, **list_data.dict())
    await db.film_lists.insert_one(film_list.dict())
    
    # Update film metrics
    await update_film_metrics(list_data.film_id)
    
    return {"message": "Filme adicionado à lista com sucesso"}

@api_router.delete("/users/{user_id}/film-lists/{film_id}/{list_type}")
async def remove_from_film_list(user_id: str, film_id: str, list_type: str):
    """Remove film from user's list"""
    result = await db.film_lists.delete_one({
        "user_id": user_id,
        "film_id": film_id,
        "list_type": list_type
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado na lista")
    
    # Update film metrics
    await update_film_metrics(film_id)
    
    return {"message": "Filme removido da lista com sucesso"}

@api_router.get("/users/{user_id}/film-lists/{list_type}")
async def get_user_film_list(user_id: str, list_type: str, viewer_id: str = None):
    """Get user's film list"""
    # Verificar permissões de privacidade
    if viewer_id and not await can_view_user_profile(viewer_id, user_id):
        raise HTTPException(status_code=403, detail="Perfil privado")
    
    pipeline = [
        {"$match": {"user_id": user_id, "list_type": list_type}},
        {"$lookup": {
            "from": "films",
            "localField": "film_id",
            "foreignField": "id",
            "as": "film"
        }},
        {"$sort": {"created_at": -1}}
    ]
    
    results = await db.film_lists.aggregate(pipeline).to_list(1000)
    
    films = []
    for result in results:
        film_info = result.get("film", [{}])[0] if result.get("film") else {}
        if film_info:
            films.append({
                **Film(**film_info).dict(),
                "added_at": result["created_at"]
            })
    
    return films

async def update_film_metrics(film_id: str):
    """Atualizar métricas do filme"""
    # Contar favoritos
    favorites_count = await db.film_lists.count_documents({
        "film_id": film_id,
        "list_type": "favorites"
    })
    
    # Contar assistidos
    watched_count = await db.film_lists.count_documents({
        "film_id": film_id,
        "list_type": "watched"
    })
    
    # Calcular média de avaliações
    pipeline = [
        {"$match": {"film_id": film_id}},
        {"$group": {"_id": None, "average": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]
    rating_result = await db.ratings.aggregate(pipeline).to_list(1)
    
    avg_rating = 0.0
    ratings_count = 0
    if rating_result:
        avg_rating = round(rating_result[0]["average"], 2)
        ratings_count = rating_result[0]["count"]
    
    # Atualizar ou criar métricas
    await db.film_metrics.update_one(
        {"film_id": film_id},
        {"$set": {
            "film_id": film_id,
            "favorites_count": favorites_count,
            "watched_count": watched_count,
            "average_rating": avg_rating,
            "ratings_count": ratings_count,
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

# Comment Report endpoints
@api_router.post("/comments/report")
async def report_comment(report_data: CommentReportCreate, user_id: str, request: Request):
    """Report a comment for moderation"""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=3, window_seconds=300):  # 3 denúncias por 5 min
        raise HTTPException(status_code=429, detail="Muitas denúncias. Tente novamente em alguns minutos.")
    
    # Verificar se usuário está banido
    if await check_user_banned(user_id):
        raise HTTPException(status_code=403, detail="Usuário banido do sistema.")
    
    # Verificar se o comentário existe
    comment = await db.ratings.find_one({"id": report_data.comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    
    # Verificar se já não foi reportado pelo mesmo usuário
    existing_report = await db.comment_reports.find_one({
        "comment_id": report_data.comment_id,
        "reporter_user_id": user_id
    })
    if existing_report:
        raise HTTPException(status_code=400, detail="Você já denunciou este comentário")
    
    report = CommentReport(reporter_user_id=user_id, **report_data.dict())
    await db.comment_reports.insert_one(report.dict())
    
    return {"message": "Denúncia registrada com sucesso. Nossa equipe irá analisar em breve."}

@api_router.get("/moderation/reports")
async def get_pending_reports(moderator_id: str):
    """Get pending reports for moderation (moderator only)"""
    # Verificar se é moderador
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas moderadores.")
    
    pipeline = [
        {"$match": {"status": "pending"}},
        {"$lookup": {
            "from": "ratings",
            "localField": "comment_id",
            "foreignField": "id",
            "as": "comment"
        }},
        {"$lookup": {
            "from": "users",
            "localField": "reporter_user_id",
            "foreignField": "id",
            "as": "reporter"
        }},
        {"$sort": {"created_at": -1}}
    ]
    
    reports = await db.comment_reports.aggregate(pipeline).to_list(100)
    
    result = []
    for report in reports:
        comment_info = report.get("comment", [{}])[0] if report.get("comment") else {}
        reporter_info = report.get("reporter", [{}])[0] if report.get("reporter") else {}
        
        result.append({
            **CommentReport(**report).dict(),
            "comment_text": comment_info.get("comment", "Comentário não encontrado"),
            "reporter_name": reporter_info.get("name", "Usuário desconhecido")
        })
    
    return result

@api_router.post("/moderation/reports/{report_id}/resolve")
async def resolve_report(report_id: str, action: str, moderator_id: str):
    """Resolve a comment report (moderator only)"""
    # Verificar se é moderador
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas moderadores.")
    
    if action not in ["dismiss", "delete_comment", "ban_user"]:
        raise HTTPException(status_code=400, detail="Ação inválida")
    
    # Buscar a denúncia
    report = await db.comment_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Denúncia não encontrada")
    
    # Buscar o comentário
    comment = await db.ratings.find_one({"id": report["comment_id"]})
    
    if action == "delete_comment" and comment:
        # Deletar comentário
        await db.ratings.delete_one({"id": report["comment_id"]})
        
    elif action == "ban_user" and comment:
        # Banir usuário (24 horas)
        ban = UserBan(
            user_id=comment["user_id"],
            moderator_id=moderator_id,
            reason="Violação das regras da comunidade",
            duration_hours=24,
            expires_at=datetime.now(timezone.utc).replace(hour=datetime.now(timezone.utc).hour + 24)
        )
        await db.user_bans.insert_one(ban.dict())
        
        # Também deletar o comentário
        await db.ratings.delete_one({"id": report["comment_id"]})
    
    # Marcar denúncia como resolvida
    await db.comment_reports.update_one(
        {"id": report_id},
        {"$set": {"status": "reviewed"}}
    )
    
    return {"message": f"Denúncia resolvida com ação: {action}"}

# Moderator Dashboard endpoints
@api_router.get("/moderation/dashboard")
async def get_moderator_dashboard(moderator_id: str):
    """Get dashboard data for moderators"""
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas moderadores.")
    
    # Contar denúncias pendentes
    pending_reports = await db.comment_reports.count_documents({"status": "pending"})
    
    # Contar perfis novos (últimos 30 dias)
    thirty_days_ago = datetime.now(timezone.utc).replace(day=datetime.now(timezone.utc).day - 30)
    new_profiles = await db.users.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Top 5 filmes melhor avaliados
    top_rated_pipeline = [
        {"$match": {"ratings_count": {"$gte": 1}}},
        {"$sort": {"average_rating": -1}},
        {"$limit": 5},
        {"$lookup": {
            "from": "films",
            "localField": "film_id",
            "foreignField": "id",
            "as": "film"
        }}
    ]
    top_rated = await db.film_metrics.aggregate(top_rated_pipeline).to_list(5)
    
    # Top 5 filmes mais favoritados
    top_favorites_pipeline = [
        {"$sort": {"favorites_count": -1}},
        {"$limit": 5},
        {"$lookup": {
            "from": "films",
            "localField": "film_id", 
            "foreignField": "id",
            "as": "film"
        }}
    ]
    top_favorites = await db.film_metrics.aggregate(top_favorites_pipeline).to_list(5)
    
    # Top 5 filmes mais assistidos
    top_watched_pipeline = [
        {"$sort": {"watched_count": -1}},
        {"$limit": 5},
        {"$lookup": {
            "from": "films",
            "localField": "film_id",
            "foreignField": "id", 
            "as": "film"
        }}
    ]
    top_watched = await db.film_metrics.aggregate(top_watched_pipeline).to_list(5)
    
    return {
        "pending_reports": pending_reports,
        "new_profiles": new_profiles,
        "top_rated_films": [
            {
                "film": result.get("film", [{}])[0] if result.get("film") else {},
                "metrics": {
                    "average_rating": result["average_rating"],
                    "ratings_count": result["ratings_count"]
                }
            } for result in top_rated
        ],
        "top_favorite_films": [
            {
                "film": result.get("film", [{}])[0] if result.get("film") else {},
                "metrics": {
                    "favorites_count": result["favorites_count"]
                }
            } for result in top_favorites
        ],
        "top_watched_films": [
            {
                "film": result.get("film", [{}])[0] if result.get("film") else {},
                "metrics": {
                    "watched_count": result["watched_count"]
                }
            } for result in top_watched
        ]
    }

@api_router.post("/moderation/mark-supporter")
async def mark_user_as_supporter(user_id: str, action: ModeratorAction, moderator_id: str):
    """Mark user as supporter (moderator only)"""
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas moderadores.")
    
    # Password verification is handled by Pydantic validator
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_supporter": True}}
    )
    
    return {"message": "Usuário marcado como apoiador com sucesso"}

@api_router.get("/moderation/new-profiles")
async def get_new_profiles(moderator_id: str, days: int = 7):
    """Get recently created profiles (moderator only)"""
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas moderadores.")
    
    days_ago = datetime.now(timezone.utc).replace(day=datetime.now(timezone.utc).day - days)
    new_users = await db.users.find({
        "created_at": {"$gte": days_ago},
        "role": "user"
    }).sort("created_at", -1).to_list(100)
    
    return [User(**user) for user in new_users]

# AI Recommendation endpoint
@api_router.post("/ai/recommend", response_model=AIRecommendationResponse)
async def get_ai_recommendations(request: AIRecommendationRequest):
    """Get AI-powered film recommendations based on user description"""
    try:
        # Get available films for context
        films = await db.films.find().to_list(100)
        film_titles = [film["title"] for film in films]
        
        # Create LLM chat instance
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=str(uuid.uuid4()),
            system_message=f"""Você é um especialista em cinema brasileiro. Baseado na descrição do usuário, recomende filmes brasileiros da nossa base de dados.

Filmes disponíveis: {', '.join(film_titles)}

Responda APENAS com uma lista numerada de recomendações (máximo 5) seguida de uma breve explicação do porquê essas recomendações fazem sentido. Use português brasileiro."""
        ).with_model("openai", "gpt-4o")
        
        # Send message
        user_message = UserMessage(text=f"Quero assistir algo assim: {request.description}")
        response = await chat.send_message(user_message)
        
        # Parse response (simple parsing for now)
        lines = response.strip().split('\n')
        recommendations = []
        explanation_start = -1
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-')):
                # Extract film title from numbered list
                parts = line.split('. ', 1) if '. ' in line else line.split('- ', 1)
                if len(parts) > 1:
                    recommendations.append(parts[1].strip())
            elif len(recommendations) > 0 and explanation_start == -1:
                explanation_start = i
                break
        
        explanation = '\n'.join(lines[explanation_start:]) if explanation_start != -1 else "Essas recomendações foram baseadas na sua descrição."
        
        return AIRecommendationResponse(
            recommendations=recommendations[:5],
            explanation=explanation.strip()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na recomendação: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # In production, specify exact domains
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=600,  # Cache preflight for 10 minutes
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()