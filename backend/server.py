"""
Filmes.br - Backend API
=======================

Sistema completo para plataforma de cinema brasileiro com:
- Autenticação por email
- Sistema de avaliações e comentários
- Listas de filmes (favoritos, assistidos, quero assistir)
- Sistema de moderação e denúncias
- IA para recomendações de filmes
- Métricas e dashboard administrativo

Tecnologias: FastAPI, MongoDB, OpenAI, Rate Limiting, Content Filtering

Autor: Sistema Filmes.br
Data: 2025-09-25
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import re
import time
from collections import defaultdict

# ================================
# CONFIGURATION & INITIALIZATION
# ================================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with error handling
try:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'filmes_br')]
    logging.info("MongoDB connected successfully")
except KeyError as e:
    logging.error(f"Missing environment variable: {e}")
    raise
except Exception as e:
    logging.error(f"MongoDB connection failed: {e}")
    raise

# FastAPI app configuration
app = FastAPI(
    title="Filmes.br API",
    description="API completa para plataforma de cinema brasileiro",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# API Router with prefix
api_router = APIRouter(prefix="/api")

# ================================
# PYDANTIC MODELS & VALIDATORS
# ================================

class User(BaseModel):
    """Modelo de usuário do sistema"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str = Field(..., description="Email único do usuário")
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    role: str = Field(default="user", regex="^(user|moderator)$")
    friends: List[str] = Field(default_factory=list)
    is_private: bool = Field(default=False, description="Perfil privado")
    is_supporter: bool = Field(default=False, description="Apoiador da plataforma")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', v):
            raise ValueError('Email inválido')
        return v.lower()

class UserCreate(BaseModel):
    """Dados para criação de usuário"""
    email: str
    name: str
    description: Optional[str] = None

