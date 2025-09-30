# app/schemas/user.py
from __future__ import annotations
from typing import Optional, List, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
import uuid
import json

Role = Literal["user", "moderator"]

class User(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    role: Role = "user"
    friends: List[str] = Field(default_factory=list)
    is_private: bool = False
    is_supporter: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: EmailStr) -> EmailStr:
        # garante e-mail em minúsculas
        return EmailStr(str(v).lower())

    @field_validator("friends", mode="before")
    @classmethod
    def parse_friends(cls, v):
        # aceita lista ou JSON em string
        if v is None:
            return []
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                data = json.loads(v)
                return data if isinstance(data, list) else []
            except Exception:
                return []
        return v


class UserCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class UserUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = None
    is_private: Optional[bool] = None
