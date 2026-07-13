"""Recomendações personalizadas.

Não é o mesmo que "recomendado por um amigo" (isso já existe em
services/compare.py). Aqui o perfil de gosto é construído a partir dos
próprios títulos com que o usuário demonstrou gostar de verdade —
favoritou, avaliou bem (nota >= 7) ou assistiu por completo — extraímos
os gêneros mais comuns entre eles (via tmdb.get_detail, que já tem cache
próprio) e usamos /discover filtrado por esses gêneros pra sugerir
títulos parecidos que ele ainda não rastreou.

Conta nova ou sem sinal suficiente: caímos pros populares (mesma lista
que já aparece na home), pra nunca devolver uma seção vazia sem
explicação.

Perf: os `get_detail` por título de sinal (pra extrair gênero) e o par
filmes/séries são buscados em paralelo via asyncio.gather — cada título
já favoritado/avaliado bem costuma ter cache TMDB próprio (24h), mas
buscar um por um em série soma a latência de rede de todos eles; em
paralelo, o tempo total fica perto do maior request individual.
"""
import asyncio
from collections import Counter

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.services import tmdb
from app.services.tmdb import MediaType, TMDBError

POSITIVE_RATING_THRESHOLD = 7
TOP_GENRES_PER_TYPE = 3
RESULTS_LIMIT = 15

FALLBACK_CATEGORY: dict[MediaType, str] = {"movie": "popular_movies", "tv": "popular_tv"}


def _tracked_tmdb_ids(db: Session, user_id, media_type: MediaType) -> set[int]:
    rows = (
        db.query(Media.tmdb_id)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id, Media.media_type == media_type)
        .all()
    )
    return {r[0] for r in rows}


def _signal_media(db: Session, user_id, media_type: MediaType) -> list[Media]:
    rows = (
        db.query(UserMediaStatus, Media)
        .join(Media, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id, Media.media_type == media_type)
        .filter(
            or_(
                UserMediaStatus.is_favorite.is_(True),
                UserMediaStatus.rating >= POSITIVE_RATING_THRESHOLD,
                UserMediaStatus.status == "assistido",
            )
        )
        .all()
    )
    return [media for _entry, media in rows]


async def _detail_or_none(db: Session, media_type: MediaType, tmdb_id: int) -> dict | None:
    try:
        return await tmdb.get_detail(db, media_type, tmdb_id)
    except TMDBError:
        return None


async def _top_genre_ids(db: Session, user_id, media_type: MediaType) -> list[int]:
    signal = _signal_media(db, user_id, media_type)
    if not signal:
        return []

    details = await asyncio.gather(*(_detail_or_none(db, media_type, media.tmdb_id) for media in signal))

    genre_counter: Counter = Counter()
    for detail in details:
        if detail is None:
            continue
        genre_counter.update(detail.get("genres") or [])

    if not genre_counter:
        return []

    top_names = [name for name, _count in genre_counter.most_common(TOP_GENRES_PER_TYPE)]
    genre_map = await tmdb.get_genre_map(db, media_type)
    return [genre_map[name] for name in top_names if name in genre_map]


async def _recommend_for_type(db: Session, user_id, media_type: MediaType) -> list[dict]:
    tracked = _tracked_tmdb_ids(db, user_id, media_type)

    try:
        genre_ids = await _top_genre_ids(db, user_id, media_type)
        if genre_ids:
            data = await tmdb.discover_by_genres(db, media_type, genre_ids)
        else:
            data = await tmdb.discover(db, FALLBACK_CATEGORY[media_type])
    except TMDBError:
        return []

    results = [r for r in data.get("results", []) if r["tmdb_id"] not in tracked]
    return results[:RESULTS_LIMIT]


async def get_recommendations(db: Session, user_id) -> dict:
    movies, shows = await asyncio.gather(
        _recommend_for_type(db, user_id, "movie"),
        _recommend_for_type(db, user_id, "tv"),
    )
    return {"movies": movies, "shows": shows}
