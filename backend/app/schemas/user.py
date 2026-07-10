import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        v = v.strip()
        if not (3 <= len(v) <= 50):
            raise ValueError("username deve ter entre 3 e 50 caracteres")
        if not re.match(r"^[a-zA-Z0-9_.]+$", v):
            raise ValueError("username só pode ter letras, números, ponto e underscore")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("senha precisa ter pelo menos 8 caracteres")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("senha precisa ter pelo menos uma letra")
        if not re.search(r"\d", v):
            raise ValueError("senha precisa ter pelo menos um número")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    preferred_language: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