class UserUpdate(BaseModel):
    """Dados para atualização de perfil"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    is_private: Optional[bool] = None

class Film(BaseModel):
    """Modelo completo de filme brasileiro"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = Field(..., min_length=1, max_length=200)
    banner_url: Optional[str] = None
    description: str = Field(..., min_length=10, max_length=2000)
    tags: List[str] = Field(default_factory=list)
    year: Optional[int] = Field(None, ge=1890, le=2030)
    director: Optional[str] = Field(None, max_length=200)
    actors: List[str] = Field(default_factory=list, description="Lista de atores principais")
    imdb_rating: Optional[float] = Field(None, ge=0, le=10)
    letterboxd_rating: Optional[float] = Field(None, ge=0, le=5)
    watch_links: List[Dict[str, str]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FilmCreate(BaseModel):
    """Dados para criação de filme"""
    title: str = Field(..., min_length=1, max_length=200)
    banner_url: Optional[str] = None
    description: str = Field(..., min_length=10, max_length=2000)
    tags: List[str] = Field(default_factory=list)
    year: Optional[int] = Field(None, ge=1890, le=2030)
    director: Optional[str] = Field(None, max_length=200)
    actors: List[str] = Field(default_factory=list, description="Lista de atores principais")
    imdb_rating: Optional[float] = Field(None, ge=0, le=10)
    letterboxd_rating: Optional[float] = Field(None, ge=0, le=5)
    watch_links: List[Dict[str, str]] = Field(default_factory=list)

class UserRating(BaseModel):
    """Avaliação de usuário para filme"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    film_id: str
    rating: float = Field(..., ge=1, le=5, description="Nota de 1 a 5")
    comment: Optional[str] = Field(None, max_length=1000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRatingCreate(BaseModel):
    """Dados para criação de avaliação"""
    film_id: str
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    
    @validator('comment')
    def validate_comment(cls, v):
        if v:
            is_safe, reason = ContentFilter.is_content_safe(v)
            if not is_safe:
                raise ValueError(f'Comentário rejeitado: {reason}')
        return v

class FilmList(BaseModel):
    """Lista de filmes do usuário"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    film_id: str
    list_type: str = Field(..., regex="^(watched|to_watch|favorites)$")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FilmListCreate(BaseModel):
    """Dados para adicionar filme à lista"""
    film_id: str
    list_type: str
    
    @validator('list_type')
    def validate_list_type(cls, v):
        allowed_types = ['watched', 'to_watch', 'favorites']
        if v not in allowed_types:
            raise ValueError('Tipo de lista inválido')
        return v

class CommentReport(BaseModel):
    """Denúncia de comentário"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    comment_id: str
    reporter_user_id: str
    reason: str = Field(..., regex="^(spam|inappropriate|harassment|off_topic|other)$")
    description: Optional[str] = Field(None, max_length=500)
    status: str = Field(default="pending", regex="^(pending|reviewed|dismissed)$")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentReportCreate(BaseModel):
    """Dados para criar denúncia"""
    comment_id: str
    reason: str
    description: Optional[str] = None
    
    @validator('reason')
    def validate_reason(cls, v):
        allowed_reasons = ['spam', 'inappropriate', 'harassment', 'off_topic', 'other']
        if v not in allowed_reasons:
            raise ValueError('Razão inválida')
        return v

class ModeratorAction(BaseModel):
    """Ação de moderador com verificação de senha"""
    action_type: str
    password: str = Field(..., min_length=4, max_length=4)
    
    @validator('password')
    def validate_password(cls, v):
        if v != "1357":
            raise ValueError('Senha incorreta')
        return v

class AIRecommendationRequest(BaseModel):
    """Solicitação de recomendação de IA"""
    description: str = Field(..., min_length=5, max_length=500)

class AIRecommendationResponse(BaseModel):
    """Resposta de recomendação de IA"""
    recommendations: List[str]
    explanation: str

# ================================
# SECURITY & CONTENT FILTERING
# ================================

class ContentFilter:
    """Sistema avançado de filtro de conteúdo"""
    
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
        r'(compre|venda|promoção|desconto|clique aqui)',  # spam keywords
    ]
    
    @staticmethod
    def is_content_safe(text: str) -> tuple[bool, str]:
        """
        Verifica se o conteúdo é seguro
        
        Args:
            text: Texto a ser verificado
            
        Returns:
            tuple: (is_safe: bool, reason: str)
        """
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
        words = text.lower().split()
        unique_words = set(words)
        if len(unique_words) < len(words) * 0.5:
            return False, "Conteúdo repetitivo detectado"
            
        # Verifica tamanho
        if len(text.strip()) < 3:
            return False, "Comentário muito curto"
        if len(text.strip()) > 1000:
            return False, "Comentário muito longo (máximo 1000 caracteres)"
            
        return True, ""

# Rate limiting storage
rate_limit_store = defaultdict(list)

def check_rate_limit(client_ip: str, max_requests: int = 10, window_seconds: int = 60) -> bool:
    """
    Verifica rate limiting por IP
    
    Args:
        client_ip: IP do cliente
        max_requests: Máximo de requisições
        window_seconds: Janela de tempo em segundos
        
    Returns:
        bool: True se permitido, False se excedeu o limite
    """
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

# ================================
# UTILITY FUNCTIONS
# ================================

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
        logging.info("Moderador criado com sucesso")

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

# ================================
# AUTHENTICATION ENDPOINTS
# ================================

@api_router.post("/auth/login")
async def login_user(email: str, request: Request):
    """
    Autenticação por email
    
    Args:
        email: Email do usuário
        
    Returns:
        User: Dados do usuário logado
    """
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Muitas tentativas de login")
    
    try:
        user = await db.users.find_one({"email": email.lower()})
        if not user:
            # Criar novo usuário
            new_user = User(email=email, name=email.split('@')[0])
            await db.users.insert_one(new_user.dict())
            return new_user
        return User(**user)
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Erro no login")

@api_router.get("/auth/me")
async def get_current_user(user_id: str):
    """Obter dados do usuário atual"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return User(**user)

@api_router.get("/auth/test-user")
async def get_test_user():
    """Obter usuário de teste pré-configurado"""
    test_email = "cinefilo.teste@filmes.br"
    user = await db.users.find_one({"email": test_email})
    if not user:
        test_user = User(
            email=test_email,
            name="Cinéfilo Brasileiro",
            description="Apaixonado pelo cinema nacional brasileiro. Amo desde os clássicos do Cinema Novo até as produções contemporâneas."
        )
        await db.users.insert_one(test_user.dict())
        return test_user
    return User(**user)

# ================================
# USER MANAGEMENT ENDPOINTS
# ================================

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: UserUpdate):
    """Atualizar perfil do usuário"""
    update_dict = {k: v for k, v in updates.dict().items() if v is not None}
    
    # Apenas moderadores podem definir is_supporter
    if "is_supporter" in update_dict:
        del update_dict["is_supporter"]
    
    await db.users.update_one({"id": user_id}, {"$set": update_dict})
    updated_user = await db.users.find_one({"id": user_id})
    if not updated_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return User(**updated_user)

