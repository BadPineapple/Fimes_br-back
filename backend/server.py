from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

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

class AIRecommendationRequest(BaseModel):
    description: str

class AIRecommendationResponse(BaseModel):
    recommendations: List[str]
    explanation: str

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
@api_router.post("/films/{film_id}/ratings", response_model=UserRating)
async def create_rating(film_id: str, rating_data: UserRatingCreate, user_id: str):
    """Create or update user rating for a film"""
    rating = UserRating(user_id=user_id, **rating_data.dict())
    
    # Remove existing rating if any
    await db.ratings.delete_one({"user_id": user_id, "film_id": film_id})
    
    # Insert new rating
    await db.ratings.insert_one(rating.dict())
    return rating

@api_router.get("/films/{film_id}/ratings", response_model=List[UserRating])
async def get_film_ratings(film_id: str):
    """Get all ratings for a film"""
    ratings = await db.ratings.find({"film_id": film_id}).to_list(1000)
    return [UserRating(**rating) for rating in ratings]

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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
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