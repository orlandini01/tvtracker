"""Listas customizáveis do usuário — agora também colaborativas.

O dono (CustomList.user_id) pode convidar amigos como membros
(CustomListMember). Qualquer membro (dono ou convidado) pode ver a lista
e adicionar/remover itens; só o dono pode renomear, excluir a lista, ou
gerenciar quem é membro (convidar/remover). Convite só entre amigos —
evita spam de convite pra estranho.
"""
import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.custom_list import CustomList
from app.models.custom_list_item import CustomListItem
from app.models.custom_list_member import CustomListMember
from app.models.media import Media
from app.models.user import User
from app.models.user_media_status import UserMediaStatus
from app.services import friends as friends_service
from app.services.library import get_or_create_media
from app.services.tmdb import MediaType


class ListError(Exception):
    """Erro de regra de negócio (lista não encontrada, sem permissão,
    nome duplicado etc.) — não é erro de banco/infra."""


def _parse_uuid(value) -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise ListError("Lista não encontrada.")


def _get_owned_list(db: Session, user_id, list_id) -> CustomList:
    list_uuid = _parse_uuid(list_id)
    custom_list = db.query(CustomList).filter_by(id=list_uuid, user_id=user_id).first()
    if custom_list is None:
        raise ListError("Lista não encontrada.")
    return custom_list


def _is_member(db: Session, user_id, list_id) -> bool:
    return db.query(CustomListMember).filter_by(list_id=list_id, user_id=user_id).first() is not None


def _get_accessible_list(db: Session, user_id, list_id) -> CustomList:
    """Dono OU membro convidado — usado pra ver/editar itens da lista."""
    list_uuid = _parse_uuid(list_id)
    custom_list = db.get(CustomList, list_uuid)
    if custom_list is None:
        raise ListError("Lista não encontrada.")
    if custom_list.user_id != user_id and not _is_member(db, user_id, list_uuid):
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
    """Em quais listas (próprias OU onde é membro) esse título já está —
    usado pela página de detalhe pra desenhar os checkboxes num único
    request."""
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is None:
        return []

    rows = (
        db.query(CustomList.id)
        .join(CustomListItem, CustomListItem.list_id == CustomList.id)
        .outerjoin(CustomListMember, CustomListMember.list_id == CustomList.id)
        .filter(
            CustomListItem.media_id == media.id,
            (CustomList.user_id == user_id) | (CustomListMember.user_id == user_id),
        )
        .all()
    )
    return [str(row[0]) for row in rows]


def list_lists(db: Session, user_id) -> list[dict]:
    """Listas próprias + listas onde o usuário é membro convidado."""
    owned_ids = {row[0] for row in db.query(CustomList.id).filter_by(user_id=user_id).all()}
    member_list_ids = {row[0] for row in db.query(CustomListMember.list_id).filter_by(user_id=user_id).all()}
    all_ids = owned_ids | member_list_ids
    if not all_ids:
        return []

    custom_lists = db.query(CustomList).filter(CustomList.id.in_(all_ids)).all()

    item_counts = dict(
        db.query(CustomListItem.list_id, sa.func.count(CustomListItem.id))
        .filter(CustomListItem.list_id.in_(all_ids))
        .group_by(CustomListItem.list_id)
        .all()
    )
    member_counts = dict(
        db.query(CustomListMember.list_id, sa.func.count(CustomListMember.id))
        .filter(CustomListMember.list_id.in_(all_ids))
        .group_by(CustomListMember.list_id)
        .all()
    )

    result = [
        {
            "id": str(cl.id),
            "name": cl.name,
            "created_at": cl.created_at,
            "item_count": item_counts.get(cl.id, 0),
            "is_owner": cl.user_id == user_id,
            "member_count": member_counts.get(cl.id, 0) + 1,  # +1 pelo dono
        }
        for cl in custom_lists
    ]
    result.sort(key=lambda r: r["created_at"])
    return result


def _member_out(user: User) -> dict:
    return {"id": str(user.id), "username": user.username, "avatar_url": user.avatar_url}


