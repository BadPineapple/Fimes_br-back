# app/schemas/ai.py
from typing import List
from pydantic import BaseModel, Field, ConfigDict

class AIRecommendationRequest(BaseModel):
    description: str = Field(..., min_length=5, max_length=500)
    model_config = ConfigDict(from_attributes=True)

class AIRecommendationResponse(BaseModel):
    recommendations: List[str] = Field(default_factory=list)
    explanation: str
    model_config = ConfigDict(from_attributes=True)
