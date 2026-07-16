"""Calendário de lançamentos: próximos episódios (séries) e estreias
(filmes) dos títulos que o usuário acompanha.

Mesmo critério de elegibilidade usado nas notificações de novo episódio
(favoritado OU status "quero_assistir"/"assistindo") — não faz sentido
avisar quem já abandonou o título ou nunca teve relação com ele.
"""
import asyncio
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.services import tmdb
from app.services.tmdb import TMDBError


def _tracked_media(db: Session, user_id) -> list[Media]:
    return (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id)
        .filter(
            (UserMediaStatus.is_favorite.is_(True))
            | (UserMediaStatus.status.in_(["quero_assistir", "assistindo"]))
        )
        .all()
    )


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


async def _detail_or_none(db: Session, media: Media) -> dict | None:
    try:
        return await tmdb.get_detail(db, media.media_type, media.tmdb_id)
    except TMDBError:
        # Título pode ter sido removido do TMDB ou a API estar instável —
        # não deixa isso quebrar o calendário inteiro.
        return None


async def get_calendar(db: Session, user_id) -> list[dict]:
    tracked = _tracked_media(db, user_id)
    today = datetime.now(timezone.utc).date()

    # Mesma justificativa de segurança já usada no serviço de recomendações:
    # cada chamada só faz um GET de rede antes de qualquer mutação no cache
    # (get_detail grava no cache de forma síncrona, sem await no meio), então
    # paralelizar com gather sobre a mesma Session é seguro aqui.
    details = await asyncio.gather(*(_detail_or_none(db, media) for media in tracked))

    items: list[dict] = []
    for media, detail in zip(tracked, details):
        if detail is None:
            continue

        if media.media_type == "movie":
            release = _parse_date(detail.get("release_date"))
            if release is not None and release >= today:
                items.append(
                    {
                        "tmdb_id": media.tmdb_id,
                        "media_type": "movie",
                        "title": media.title,
                        "poster_url": media.poster_url,
                        "date": release.isoformat(),
                        "kind": "movie_release",
                        "season_number": None,
                        "episode_number": None,
                        "episode_name": None,
                    }
                )
        else:
            next_ep = detail.get("next_episode_to_air")
            if next_ep:
                air_date = _parse_date(next_ep.get("air_date"))
                if air_date is not None and air_date >= today:
                    items.append(
                        {
                            "tmdb_id": media.tmdb_id,
                            "media_type": "tv",
                            "title": media.title,
                            "poster_url": media.poster_url,
                            "date": air_date.isoformat(),
                            "kind": "episode",
                            "season_number": next_ep.get("season_number"),
                            "episode_number": next_ep.get("episode_number"),
                            "episode_name": next_ep.get("name"),
                        }
                    )

    items.sort(key=lambda i: i["date"])
    return items
