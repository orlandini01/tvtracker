"""Progresso de episódios assistidos por série.

Não geramos `Activity` por episódio marcado — isso encheria o feed dos
amigos de ruído (uma série pode ter dezenas de episódios). O status geral
("assistido" etc.) e a nota continuam sendo o que aparece no feed.
"""
from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.watched_episode import WatchedEpisode
from app.services.library import get_or_create_media
from app.services.tmdb import get_season_episodes


def _watched_numbers(db: Session, user_id, media_id, season_number: int) -> set[int]:
    rows = (
        db.query(WatchedEpisode.episode_number)
        .filter_by(user_id=user_id, media_id=media_id, season_number=season_number)
        .all()
    )
    return {r[0] for r in rows}


async def list_season_with_progress(db: Session, user_id, tmdb_id: int, season_number: int) -> dict:
    media = await get_or_create_media(db, "tv", tmdb_id)
    episodes = await get_season_episodes(db, tmdb_id, season_number)
    watched = _watched_numbers(db, user_id, media.id, season_number)

    return {
        "season_number": season_number,
        "episodes": [{**e, "watched": e["episode_number"] in watched} for e in episodes],
    }


async def mark_episode(db: Session, user_id, tmdb_id: int, season_number: int, episode_number: int) -> None:
    media = await get_or_create_media(db, "tv", tmdb_id)
    exists = (
        db.query(WatchedEpisode)
        .filter_by(user_id=user_id, media_id=media.id, season_number=season_number, episode_number=episode_number)
        .first()
    )
    if exists is None:
        db.add(
            WatchedEpisode(
                user_id=user_id, media_id=media.id, season_number=season_number, episode_number=episode_number
            )
        )
        db.commit()


def unmark_episode(db: Session, user_id, tmdb_id: int, season_number: int, episode_number: int) -> None:
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type="tv").first()
    if media is None:
        return
    db.query(WatchedEpisode).filter_by(
        user_id=user_id, media_id=media.id, season_number=season_number, episode_number=episode_number
    ).delete()
    db.commit()


async def mark_season(db: Session, user_id, tmdb_id: int, season_number: int) -> None:
    media = await get_or_create_media(db, "tv", tmdb_id)
    episodes = await get_season_episodes(db, tmdb_id, season_number)
    already_watched = _watched_numbers(db, user_id, media.id, season_number)

    for ep in episodes:
        if ep["episode_number"] not in already_watched:
            db.add(
                WatchedEpisode(
                    user_id=user_id,
                    media_id=media.id,
                    season_number=season_number,
                    episode_number=ep["episode_number"],
                )
            )
    db.commit()


def get_show_progress(db: Session, user_id, tmdb_id: int, seasons: list[dict]) -> dict:
    """`seasons` vem do MediaDetail já carregado (evita nova chamada ao
    TMDB só pra saber o total de episódios da série)."""
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type="tv").first()
    total_count = sum(s["episode_count"] for s in seasons)
    if media is None:
        return {"watched_count": 0, "total_count": total_count}

    watched_count = db.query(WatchedEpisode).filter_by(user_id=user_id, media_id=media.id).count()
    return {"watched_count": watched_count, "total_count": total_count}
