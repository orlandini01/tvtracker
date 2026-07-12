"""Notificações de "novidade" (novo episódio/temporada) para séries que o
usuário está acompanhando.

Não existe um job de background separado: a checagem roda sob demanda
sempre que o usuário abre a lista de notificações (GET /notifications).
Isso é barato porque reaproveita o cache do TMDB (tmdb.get_detail já tem
TTL próprio) — na prática só bate na API de verdade quando o cache local
já expirou.

Uma série só entra na checagem se o usuário a tem favoritada ou com status
"quero_assistir"/"assistindo" (não faz sentido notificar quem já abandonou
ou não tem nenhuma relação com o título).
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.notification import Notification
from app.models.user_media_status import UserMediaStatus
from app.services import tmdb
from app.services.tmdb import TMDBError


def _shows_to_check(db: Session, user_id) -> list[Media]:
    return (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id)
        .filter(Media.media_type == "tv")
        .filter(
            (UserMediaStatus.is_favorite.is_(True))
            | (UserMediaStatus.status.in_(["quero_assistir", "assistindo"]))
        )
        .all()
    )


async def check_new_episodes(db: Session, user_id) -> None:
    for media in _shows_to_check(db, user_id):
        try:
            detail = await tmdb.get_detail(db, "tv", media.tmdb_id)
        except TMDBError:
            # Título pode ter sido removido do TMDB ou a API estar
            # instável — não deixa isso quebrar a checagem dos outros.
            continue

        seasons = detail.get("seasons") or []
        total_episodes = sum(s.get("episode_count", 0) for s in seasons)

        if media.known_episode_count is None:
            # Primeira vez que checamos esse título: só grava a baseline,
            # sem notificar (senão todo mundo receberia "novidade" pros
            # episódios que já existiam antes desse recurso existir).
            media.known_episode_count = total_episodes
            continue

        if total_episodes > media.known_episode_count:
            new_count = total_episodes - media.known_episode_count
            plural = "s" if new_count > 1 else ""
            db.add(
                Notification(
                    user_id=user_id,
                    media_id=media.id,
                    kind="new_episodes",
                    message=f'{new_count} novo{plural} episódio{plural} de "{media.title}"',
                )
            )
            media.known_episode_count = total_episodes

    db.commit()


def _to_out(notification: Notification, media: Media) -> dict:
    return {
        "id": str(notification.id),
        "media": {
            "tmdb_id": media.tmdb_id,
            "media_type": media.media_type,
            "title": media.title,
            "poster_url": media.poster_url,
        },
        "kind": notification.kind,
        "message": notification.message,
        "created_at": notification.created_at,
        "is_read": notification.read_at is not None,
    }


def list_notifications(db: Session, user_id, limit: int = 30) -> dict:
    rows = (
        db.query(Notification, Media)
        .join(Media, Notification.media_id == Media.id)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    unread = unread_count(db, user_id)
    return {"results": [_to_out(n, m) for n, m in rows], "unread_count": unread}


def unread_count(db: Session, user_id) -> int:
    return db.query(Notification).filter_by(user_id=user_id, read_at=None).count()


def mark_read(db: Session, user_id, notification_id) -> bool:
    notification = db.query(Notification).filter_by(id=notification_id, user_id=user_id).first()
    if notification is None:
        return False
    if notification.read_at is None:
        notification.read_at = datetime.now(timezone.utc)
        db.commit()
    return True


def mark_all_read(db: Session, user_id) -> None:
    db.query(Notification).filter_by(user_id=user_id, read_at=None).update({"read_at": datetime.now(timezone.utc)})
    db.commit()
