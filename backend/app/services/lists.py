"""Listas customizáveis do usuário.

Diferente do status fixo (quero_assistir/assistindo/assistido/
abandonei) e dos favoritos, essas listas são criadas livremente pelo
próprio usuário (ex: "Pra assistir com a galera", "Terror de sexta") e
um título pode estar em quantas o usuário quiser, sem relação nenhuma
com o status dele. São sempre privadas — não entram no feed nem
aparecem pra amigos.
"""
import uuid

from sqlalchemy.orm import Session

from app.models.custom_list import CustomList
from app.models.custom_list_item import CustomListItem
from app.models.media import Media
from app.services.library import get_or_create_media
from app.services.tmdb import MediaType


class ListError(Exception):
    """Erro de regra de negócio (lista não encontrada, não pertence ao
    usuário, nome duplicado etc.) — não é erro de banco/infra."""


def _get_owned_list(db: Session, user_id, list_id) -> CustomList:
    try:
        list_uuid = uuid.UUID(str(list_id))
    except (ValueError, AttributeError, TypeError):
        raise ListError("Lista não encontrada.")

    custom_list = db.query(CustomList).filter_by(id=list_uuid, user_id=user_id).first()
    if custom_list is None:
        raise ListError("Lista não encontrada.")
    return custom_list


def create_list(db: Session, user_id, name: str) -> CustomList:
    exists = db.query(CustomList).filter_by(user_id=user_id, name=name).first()
    if exists is not None:
        raise ListError("Você já tem uma lista com esse nome.")

    custom_list = CustomList(user_id=user_id, name=name)
    db.add(custom_list)
    db.commit()
    db.refresh(custom_list)
    return custom_list


def rename_list(db: Session, user_id, list_id, name: str) -> CustomList:
    custom_list = _get_owned_list(db, user_id, list_id)
    exists = (
        db.query(CustomList)
        .filter(CustomList.user_id == user_id, CustomList.name == name, CustomList.id != custom_list.id)
        .first()
    )
    if exists is not None:
        raise ListError("Você já tem uma lista com esse nome.")

    custom_list.name = name
    db.commit()
    db.refresh(custom_list)
    return custom_list


def delete_list(db: Session, user_id, list_id) -> None:
    custom_list = _get_owned_list(db, user_id, list_id)
    db.delete(custom_list)
    db.commit()


def get_membership(db: Session, user_id, media_type: MediaType, tmdb_id: int) -> list[str]:
    """Em quais listas (do usuário) esse título já está — usado pela página
    de detalhe pra desenhar os checkboxes num único request, em vez de
    buscar o detalhe completo de cada lista (era um N+1: uma query por
    lista só pra saber se o título tá lá dentro)."""
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is None:
        return []

    rows = (
        db.query(CustomList.id)
        .join(CustomListItem, CustomListItem.list_id == CustomList.id)
        .filter(CustomList.user_id == user_id, CustomListItem.media_id == media.id)
        .all()
    )
    return [str(row[0]) for row in rows]


def list_lists(db: Session, user_id) -> list[dict]:
    rows = (
        db.query(CustomList, CustomListItem.id)
        .outerjoin(CustomListItem, CustomListItem.list_id == CustomList.id)
        .filter(CustomList.user_id == user_id)
        .all()
    )
    # agrega manualmente em Python — número de listas por usuário é sempre
    # pequeno, não vale complicar a query com group_by/func.count aqui.
    counts: dict = {}
    order: list = []
    for custom_list, item_id in rows:
        if custom_list.id not in counts:
            counts[custom_list.id] = 0
            order.append(custom_list)
        if item_id is not None:
            counts[custom_list.id] += 1

    order.sort(key=lambda cl: cl.created_at)
    return [
        {"id": str(cl.id), "name": cl.name, "created_at": cl.created_at, "item_count": counts[cl.id]}
        for cl in order
    ]


def get_list_detail(db: Session, user_id, list_id) -> dict:
    custom_list = _get_owned_list(db, user_id, list_id)
    rows = (
        db.query(CustomListItem, Media)
        .join(Media, CustomListItem.media_id == Media.id)
        .filter(CustomListItem.list_id == custom_list.id)
        .order_by(CustomListItem.added_at.desc())
        .all()
    )
    items = [
        {
            "tmdb_id": media.tmdb_id,
            "media_type": media.media_type,
            "title": media.title,
            "poster_url": media.poster_url,
            "added_at": item.added_at,
        }
        for item, media in rows
    ]
    return {"id": str(custom_list.id), "name": custom_list.name, "created_at": custom_list.created_at, "items": items}


async def add_item(db: Session, user_id, list_id, media_type: MediaType, tmdb_id: int) -> dict:
    custom_list = _get_owned_list(db, user_id, list_id)  # valida posse antes de tocar no TMDB
    media = await get_or_create_media(db, media_type, tmdb_id)

    exists = db.query(CustomListItem).filter_by(list_id=custom_list.id, media_id=media.id).first()
    if exists is None:
        db.add(CustomListItem(list_id=custom_list.id, media_id=media.id))
        db.commit()

    return get_list_detail(db, user_id, custom_list.id)


def remove_item(db: Session, user_id, list_id, media_type: MediaType, tmdb_id: int) -> dict:
    custom_list = _get_owned_list(db, user_id, list_id)
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is not None:
        db.query(CustomListItem).filter_by(list_id=custom_list.id, media_id=media.id).delete()
        db.commit()

    return get_list_detail(db, user_id, custom_list.id)
