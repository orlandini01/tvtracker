"""Desafios sazonais (ex.: "5 filmes de terror em outubro").

Igual às conquistas, o progresso de cada usuário nunca fica guardado: é
calculado na hora, contando quantos filmes/episódios (ou títulos de um
gênero específico) foram assistidos dentro da janela [starts_at, ends_at)
do desafio. Desafios são globais — visíveis pra qualquer usuário do app,
não só quem criou — o que faz sentido pro tamanho desse app (você e seus
amigos), sem precisar de um conceito de "grupo" separado.
"""
import asyncio
import uuid
from datetime import datetime, timezone

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.challenge import CHALLENGE_KINDS, Challenge
from app.models.media import Media
from app.models.user import User
from app.models.user_media_status import UserMediaStatus
from app.models.watched_episode import WatchedEpisode
from app.services import friends as friends_service
from app.services import tmdb
from app.services.tmdb import TMDBError


class ChallengeError(Exception):
    """Erro de regra de negócio — não é erro de banco/infra."""


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_challenge(
    db: Session,
    user_id,
    title: str,
    description: str | None,
    kind: str,
    genre_name: str | None,
    target_count: int,
    starts_at: datetime,
    ends_at: datetime,
) -> Challenge:
    if kind not in CHALLENGE_KINDS:
        raise ChallengeError("Tipo de desafio inválido.")
    if kind == "genre_count" and not genre_name:
        raise ChallengeError("Desafios por gênero precisam de um gênero.")
    if ends_at <= starts_at:
        raise ChallengeError("A data final precisa ser depois da inicial.")

    challenge = Challenge(
        created_by=user_id,
        title=title,
        description=description,
        kind=kind,
        genre_name=genre_name if kind == "genre_count" else None,
        target_count=target_count,
        starts_at=starts_at,
        ends_at=ends_at,
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


def delete_challenge(db: Session, user_id, challenge_id) -> None:
    try:
        cid = uuid.UUID(str(challenge_id))
    except (ValueError, AttributeError, TypeError):
        raise ChallengeError("Desafio não encontrado.")
    challenge = db.query(Challenge).filter_by(id=cid, created_by=user_id).first()
    if challenge is None:
        raise ChallengeError("Desafio não encontrado.")
    db.delete(challenge)
    db.commit()


async def _genre_count_progress(db: Session, user_id, challenge: Challenge) -> int:
    movie_rows = (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(
            UserMediaStatus.user_id == user_id,
            Media.media_type == "movie",
            UserMediaStatus.status == "assistido",
            UserMediaStatus.watched_at >= challenge.starts_at,
            UserMediaStatus.watched_at < challenge.ends_at,
        )
        .all()
    )
    show_rows = (
        db.query(Media)
        .join(WatchedEpisode, WatchedEpisode.media_id == Media.id)
        .filter(
            WatchedEpisode.user_id == user_id,
            WatchedEpisode.watched_at >= challenge.starts_at,
            WatchedEpisode.watched_at < challenge.ends_at,
        )
        .distinct()
        .all()
    )
    candidates = list({m.id: m for m in movie_rows + show_rows}.values())

    async def _matches(media: Media) -> bool:
        try:
            detail = await tmdb.get_detail(db, media.media_type, media.tmdb_id)
        except TMDBError:
            return False
        return challenge.genre_name in (detail.get("genres") or [])

    if not candidates:
        return 0
    results = await asyncio.gather(*(_matches(m) for m in candidates))
    return sum(1 for ok in results if ok)


async def get_progress(db: Session, user_id, challenge: Challenge) -> dict:
    if challenge.kind == "movie_count":
        progress = (
            db.query(sa.func.count(UserMediaStatus.id))
            .join(Media, UserMediaStatus.media_id == Media.id)
            .filter(
                UserMediaStatus.user_id == user_id,
                Media.media_type == "movie",
                UserMediaStatus.status == "assistido",
                UserMediaStatus.watched_at >= challenge.starts_at,
                UserMediaStatus.watched_at < challenge.ends_at,
            )
            .scalar()
            or 0
        )
    elif challenge.kind == "episode_count":
        progress = (
            db.query(sa.func.count(WatchedEpisode.id))
            .filter(
                WatchedEpisode.user_id == user_id,
                WatchedEpisode.watched_at >= challenge.starts_at,
                WatchedEpisode.watched_at < challenge.ends_at,
            )
            .scalar()
            or 0
        )
    else:
        progress = await _genre_count_progress(db, user_id, challenge)

    return {
        "progress": min(progress, challenge.target_count),
        "target": challenge.target_count,
        "earned": progress >= challenge.target_count,
    }


def _status(challenge: Challenge) -> str:
    now = _utcnow()
    if now < challenge.starts_at:
        return "upcoming"
    if now >= challenge.ends_at:
        return "ended"
    return "active"


def to_out(challenge: Challenge, progress: dict) -> dict:
    return {
        "id": str(challenge.id),
        "title": challenge.title,
        "description": challenge.description,
        "kind": challenge.kind,
        "genre_name": challenge.genre_name,
        "target_count": challenge.target_count,
        "starts_at": challenge.starts_at,
        "ends_at": challenge.ends_at,
        "status": _status(challenge),
        "progress": progress["progress"],
        "earned": progress["earned"],
    }


async def list_challenges(db: Session, user_id) -> list[dict]:
    challenges = db.query(Challenge).order_by(Challenge.starts_at.desc()).all()
    progresses = await asyncio.gather(*(get_progress(db, user_id, c) for c in challenges))
    return [to_out(c, p) for c, p in zip(challenges, progresses)]


async def get_leaderboard(db: Session, viewer_id, challenge_id) -> dict:
    try:
        cid = uuid.UUID(str(challenge_id))
    except (ValueError, AttributeError, TypeError):
        raise ChallengeError("Desafio não encontrado.")
    challenge = db.get(Challenge, cid)
    if challenge is None:
        raise ChallengeError("Desafio não encontrado.")

    friend_ids = friends_service.get_friend_ids(db, viewer_id)
    participant_ids = [viewer_id] + friend_ids
    users = db.query(User).filter(User.id.in_(participant_ids)).all()

    progresses = await asyncio.gather(*(get_progress(db, u.id, challenge) for u in users))
    entries = [
        {
            "user": {"id": str(u.id), "username": u.username, "avatar_url": u.avatar_url},
            "progress": p["progress"],
            "earned": p["earned"],
            "is_viewer": u.id == viewer_id,
        }
        for u, p in zip(users, progresses)
    ]
    entries.sort(key=lambda e: e["progress"], reverse=True)

    viewer_progress = next((p for u, p in zip(users, progresses) if u.id == viewer_id), None)
    if viewer_progress is None:
        viewer_progress = await get_progress(db, viewer_id, challenge)

    return {"challenge": to_out(challenge, viewer_progress), "entries": entries}
