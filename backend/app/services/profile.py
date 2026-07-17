"""Perfil compartilhável: gera um token opaco e aleatório que, quando
ativo, permite que qualquer pessoa (sem login) veja o Wrapped do usuário
através de /public/wrapped/{token}. O token nunca expõe o user_id — é só
uma chave de busca no banco, e pode ser trocado ou desativado a qualquer
momento pelo dono, invalidando instantaneamente qualquer link já
compartilhado."""
import secrets

from sqlalchemy.orm import Session

from app.models.user import User

_TOKEN_BYTES = 24  # secrets.token_urlsafe(24) ~= 32 caracteres, 192 bits de entropia


def _generate_token() -> str:
    return secrets.token_urlsafe(_TOKEN_BYTES)


def enable_share(db: Session, user: User) -> str:
    """Garante que o usuário tenha um token ativo. Se já tiver um, retorna
    o mesmo (idempotente) — gerar um token novo só acontece explicitamente
    via rotate_share, nunca como efeito colateral de "ativar"."""
    if user.share_token:
        return user.share_token
    user.share_token = _generate_token()
    db.commit()
    db.refresh(user)
    return user.share_token


def rotate_share(db: Session, user: User) -> str:
    """Gera um token novo, invalidando qualquer link já compartilhado
    anteriormente (útil se o usuário acha que o link vazou)."""
    user.share_token = _generate_token()
    db.commit()
    db.refresh(user)
    return user.share_token


def disable_share(db: Session, user: User) -> None:
    user.share_token = None
    db.commit()


def get_user_by_share_token(db: Session, token: str) -> User | None:
    if not token:
        return None
    return db.query(User).filter(User.share_token == token).first()
