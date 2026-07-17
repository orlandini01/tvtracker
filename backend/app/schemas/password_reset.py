from pydantic import BaseModel, EmailStr, field_validator

from app.core.validators import validate_password_strength


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strong(cls, v: str) -> str:
        return validate_password_strength(v)
