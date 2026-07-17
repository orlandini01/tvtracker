import uuid
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.core.validators import validate_password_strength, validate_username


class ShareStatusResponse(BaseModel):
    enabled: bool
    share_token: str | None


class ProfileStats(BaseModel):
    movies_watched: int
    shows_watched: int
    episodes_watched: int
    friends_count: int
    achievements_earned: int
    achievements_total: int


class ProfileOut(BaseModel):
    id: uuid.UUID
    username: str
    bio: str | None
    avatar_url: str | None
    created_at: datetime
    is_self: bool
    stats: ProfileStats
    # Só preenchido quando is_self=True — é uma preferência pessoal, não faz
    # sentido (nem é seguro) vazar isso no perfil visto por um amigo.
    email_notifications_enabled: bool | None = None


class UpdateBio(BaseModel):
    bio: str | None = Field(default=None, max_length=280)


class UpdateEmailNotifications(BaseModel):
    enabled: bool


class UpdateUsername(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        return validate_username(v)


class ChangePassword(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        return validate_password_strength(v)
