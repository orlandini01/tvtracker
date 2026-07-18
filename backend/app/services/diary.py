"""Diário: histórico cronológico de tudo que o usuário assistiu.

Dois tipos de evento, sem tabela própria (reaproveita dados que já
existem): filme marcado como "assistido" (UserMediaStatus.watched_at) e
episódios de série (WatchedEpisode), agrupados por (série, dia) — assim
uma maratona de vários episódios no mesmo dia vira UMA entrada no diário
("5 episódios de X"), não uma linha por episódio.
"""
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.models.watched_episode import WatchedEpisode


def _movie_entries(db: Session, user_id) -> list[dict]:
    rows = (
        db.query(UserMediaStatus, Media)
        .join(Media, UserMediaStatus.media_id == Media.id)
        .filter(
            UserMediaStatus.user_id == user_id,
            Media.media_type == "movie",
            UserMediaStatus.status == "assistido",
            UserMediaStatus.watched_at.isnot(None),
        )
        .all()
    )
    return [
        {
            "type": "movie",
            "watched_at": entry.watched_at,
            "media": {
                "tmdb_id": media.tmdb_id,
                "media_type": media.media_type,
                "title": media.title,
                "poster_url": media.poster_url,
            },
            "detail": None,
            "rating": entry.rating,
        }
        for entry, media in rows
    ]


def _episode_entries(db: Session, user_id) -> list[dict]:
    rows = (
        db.query(
            Media,
            sa.func.date(WatchedEpisode.watched_at).label("day"),
            sa.func.count(WatchedEpisode.id).label("episode_count"),
            sa.func.max(WatchedEpisode.watched_at).label("latest"),
            sa.func.min(WatchedEpisode.season_number).label("min_season"),
            sa.func.max(WatchedEpisode.season_number).label("max_season"),
        )
        .join(Media, WatchedEpisode.media_id == Media.id)
        .filter(WatchedEpisode.user_id == user_id)
        .group_by(Media.id, sa.func.date(WatchedEpisode.watched_at))
        .all()
    )
    entries = []
    for media, _day, episode_count, latest, min_season, max_season in rows:
        plural = "s" if episode_count > 1 else ""
        if min_season == max_season:
            detail = f"{episode_count} episódio{plural} (temporada {min_season})"
        else:
            detail = f"{episode_count} episódio{plural}"
        entries.append(
            {
                "type": "episode_group",
                "watched_at": latest,
                "media": {
                    "tmdb_id": media.tmdb_id,
                    "media_type": media.media_type,
                    "title": media.title,
                    "poster_url": media.poster_url,
                },
                "detail": detail,
                "rating": None,
            }
        )
    return entries


def get_diary(db: Session, user_id, page: int = 1, page_size: int = 20) -> dict:
    entries = _movie_entries(db, user_id) + _episode_entries(db, user_id)
    entries.sort(key=lambda e: e["watched_at"], reverse=True)

    offset = (page - 1) * page_size
    page_entries = entries[offset : offset + page_size]
    has_more = offset + page_size < len(entries)
    return {"results": page_entries, "page": page, "has_more": has_more}