def get_list_detail(db: Session, user_id, list_id) -> dict:
    custom_list = _get_accessible_list(db, user_id, list_id)
    # outerjoin com UserMediaStatus (do MESMO usuário que está vendo) só pra
    # trazer a nota já dada ao título, se houver.
    rows = (
        db.query(CustomListItem, Media, UserMediaStatus.rating)
        .join(Media, CustomListItem.media_id == Media.id)
        .outerjoin(
            UserMediaStatus,
            (UserMediaStatus.media_id == Media.id) & (UserMediaStatus.user_id == user_id),
        )
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
            "rating": rating,
        }
        for item, media, rating in rows
    ]

    owner = db.get(User, custom_list.user_id)
    member_rows = (
        db.query(User)
        .join(CustomListMember, CustomListMember.user_id == User.id)
        .filter(CustomListMember.list_id == custom_list.id)
        .all()
    )

    return {
        "id": str(custom_list.id),
        "name": custom_list.name,
        "created_at": custom_list.created_at,
        "items": items,
        "is_owner": custom_list.user_id == user_id,
        "owner": _member_out(owner),
        "members": [_member_out(u) for u in member_rows],
    }


async def add_item(db: Session, user_id, list_id, media_type: MediaType, tmdb_id: int) -> dict:
    custom_list = _get_accessible_list(db, user_id, list_id)  # valida acesso antes de tocar no TMDB
    media = await get_or_create_media(db, media_type, tmdb_id)

    exists = db.query(CustomListItem).filter_by(list_id=custom_list.id, media_id=media.id).first()
    if exists is None:
        db.add(CustomListItem(list_id=custom_list.id, media_id=media.id))
        db.commit()

    return get_list_detail(db, user_id, custom_list.id)


def remove_item(db: Session, user_id, list_id, media_type: MediaType, tmdb_id: int) -> dict:
    custom_list = _get_accessible_list(db, user_id, list_id)
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is not None:
        db.query(CustomListItem).filter_by(list_id=custom_list.id, media_id=media.id).delete()
        db.commit()

    return get_list_detail(db, user_id, custom_list.id)


def add_member(db: Session, owner_id, list_id, username: str) -> dict:
    custom_list = _get_owned_list(db, owner_id, list_id)  # só o dono convida

    target = db.query(User).filter(User.username == username).first()
    if target is None:
        raise ListError("Usuário não encontrado.")
    if target.id == owner_id:
        raise ListError("Você já é o dono dessa lista.")

    relationship = friends_service.get_relationship(db, owner_id, target.id)
    if relationship is None or relationship.status != "accepted":
        raise ListError("Só dá pra convidar amigos.")

    exists = db.query(CustomListMember).filter_by(list_id=custom_list.id, user_id=target.id).first()
    if exists is not None:
        raise ListError("Essa pessoa já é membro da lista.")

    db.add(CustomListMember(list_id=custom_list.id, user_id=target.id))
    db.commit()
    return get_list_detail(db, owner_id, custom_list.id)


def remove_member(db: Session, current_user_id, list_id, target_user_id) -> None:
    """O dono pode remover qualquer membro; um membro pode remover só a
    si mesmo ("sair da lista"). O dono nunca é removível por essa rota —
    ele só deixa de ser dono excluindo a lista inteira."""
    list_uuid = _parse_uuid(list_id)
    custom_list = db.get(CustomList, list_uuid)
    if custom_list is None:
        raise ListError("Lista não encontrada.")

    target_uuid = _parse_uuid(target_user_id)
    is_owner = custom_list.user_id == current_user_id
    is_self_removal = target_uuid == current_user_id

    if target_uuid == custom_list.user_id:
        raise ListError("O dono não pode ser removido da lista.")
    if not is_owner and not is_self_removal:
        raise ListError("Sem permissão pra remover esse membro.")

    member = db.query(CustomListMember).filter_by(list_id=custom_list.id, user_id=target_uuid).first()
    if member is None:
        raise ListError("Membro não encontrado.")

    db.delete(member)
    db.commit()
