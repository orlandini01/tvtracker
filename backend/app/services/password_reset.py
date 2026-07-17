"""Fluxo de "esqueci minha senha".

Resumo de segurança: o token bruto só existe no link do email — o banco
guarda apenas o hash sha256 dele (igual a ideia de nunca guardar senha em
texto puro, embora aqui não seja bcrypt porque o token já é um valor
aleatório de alta entropia, não uma senha escolhida por humano). O token
expira em 30 minutos e só pode ser usado uma vez (`used_at`).

`request_reset` NUNCA revela se o email existe ou não: tanto pra um email
cadastrado quanto pra um que não existe, quem chamou essa função recebe o
mesmo resultado (None) — só o comportamento interno muda (gerar token e
mandar email, ou não fazer nada). Isso evita que alguém use esse endpoint
pra descobrir quais emails têm conta no TrackerTV.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services.email import send_password_reset_email

TOKEN_TTL_MINUTES = 30


class PasswordResetError(Exception):
    """Erro de regra de negócio (token inválido, expirado ou já usado)."""


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def request_reset(db: Session, email: str) -> None:
    user = db.query(User).filter(User.email == email.strip().lower()).first()
    if user is None:
        return  # resposta pro chamador é a mesma independente disso

    raw_token = secrets.token_urlsafe(32)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES)

    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    db.commit()

    reset_link = f"{settings.frontend_url}/redefinir-senha?token={raw_token}"
    send_password_reset_email(user.email, reset_link)


def reset_password(db: Session, raw_token: str, new_password: str) -> None:
    token_hash = _hash_token(raw_token)
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()

    now = datetime.now(timezone.utc)
    if record is None or record.used_at is not None or record.expires_at < now:
        raise PasswordResetError("Link inválido ou expirado. Peça um novo.")

    user = db.get(User, record.user_id)
    if user is None:
        raise PasswordResetError("Link inválido ou expirado. Peça um novo.")

    user.hashed_password = hash_password(new_password)
    record.used_at = now
    db.commit()