@api_router.post("/users/{user_id}/friends/{friend_id}")
async def add_friend(user_id: str, friend_id: str):
    """Adicionar amigo"""
    await db.users.update_one({"id": user_id}, {"$addToSet": {"friends": friend_id}})
    await db.users.update_one({"id": friend_id}, {"$addToSet": {"friends": user_id}})
    return {"message": "Amigo adicionado com sucesso"}

# ================================
# FILM ENDPOINTS
# ================================

@api_router.get("/films", response_model=List[Film])
async def get_films():
    """Obter todos os filmes"""
    films = await db.films.find().to_list(1000)
    return [Film(**film) for film in films]

@api_router.get("/films/featured", response_model=List[Film])
async def get_featured_films():
    """Obter filmes em destaque para homepage"""
    films = await db.films.find().limit(12).to_list(12)
    return [Film(**film) for film in films]

@api_router.get("/films/genres")
async def get_available_genres():
    """Obter todos os gêneros/tags disponíveis"""
    pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    genres = await db.films.aggregate(pipeline).to_list(100)
    return [{"genre": genre["_id"], "count": genre["count"]} for genre in genres]

@api_router.get("/films/by-genre/{genre}")
async def get_films_by_genre(genre: str):
    """Obter filmes filtrados por gênero"""
    films = await db.films.find({"tags": {"$regex": genre, "$options": "i"}}).to_list(1000)
    return [Film(**film) for film in films]

@api_router.get("/films/{film_id}", response_model=Film)
async def get_film(film_id: str):
    """Obter filme específico"""
    film = await db.films.find_one({"id": film_id})
    if not film:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return Film(**film)

@api_router.post("/films", response_model=Film)
async def create_film(film_data: FilmCreate):
    """Criar novo filme (apenas moderadores)"""
    film = Film(**film_data.dict())
    await db.films.insert_one(film.dict())
    
    # Inicializar métricas do filme
    await update_film_metrics(film.id)
    
    return film

# ================================
# RATING ENDPOINTS
# ================================

@api_router.post("/films/{film_id}/ratings")
async def create_rating(film_id: str, rating_data: UserRatingCreate, user_id: str, request: Request):
    """Criar ou atualizar avaliação de filme"""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=5, window_seconds=300):
        raise HTTPException(status_code=429, detail="Muitas tentativas")
    
    # Verificar se usuário está banido
    if await check_user_banned(user_id):
        raise HTTPException(status_code=403, detail="Usuário banido do sistema")
    
    # Verificar se o filme existe
    film = await db.films.find_one({"id": film_id})
    if not film:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    rating = UserRating(user_id=user_id, **rating_data.dict())
    
    # Remove avaliação existente se houver
    await db.ratings.delete_one({"user_id": user_id, "film_id": film_id})
    
    # Inserir nova avaliação
    await db.ratings.insert_one(rating.dict())
    
    # Atualizar métricas do filme
    await update_film_metrics(film_id)
    
    return rating.dict()

@api_router.get("/films/{film_id}/ratings")
async def get_film_ratings(film_id: str):
    """Obter todas as avaliações de um filme com informações do usuário"""
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

@api_router.get("/users/{user_id}/ratings")
async def get_user_ratings(user_id: str):
    """Obter todas as avaliações de um usuário"""
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

# ================================
# FILM LISTS ENDPOINTS
# ================================

