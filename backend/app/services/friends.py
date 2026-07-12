"""Regras de negócio de amizades.

Uma única tabela `friendships` guarda tanto pedidos pendentes quanto
amizades já aceitas. Para qualquer par de usuários só existe no máximo uma
linha (em qualquer direção) — pedidos recusados e amizades desfeitas são
apagados, não guardamos histórico.
"""
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.friendship import Friendship
from app.models.user import User


class FriendError(Exception):
    """Erro de regra de negócio (não é erro de banco/infra)."""


def _pair_filter(user_a_id, user_b_id):
    return or_(
        (Friendship.requester_id == user_a_id) & (Friendship.addressee_id == user_b_id),
        (Friendship.requester_id == user_b_id) & (Friendship.addressee_id == user_a_id),
    )


def get_relationship(db: Session, user_a_id, user_b_id) -> Friendship | None:
    if user_a_id == user_b_id:
        return None
    return db.query(Friendship).filter(_pair_filter(user_a_id, user_b_id)).first()


def relationship_status(db: Session, viewer_id, other_id) -> str:
    if viewer_id == other_id:
        return "none"
    rel = get_relationship(db, viewer_id, other_id)
    if rel is None:
        return "none"
    if rel.status == "accepted":
        return "friends"
    # pending
    if rel.requester_id == viewer_id:
        return "pending_outgoing"
    return "pending_incoming"


def search_users(db: Session, current_user_id, query: str, limit: int = 10) -> list[tuple[User, str]]:
    query = query.strip()
    if len(query) < 2:
        return []
    users = (
        db.query(User)
        .filter(User.username.ilike(f"%{query}%"))
        .filter(User.id != current_user_id)
        .order_by(User.username.asc())
        .limit(limit)
        .all()
    )
    return [(u, relationship_status(db, current_user_id, u.id)) for u in users]


def send_request(db: Session, requester_id, target_username: str) -> Friendship:
    target = db.query(User).filter(User.username == target_username).first()
    if target is None:
        raise FriendError("Usuário não encontrado.")
    if target.id == requester_id:
        raise FriendError("Você não pode adicionar você mesmo.")

    existing = get_relationship(db, requester_id, target.id)
    if existing is not None:
        if existing.status == "accepted":
            raise FriendError("Vocês já são amigos.")
        # já existe um pedido pendente
        if existing.requester_id == requester_id:
            raise FriendError("Pedido já enviado.")
        # a outra pessoa já te chamou primeiro -> aceita automaticamente
        existing.status = "accepted"
        db.commit()
        db.refresh(existing)
        return existing

    friendship = Friendship(requester_id=requester_id, addressee_id=target.id, status="pending")
    db.add(friendship)
    db.commit()
    db.refresh(friendship)
    return friendship


def list_incoming_requests(db: Session, user_id) -> list[Friendship]:
    return (
        db.query(Friendship)
        .filter(Friendship.addressee_id == user_id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
        .all()
    )


def list_outgoing_requests(db: Session, user_id) -> list[Friendship]:
    return (
        db.query(Friendship)
        .filter(Friendship.requester_id == user_id, Friendship.status == "pending")
        .order_by(Friendship.created_at.desc())
        .all()
    )


def accept_request(db: Session, user_id, friendship_id) -> Friendship:
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if friendship is None or friendship.status != "pending" or friendship.addressee_id != user_id:
        raise FriendError("Pedido não encontrado.")
    from datetime import datetime, timezone

    friendship.status = "accepted"
    friendship.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(friendship)
    return friendship


def remove_relationship(db: Session, user_id, friendship_id) -> bool:
    """Usado tanto para recusar/cancelar um pedido pendente quanto para
    desfazer uma amizade já aceita — em ambos os casos, um dos dois lados
    precisa ser o usuário atual."""
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if friendship is None:
        return False
    if friendship.requester_id != user_id and friendship.addressee_id != user_id:
        return False
    db.delete(friendship)
    db.commit()
    return True


def remove_friend_by_user_id(db: Session, user_id, friend_id) -> bool:
    friendship = db.query(Friendship).filter(
        _pair_filter(user_id, friend_id), Friendship.status == "accepted"
    ).first()
    if friendship is None:
        return False
    db.delete(friendship)
    db.commit()
    return True


def list_friends(db: Session, user_id) -> list[User]:
    rows = (
        db.query(Friendship)
        .filter(
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
            Friendship.status == "accepted",
        )
        .all()
    )
    friend_ids = [
        (r.addressee_id if r.requester_id == user_id else r.requester_id) for r in rows
    ]
    if not friend_ids:
        return []
    return db.query(User).filter(User.id.in_(friend_ids)).order_by(User.username.asc()).all()


def get_friend_ids(db: Session, user_id) -> list[uuid.UUID]:
    rows = (
        db.query(Friendship)
        .filter(
            or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
            Friendship.status == "accepted",
        )
        .all()
    )
    return [(r.addressee_id if r.requester_id == user_id else r.requester_id) for r in rows]
