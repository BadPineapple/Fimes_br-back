# app/schemas/moderation.py
from __future__ import annotations
from typing import Optional, Literal
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, field_validator
import uuid

Reason = Literal["spam", "inappropriate", "harassment", "off_topic", "other"]
Status = Literal["pending", "reviewed", "dismissed"]

class CommentReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    comment_id: str
    reporter_user_id: str
    reason: Reason
    description: Optional[str] = Field(None, max_length=500)
    status: Status = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CommentReportCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comment_id: str
    reason: Reason
    description: Optional[str] = None


class ModeratorAction(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    action_type: str
    password: str = Field(..., min_length=4, max_length=4)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if v != "1357":
            raise ValueError("Senha incorreta")
        return v
