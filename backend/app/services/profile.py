"""Perfil compartilhável: gera um token opaco e aleatório que, quando
ativo, permite que qualquer pessoa (sem login) veja o Wrapped do usuário
através de /public/wrapped/{token}. O token nunca expõe o user_id — é só
uma chave de busca no banco, e pode ser trocado ou desativado a qualquer
momento pelo dono, invalidando instantaneamente qualquer link já
compartilhado."""
import secrets
import uuid

from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.services import friends as friends_service
from app.services.achievements import (
    _episodes_watched_count,
    _movies_watched_count,
    _shows_with_progress_count,
    get_achievements,
)

_TOKEN_BYTES = 24  # secrets.token_urlsafe(24) ~= 32 caracteres, 192 bits de entropia


class ProfileError(Exception):
    """Erro de regra de negócio (não é erro de banco/infra)."""


def get_profile_stats(db: Session, user_id) -> dict:
    achievements = get_achievements(db, user_id)
    return {
        "movies_watched": _movies_watched_count(db, user_id),
        "shows_watched": _shows_with_progress_count(db, user_id),
        "episodes_watched": _episodes_watched_count(db, user_id),
        "friends_count": len(friends_service.get_friend_ids(db, user_id)),
        "achievements_earned": sum(1 for a in achievements if a["earned"]),
        "achievements_total": len(achievements),
    }


def _profile_out(db: Session, user: User, is_self: bool) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "bio": user.bio,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at,
        "is_self": is_self,
        "stats": get_profile_stats(db, user.id),
        "email_notifications_enabled": user.email_notifications_enabled if is_self else None,
    }


def get_own_profile(db: Session, user: User) -> dict:
    return _profile_out(db, user, is_self=True)


def get_friend_profile(db: Session, viewer_id, target_user_id) -> dict:
    """Perfil de outro usuário — só visível se for o próprio (redundante com
    get_own_profile, mas mantém a rota uniforme) ou se os dois forem amigos.
    Nunca revela stats de um estranho: quem não é amigo recebe erro, não um
    perfil "vazio" (evitaria enumerar usuários por tentativa e erro)."""
    try:
        target_uuid = target_user_id if isinstance(target_user_id, uuid.UUID) else uuid.UUID(str(target_user_id))
    except (ValueError, AttributeError, TypeError):
        raise ProfileError("Usuário não encontrado.")

    target = db.get(User, target_uuid)
    if target is None:
        raise ProfileError("Usuário não encontrado.")

    is_self = target_uuid == viewer_id
    if not is_self:
        relationship = friends_service.get_relationship(db, viewer_id, target_uuid)
        if relationship is None or relationship.status != "accepted":
            raise ProfileError("Vocês precisam ser amigos pra ver esse perfil.")

    return _profile_out(db, target, is_self=is_self)


def update_bio(db: Session, user: User, bio: str | None) -> User:
    user.bio = bio
    db.commit()
    db.refresh(user)
    return user


def update_email_notifications(db: Session, user: User, enabled: bool) -> User:
    user.email_notifications_enabled = enabled
    db.commit()
    db.refresh(user)
    return user


def update_username(db: Session, user: User, username: str) -> User:
    exists = db.query(User).filter(User.username == username, User.id != user.id).first()
    if exists is not None:
        raise ProfileError("Esse username já está em uso.")
    user.username = username
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.hashed_password):
        raise ProfileError("Senha atual incorreta.")
    user.hashed_password = hash_password(new_password)
    db.commit()


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
