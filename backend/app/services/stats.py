"""Estatísticas avançadas do próprio usuário: distribuição por gênero,
horas totais assistidas, maior sequência de dias seguidos assistindo
algo, e atores/diretores que mais aparecem.

Filme conta pelo runtime real do TMDB; episódio usa o runtime médio de
episódio da série (o TMDB não expõe duração por episódio individual sem
buscar cada temporada, o que seria caro demais aqui) — é uma estimativa,
não uma contagem ao segundo.

Assim como em recommendations.py, os detalhes TMDB de cada título já
assistido são buscados em paralelo via asyncio.gather, reaproveitando o
cache de 24h que tmdb.get_detail já mantém (a maioria já está quente,
porque a pessoa passou pela página de detalhe do título antes)."""
import asyncio
from collections import Counter
from datetime import date

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.models.watched_episode import WatchedEpisode
from app.services import tmdb
from app.services.tmdb import TMDBError

TOP_GENRES = 8
TOP_PEOPLE = 8
CAST_WEIGHT_LIMIT = 5  # só os primeiros N do elenco contam pra "top pessoas"


def _watched_movies(db: Session, user_id) -> list[Media]:
    return (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id, Media.media_type == "movie", UserMediaStatus.status == "assistido")
        .all()
    )


def _watched_shows_with_counts(db: Session, user_id) -> list[tuple[Media, int]]:
    return (
        db.query(Media, sa.func.count(WatchedEpisode.id))
        .join(WatchedEpisode, WatchedEpisode.media_id == Media.id)
        .filter(WatchedEpisode.user_id == user_id)
        .group_by(Media.id)
        .all()
    )


async def _detail_or_none(db: Session, media_type, tmdb_id) -> dict | None:
    try:
        return await tmdb.get_detail(db, media_type, tmdb_id)
    except TMDBError:
        return None


def _watch_dates(db: Session, user_id) -> list[date]:
    movie_dates = (
        db.query(sa.func.date(UserMediaStatus.watched_at))
        .join(Media, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id, Media.media_type == "movie", UserMediaStatus.watched_at.isnot(None))
        .all()
    )
    episode_dates = db.query(sa.func.date(WatchedEpisode.watched_at)).filter(WatchedEpisode.user_id == user_id).all()
    all_dates = {d for (d,) in movie_dates} | {d for (d,) in episode_dates}
    return sorted(all_dates)


def _longest_streak(dates: list[date]) -> int:
    if not dates:
        return 0
    longest = 1
    current = 1
    for prev, curr in zip(dates, dates[1:]):
        gap = (curr - prev).days
        if gap == 1:
            current += 1
            longest = max(longest, current)
        elif gap > 1:
            current = 1
    return longest


async def get_advanced_stats(db: Session, user_id) -> dict:
    movies = _watched_movies(db, user_id)
    shows = _watched_shows_with_counts(db, user_id)

    movie_details = await asyncio.gather(*(_detail_or_none(db, "movie", m.tmdb_id) for m in movies))
    show_details = await asyncio.gather(*(_detail_or_none(db, "tv", m.tmdb_id) for m, _count in shows))

    genre_counter: Counter = Counter()
    person_counter: Counter = Counter()
    total_minutes = 0

    for detail in movie_details:
        if detail is None:
            continue
        genre_counter.update(detail.get("genres") or [])
        total_minutes += detail.get("runtime") or 0
        for cast_member in (detail.get("cast") or [])[:CAST_WEIGHT_LIMIT]:
            if cast_member.get("name"):
                person_counter[cast_member["name"]] += 1
        for director in detail.get("directors") or []:
            if director:
                person_counter[director] += 1

    for (media, episode_count), detail in zip(shows, show_details):
        if detail is None:
            continue
        genre_counter.update({g: episode_count for g in (detail.get("genres") or [])})
        episode_runtime = detail.get("runtime") or 0
        total_minutes += episode_runtime * episode_count
        for cast_member in (detail.get("cast") or [])[:CAST_WEIGHT_LIMIT]:
            if cast_member.get("name"):
                person_counter[cast_member["name"]] += episode_count
        for director in detail.get("directors") or []:
            if director:
                person_counter[director] += episode_count

    streak = _longest_streak(_watch_dates(db, user_id))
    total_rewatches = (
        db.query(sa.func.coalesce(sa.func.sum(UserMediaStatus.rewatch_count), 0))
        .filter(UserMediaStatus.user_id == user_id)
        .scalar()
    )

    return {
        "total_minutes_watched": total_minutes,
        "longest_streak_days": streak,
        "top_genres": [{"name": name, "count": count} for name, count in genre_counter.most_common(TOP_GENRES)],
        "top_people": [{"name": name, "count": count} for name, count in person_counter.most_common(TOP_PEOPLE)],
        "movies_watched": len(movies),
        "shows_watched": len(shows),
        "total_rewatches": int(total_rewatches or 0),
    }
