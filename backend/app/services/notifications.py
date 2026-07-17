"""Notificações de "novidade" (novo episódio/temporada) para séries que o
usuário está acompanhando.

Duas formas de disparar a checagem:

1. Sob demanda, só pro usuário atual, sempre que ele abre a lista de
   notificações (GET /notifications) — barato, reaproveita o cache do
   TMDB, dá feedback in-app quase imediato pra quem está usando o app.
2. Em lote, pra TODOS os usuários de uma vez, via job periódico
   (app/services/scheduler.py) — é essa checagem em lote que também
   dispara o email de "novo episódio" pra quem tiver a preferência
   ligada, porque só ela consegue alcançar quem não está com o app
   aberto no momento.

As duas escrevem no mesmo Media.known_episode_count, então rodam uma
"corrida" saudável: qualquer uma que perceber o aumento primeiro grava a
baseline nova e gera as notificações — a outra, ao rodar depois, não vê
mais aumento e não duplica nada. A diferença importante é que a checagem
em lote sempre soma TODOS os usuários que acompanham aquele título (não só
quem disparou a checagem), então ela é a única capaz de garantir que todo
mundo seja notificado mesmo que ninguém tenha aberto o app.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.notification import Notification
from app.models.user import User
from app.models.user_media_status import UserMediaStatus
from app.services import tmdb
from app.services.email import send_new_episodes_email
from app.services.tmdb import TMDBError

_TRACKED_STATUSES = ("quero_assistir", "assistindo")


def _shows_to_check(db: Session, user_id) -> list[Media]:
    return (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id)
        .filter(Media.media_type == "tv")
        .filter(
            (UserMediaStatus.is_favorite.is_(True))
            | (UserMediaStatus.status.in_(_TRACKED_STATUSES))
        )
        .all()
    )


def _tracking_user_ids(db: Session, media_id) -> list:
    rows = (
        db.query(UserMediaStatus.user_id)
        .filter(UserMediaStatus.media_id == media_id)
        .filter(
            (UserMediaStatus.is_favorite.is_(True))
            | (UserMediaStatus.status.in_(_TRACKED_STATUSES))
        )
        .distinct()
        .all()
    )
    return [r[0] for r in rows]


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


def _shows_tracked_by_anyone(db: Session) -> list[Media]:
    return (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(Media.media_type == "tv")
        .filter(
            (UserMediaStatus.is_favorite.is_(True))
            | (UserMediaStatus.status.in_(_TRACKED_STATUSES))
        )
        .distinct()
        .all()
    )


async def check_new_episodes_for_all_users(db: Session) -> int:
    """Checagem em lote: uma chamada TMDB por série (não por usuário), e
    notifica in-app TODO mundo que acompanha aquele título quando aumenta.
    Acumula as mensagens por usuário e manda um único email resumido no
    final (só pra quem tem email_notifications_enabled=True) — nunca um
    email por série. Retorna quantos emails foram enviados (útil pra log)."""
    pending_emails: dict = {}  # user_id -> list[str]

    for media in _shows_tracked_by_anyone(db):
        try:
            detail = await tmdb.get_detail(db, "tv", media.tmdb_id)
        except TMDBError:
            continue

        seasons = detail.get("seasons") or []
        total_episodes = sum(s.get("episode_count", 0) for s in seasons)

        if media.known_episode_count is None:
            media.known_episode_count = total_episodes
            continue

        if total_episodes > media.known_episode_count:
            new_count = total_episodes - media.known_episode_count
            plural = "s" if new_count > 1 else ""
            message = f'{new_count} novo{plural} episódio{plural} de "{media.title}"'

            for tracker_id in _tracking_user_ids(db, media.id):
                db.add(
                    Notification(
                        user_id=tracker_id,
                        media_id=media.id,
                        kind="new_episodes",
                        message=message,
                    )
                )
                pending_emails.setdefault(tracker_id, []).append(message)

            media.known_episode_count = total_episodes

    db.commit()

    emails_sent = 0
    if pending_emails:
        users = db.query(User).filter(User.id.in_(pending_emails.keys())).all()
        for user in users:
            if not user.email_notifications_enabled:
                continue
            send_new_episodes_email(user.email, pending_emails[user.id])
            emails_sent += 1

    return emails_sent


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