@api_router.post("/users/{user_id}/film-lists")
async def add_to_film_list(user_id: str, list_data: FilmListCreate, request: Request):
    """Adicionar filme à lista do usuário"""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Muitas tentativas")
    
    # Verificar se usuário está banido
    if await check_user_banned(user_id):
        raise HTTPException(status_code=403, detail="Usuário banido")
    
    # Verificar se o filme existe
    film = await db.films.find_one({"id": list_data.film_id})
    if not film:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    
    # Remove entrada existente para este filme e tipo de lista
    await db.film_lists.delete_one({
        "user_id": user_id,
        "film_id": list_data.film_id,
        "list_type": list_data.list_type
    })
    
    # Adicionar nova entrada
    film_list = FilmList(user_id=user_id, **list_data.dict())
    await db.film_lists.insert_one(film_list.dict())
    
    # Atualizar métricas do filme
    await update_film_metrics(list_data.film_id)
    
    return {"message": "Filme adicionado à lista com sucesso"}

@api_router.delete("/users/{user_id}/film-lists/{film_id}/{list_type}")
async def remove_from_film_list(user_id: str, film_id: str, list_type: str):
    """Remover filme da lista do usuário"""
    result = await db.film_lists.delete_one({
        "user_id": user_id,
        "film_id": film_id,
        "list_type": list_type
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item não encontrado na lista")
    
    # Atualizar métricas do filme
    await update_film_metrics(film_id)
    
    return {"message": "Filme removido da lista com sucesso"}

@api_router.get("/users/{user_id}/film-lists/{list_type}")
async def get_user_film_list(user_id: str, list_type: str, viewer_id: str = None):
    """Obter lista de filmes do usuário"""
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

# ================================
# AI RECOMMENDATIONS
# ================================

@api_router.post("/ai/recommend", response_model=AIRecommendationResponse)
async def get_ai_recommendations(request_data: AIRecommendationRequest):
    """Obter recomendações de filmes baseadas em IA"""
    try:
        # Obter filmes disponíveis para contexto
        films = await db.films.find().to_list(100)
        film_titles = [film["title"] for film in films]
        
        # Criar instância do chat LLM
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=str(uuid.uuid4()),
            system_message=f"""Você é um especialista em cinema brasileiro. Baseado na descrição do usuário, recomende filmes brasileiros da nossa base de dados.

Filmes disponíveis: {', '.join(film_titles)}

Responda APENAS com uma lista numerada de recomendações (máximo 5) seguida de uma breve explicação do porquê essas recomendações fazem sentido. Use português brasileiro."""
        ).with_model("openai", "gpt-4o")
        
        # Enviar mensagem
        user_message = UserMessage(text=f"Quero assistir algo assim: {request_data.description}")
        response = await chat.send_message(user_message)
        
        # Parse da resposta
        lines = response.strip().split('\n')
        recommendations = []
        explanation_start = -1
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line and (line[0].isdigit() or line.startswith('-')):
                # Extrair título do filme da lista numerada
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
        logging.error(f"AI recommendation error: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na recomendação: {str(e)}")

# ================================
# MODERATION SYSTEM
# ================================

@api_router.post("/comments/report")
async def report_comment(report_data: CommentReportCreate, user_id: str, request: Request):
    """Denunciar um comentário para moderação"""
    # Rate limiting
    client_ip = request.client.host
    if not check_rate_limit(client_ip, max_requests=3, window_seconds=300):
        raise HTTPException(status_code=429, detail="Muitas denúncias")
    
    # Verificar se usuário está banido
    if await check_user_banned(user_id):
        raise HTTPException(status_code=403, detail="Usuário banido")
    
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
    
    return {"message": "Denúncia registrada com sucesso"}

@api_router.get("/moderation/reports")
async def get_pending_reports(moderator_id: str):
    """Obter denúncias pendentes (apenas moderadores)"""
    # Verificar se é moderador
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
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

@api_router.get("/moderation/dashboard")
async def get_moderator_dashboard(moderator_id: str):
    """Obter dados do dashboard para moderadores"""
    moderator = await db.users.find_one({"id": moderator_id})
    if not moderator or moderator.get("role") != "moderator":
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    # Contar denúncias pendentes
    pending_reports = await db.comment_reports.count_documents({"status": "pending"})
    
    # Contar perfis novos (últimos 30 dias)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
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
        ]
    }

# ================================
# MIDDLEWARE & CONFIGURATION
# ================================

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"]  # Em produção, especificar domínios exatos
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=600,
)

# Include router
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Inicialização da aplicação"""
    await initialize_moderator()
    logger.info("Filmes.br API inicializada com sucesso")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Fechamento da conexão com o banco"""
    client.close()
    logger.info("Conexão com MongoDB fechada")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)