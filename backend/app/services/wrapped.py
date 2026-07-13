""""Wrapped anual" — resumo estilo Spotify Wrapped do que o usuário
assistiu num determinado ano.

Não existe tabela própria pra isso: tudo é calculado na hora a partir de
`UserMediaStatus` (filmes marcados como "assistido") e `WatchedEpisode`
(episódios de série marcados). Gênero e duração não ficam salvos
localmente — vêm do `tmdb.get_detail`, que já tem cache próprio (TTL de
24h), então recalcular o Wrapped repetidas vezes no mesmo dia é barato.

Duração de série é aproximada: como não guardamos a duração de cada
episódio individualmente (o TMDB não expõe isso na listagem de episódios
usada por get_season_episodes), usamos a duração média do show
(episode_run_time) multiplicada pela quantidade de episódios assistidos
no ano. Quando o TMDB não informa duração, cai num valor padrão razoável.
"""
from collections import Counter

import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.models.watched_episode import WatchedEpisode
from app.services import tmdb
from app.services.tmdb import TMDBError

DEFAULT_MOVIE_MINUTES = 100
DEFAULT_EPISODE_MINUTES = 40


async def _genres_and_runtime(db: Session, media: Media) -> tuple[list[str], int | None]:
    try:
        detail = await tmdb.get_detail(db, media.media_type, media.tmdb_id)
    except TMDBError:
        return [], None
    return detail.get("genres") or [], detail.get("runtime")


def _media_out(media: Media | None) -> dict | None:
    if media is None:
        return None
    return {
        "tmdb_id": media.tmdb_id,
        "media_type": media.media_type,
        "title": media.title,
        "poster_url": media.poster_url,
    }


async def _year_stats(db: Session, user_id, year: int) -> dict:
    movie_rows = (
        db.query(UserMediaStatus, Media)
        .join(Media, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id)
        .filter(Media.media_type == "movie")
        .filter(UserMediaStatus.status == "assistido")
        .filter(sa.extract("year", UserMediaStatus.watched_at) == year)
        .all()
    )

    episode_rows = (
        db.query(WatchedEpisode.media_id, sa.func.count(WatchedEpisode.id))
        .filter(WatchedEpisode.user_id == user_id)
        .filter(sa.extract("year", WatchedEpisode.watched_at) == year)
        .group_by(WatchedEpisode.media_id)
        .all()
    )

    total_minutes = 0
    genre_counter: Counter = Counter()

    top_movie: Media | None = None
    top_movie_rating = -1
    for entry, media in movie_rows:
        genres, runtime = await _genres_and_runtime(db, media)
        total_minutes += runtime or DEFAULT_MOVIE_MINUTES
        genre_counter.update(genres)
        rating = entry.rating or 0
        if rating > top_movie_rating:
            top_movie_rating = rating
            top_movie = media

    show_media_map: dict = {}
    if episode_rows:
        show_ids = [media_id for media_id, _ in episode_rows]
        show_media_map = {m.id: m for m in db.query(Media).filter(Media.id.in_(show_ids)).all()}

    total_episodes = 0
    top_show: Media | None = None
    top_show_episode_count = 0
    for media_id, episode_count in episode_rows:
        media = show_media_map.get(media_id)
        if media is None:
            continue
        genres, runtime = await _genres_and_runtime(db, media)
        total_minutes += episode_count * (runtime or DEFAULT_EPISODE_MINUTES)
        genre_counter.update(genres)
        total_episodes += episode_count
        if episode_count > top_show_episode_count:
            top_show_episode_count = episode_count
            top_show = media

    top_genres = [{"name": name, "count": count} for name, count in genre_counter.most_common(5)]

    return {
        "total_minutes": total_minutes,
        "total_movies": len(movie_rows),
        "total_shows": len(episode_rows),
        "total_episodes": total_episodes,
        "top_genres": top_genres,
        "top_show": top_show,
        "top_show_episode_count": top_show_episode_count if top_show else None,
        "top_movie": top_movie,
    }


async def get_wrapped(db: Session, user_id, year: int) -> dict:
    current = await _year_stats(db, user_id, year)
    previous = await _year_stats(db, user_id, year - 1)

    current_hours = round(current["total_minutes"] / 60, 1)
    previous_hours = round(previous["total_minutes"] / 60, 1)

    hours_change_pct = None
    if previous_hours > 0:
        hours_change_pct = round((current_hours - previous_hours) / previous_hours * 100, 1)

    return {
        "year": year,
        "total_hours": current_hours,
        "total_movies": current["total_movies"],
        "total_shows": current["total_shows"],
        "total_episodes": current["total_episodes"],
        "top_genres": current["top_genres"],
        "top_show": _media_out(current["top_show"]),
        "top_show_episode_count": current["top_show_episode_count"],
        "top_movie": _media_out(current["top_movie"]),
        "previous_year_hours": previous_hours,
        "hours_change_pct": hours_change_pct,
    }
