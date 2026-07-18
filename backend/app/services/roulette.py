"""Roleta: sorteia um título aleatório pra resolver o momento de
indecisão "o que assistir hoje" — da lista "quero assistir" pessoal do
usuário, ou de uma lista customizada específica (inclusive colaborativa,
desde que o usuário seja dono ou membro dela)."""
import random
import uuid

from sqlalchemy.orm import Session

from app.models.custom_list import CustomList
from app.models.custom_list_item import CustomListItem
from app.models.custom_list_member import CustomListMember
from app.models.media import Media
from app.models.user_media_status import UserMediaStatus


class RouletteError(Exception):
    """Erro de regra de negócio (lista não encontrada/sem acesso) — não é
    erro de banco/infra."""


def _has_access(db: Session, user_id, list_id) -> bool:
    custom_list = db.get(CustomList, list_id)
    if custom_list is None:
        return False
    if custom_list.user_id == user_id:
        return True
    return db.query(CustomListMember).filter_by(list_id=list_id, user_id=user_id).first() is not None


def spin(db: Session, user_id, list_id: str | None) -> dict | None:
    if list_id:
        try:
            list_uuid = uuid.UUID(str(list_id))
        except (ValueError, AttributeError, TypeError):
            raise RouletteError("Lista não encontrada.")
        if not _has_access(db, user_id, list_uuid):
            raise RouletteError("Lista não encontrada.")
        candidates = (
            db.query(Media)
            .join(CustomListItem, CustomListItem.media_id == Media.id)
            .filter(CustomListItem.list_id == list_uuid)
            .all()
        )
    else:
        candidates = (
            db.query(Media)
            .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
            .filter(UserMediaStatus.user_id == user_id, UserMediaStatus.status == "quero_assistir")
            .all()
        )

    if not candidates:
        return None

    chosen = random.choice(candidates)
    return {
        "tmdb_id": chosen.tmdb_id,
        "media_type": chosen.media_type,
        "title": chosen.title,
        "poster_url": chosen.poster_url,
    }
