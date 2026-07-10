import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt: nunca armazenar/logar senha em texto puro.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(subject: str, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(user_id: str) -> str:
    return _create_token(
        user_id,
        timedelta(minutes=settings.access_token_expire_minutes),
        "access",
    )


def create_refresh_token(user_id: str) -> str:
    return _create_token(
        user_id,
        timedelta(days=settings.refresh_token_expire_days),
        "refresh",
    )


def decode_token(token: str) -> dict:
    """Levanta jose.JWTError se inválido/expirado — quem chama trata o erro."""
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])


class TokenError(Exception):
    pass


def decode_token_of_type(token: str, expected_type: str) -> dict:
    try:
        payload = decode_token(token)
    except JWTError as exc:
        raise TokenError("token inválido ou expirado") from exc
    if payload.get("type") != expected_type:
        raise TokenError(f"esperado token do tipo '{expected_type}'")
    return payload
