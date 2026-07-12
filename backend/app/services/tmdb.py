"""Camada de acesso à API do TMDB, com cache no Postgres.

A chave (TMDB_API_KEY) só existe aqui, no servidor — nunca é enviada ao
frontend. Todo endpoint do TMDB é chamado a partir daqui, nunca direto
do browser do usuário.

Cache: respostas já mapeadas (não o payload cru do TMDB) são guardadas em
`tmdb_cache`, com TTL por tipo de consulta. Dados de descoberta/populares
mudam pouco, então cacheamos por mais tempo; busca por texto e detalhe
têm TTLs próprios. Se a escrita no cache falhar por qualquer motivo, isso
nunca deve derrubar a resposta real ao usuário — só registra e segue.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import httpx
from fastapi import status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.tmdb_cache import TmdbCache

MediaType = Literal["movie", "tv"]

IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280"

DISCOVER_ENDPOINTS: dict[str, tuple[str, MediaType]] = {
    "popular_movies": ("/movie/popular", "movie"),
    "popular_tv": ("/tv/popular", "tv"),
    "now_playing": ("/movie/now_playing", "movie"),
    "upcoming": ("/movie/upcoming", "movie"),
    "on_the_air": ("/tv/on_the_air", "tv"),
}

TTL_DISCOVER = timedelta(hours=6)
TTL_SEARCH = timedelta(hours=3)
TTL_DETAIL = timedelta(hours=24)
TTL_PROVIDERS = timedelta(hours=12)
TTL_PROVIDER_CATALOG = timedelta(hours=24)


class TMDBError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _image_url(path: str | None, base: str = IMAGE_BASE_URL) -> str | None:
    if not path:
        return None
    return f"{base}{path}"


def _get_cached(db: Session, key: str, ttl: timedelta) -> dict[str, Any] | None:
    try:
        row = db.get(TmdbCache, key)
    except Exception:
        return None
    if row is None:
        return None
    age = datetime.now(timezone.utc) - row.cached_at
    if age > ttl:
        return None
    return row.payload


def _set_cache(db: Session, key: str, payload: dict[str, Any]) -> None:
    try:
        row = db.get(TmdbCache, key)
        if row is None:
            db.add(TmdbCache(cache_key=key, payload=payload))
        else:
            row.payload = payload
            row.cached_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        # cache é um bônus de performance, nunca motivo pra quebrar a resposta real
        db.rollback()


async def _get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if not settings.tmdb_api_key:
        raise TMDBError(status.HTTP_503_SERVICE_UNAVAILABLE, "TMDB_API_KEY não configurada no servidor")

    query = {"api_key": settings.tmdb_api_key, "language": "pt-BR", **(params or {})}
    url = f"{settings.tmdb_api_base_url}{path}"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url, params=query)
    except httpx.RequestError as exc:
        raise TMDBError(status.HTTP_502_BAD_GATEWAY, "TMDB indisponível no momento") from exc

    if response.status_code == 404:
        raise TMDBError(status.HTTP_404_NOT_FOUND, "Não encontrado no TMDB")
    if response.status_code == 401:
        raise TMDBError(status.HTTP_502_BAD_GATEWAY, "Chave do TMDB inválida ou expirada")
    if response.status_code >= 400:
        raise TMDBError(status.HTTP_502_BAD_GATEWAY, f"Erro do TMDB ({response.status_code})")

    return response.json()


def _map_summary(raw: dict[str, Any], media_type: MediaType) -> dict[str, Any]:
    title = raw.get("title") or raw.get("name") or ""
    release_date = raw.get("release_date") or raw.get("first_air_date") or None
    return {
        "tmdb_id": raw["id"],
        "media_type": media_type,
        "title": title,
        "overview": raw.get("overview", ""),
        "poster_url": _image_url(raw.get("poster_path")),
        "release_date": release_date,
        "vote_average": raw.get("vote_average"),
    }


def _is_exact_title_match(raw: dict[str, Any], query: str) -> bool:
    q = query.strip().casefold()
    candidates = [raw.get("title"), raw.get("name"), raw.get("original_title"), raw.get("original_name")]
    return any(c and c.strip().casefold() == q for c in candidates)


async def search(db: Session, query: str, page: int = 1) -> dict[str, Any]:
    cache_key = f"search:{query.strip().casefold()}:{page}"
    cached = _get_cached(db, cache_key, TTL_SEARCH)
    if cached is not None:
        return cached

    async def _search_in(language: str | None) -> dict[str, Any]:
        params: dict[str, Any] = {"query": query, "page": page, "include_adult": "false"}
        if language:
            params["language"] = language
        return await _get("/search/multi", params)

    data = await _search_in(None)
    raw_results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]

    if not raw_results:
        data = await _search_in("en-US")
        raw_results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]

    raw_results.sort(key=lambda item: 0 if _is_exact_title_match(item, query) else 1)
    results = [_map_summary(item, item["media_type"]) for item in raw_results]
    result = {"page": data.get("page", 1), "total_pages": data.get("total_pages", 1), "results": results}

    _set_cache(db, cache_key, result)
    return result


async def discover(db: Session, category: str, page: int = 1) -> dict[str, Any]:
    if category not in DISCOVER_ENDPOINTS:
        raise TMDBError(status.HTTP_400_BAD_REQUEST, f"Categoria inválida: {category}")

    cache_key = f"discover:{category}:{page}"
    cached = _get_cached(db, cache_key, TTL_DISCOVER)
    if cached is not None:
        return cached

    path, media_type = DISCOVER_ENDPOINTS[category]
    data = await _get(path, {"page": page})
    results = [_map_summary(item, media_type) for item in data.get("results", [])]
    result = {"page": data.get("page", 1), "total_pages": data.get("total_pages", 1), "results": results}

    _set_cache(db, cache_key, result)
    return result


async def get_detail(db: Session, media_type: MediaType, tmdb_id: int) -> dict[str, Any]:
    if media_type not in ("movie", "tv"):
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "media_type deve ser 'movie' ou 'tv'")

    cache_key = f"detail:{media_type}:{tmdb_id}"
    cached = _get_cached(db, cache_key, TTL_DETAIL)
    if cached is not None:
        return cached

    data = await _get(f"/{media_type}/{tmdb_id}")
    summary = _map_summary({**data, "id": data["id"]}, media_type)

    runtime = None
    if media_type == "movie":
        runtime = data.get("runtime")
    else:
        episode_runtimes = data.get("episode_run_time") or []
        runtime = episode_runtimes[0] if episode_runtimes else None

    seasons = None
    if media_type == "tv":
        seasons = [
            {
                "season_number": s["season_number"],
                "name": s.get("name") or f"Temporada {s['season_number']}",
                "episode_count": s.get("episode_count", 0),
            }
            for s in data.get("seasons", [])
            if s.get("season_number", 0) > 0  # exclui "Especiais" (season 0)
        ]

    result = {
        **summary,
        "backdrop_url": _image_url(data.get("backdrop_path"), BACKDROP_BASE_URL),
        "genres": [g["name"] for g in data.get("genres", [])],
        "runtime": runtime,
        "number_of_seasons": data.get("number_of_seasons"),
        "status": data.get("status"),
        "seasons": seasons,
    }

    _set_cache(db, cache_key, result)
    return result


async def get_season_episodes(db: Session, tmdb_id: int, season_number: int) -> list[dict[str, Any]]:
    """Lista os episódios de uma temporada de série."""
    cache_key = f"season:{tmdb_id}:{season_number}"
    cached = _get_cached(db, cache_key, TTL_DETAIL)
    if cached is not None:
        return cached["episodes"]

    data = await _get(f"/tv/{tmdb_id}/season/{season_number}")
    episodes = [
        {
            "episode_number": e["episode_number"],
            "name": e.get("name") or f"Episódio {e['episode_number']}",
            "air_date": e.get("air_date"),
            "still_url": _image_url(e.get("still_path"), "https://image.tmdb.org/t/p/w300"),
        }
        for e in data.get("episodes", [])
    ]

    _set_cache(db, cache_key, {"episodes": episodes})
    return episodes


async def get_watch_providers(db: Session, media_type: MediaType, tmdb_id: int, region: str = "BR") -> dict[str, Any]:
    if media_type not in ("movie", "tv"):
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "media_type deve ser 'movie' ou 'tv'")

    cache_key = f"providers:{media_type}:{tmdb_id}:{region.upper()}"
    cached = _get_cached(db, cache_key, TTL_PROVIDERS)
    if cached is not None:
        return cached

    data = await _get(f"/{media_type}/{tmdb_id}/watch/providers")
    region_data = data.get("results", {}).get(region.upper(), {})

    def _providers(key: str) -> list[dict[str, Any]]:
        return [
            {"provider_name": p["provider_name"], "logo_url": _image_url(p.get("logo_path"), "https://image.tmdb.org/t/p/w92")}
            for p in region_data.get(key, [])
        ]

    result = {
        "region": region.upper(),
        "link": region_data.get("link"),
        "flatrate": _providers("flatrate"),
        "rent": _providers("rent"),
        "buy": _providers("buy"),
    }

    _set_cache(db, cache_key, result)
    return result


async def list_watch_provider_catalog(db: Session, media_type: MediaType, region: str = "BR") -> list[dict[str, Any]]:
    """Lista os provedores de streaming disponíveis numa região, pra
    alimentar o seletor de filtro na tela de descoberta."""
    if media_type not in ("movie", "tv"):
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "media_type deve ser 'movie' ou 'tv'")

    region = region.upper()
    cache_key = f"provider_catalog:{media_type}:{region}"
    cached = _get_cached(db, cache_key, TTL_PROVIDER_CATALOG)
    if cached is not None:
        return cached["results"]

    data = await _get(f"/watch/providers/{media_type}", {"watch_region": region})
    results = [
        {
            "provider_id": p["provider_id"],
            "provider_name": p["provider_name"],
            "logo_url": _image_url(p.get("logo_path"), "https://image.tmdb.org/t/p/w92"),
        }
        for p in data.get("results", [])
        # a API do TMDB devolve o catálogo global de provedores; filtramos só
        # os que de fato operam na região pedida (têm display_priorities pra ela)
        if region in (p.get("display_priorities") or {})
    ]
    results.sort(key=lambda p: p["provider_name"].casefold())

    result = {"results": results}
    _set_cache(db, cache_key, result)
    return results


async def discover_by_providers(
    db: Session,
    media_type: MediaType,
    provider_ids: list[int],
    region: str = "BR",
    page: int = 1,
) -> dict[str, Any]:
    """Descoberta filtrada por plataforma de streaming — usa /discover/{tipo}
    (diferente das categorias fixas em DISCOVER_ENDPOINTS, que usam
    endpoints dedicados do TMDB que não aceitam filtro de provedor)."""
    if media_type not in ("movie", "tv"):
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "media_type deve ser 'movie' ou 'tv'")
    if not provider_ids:
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "Selecione ao menos um provedor de streaming")

    region = region.upper()
    provider_key = ",".join(str(p) for p in sorted(provider_ids))
    cache_key = f"discover_provider:{media_type}:{region}:{provider_key}:{page}"
    cached = _get_cached(db, cache_key, TTL_DISCOVER)
    if cached is not None:
        return cached

    params = {
        "page": page,
        "watch_region": region,
        "with_watch_providers": "|".join(str(p) for p in provider_ids),
        "sort_by": "popularity.desc",
    }
    data = await _get(f"/discover/{media_type}", params)
    results = [_map_summary(item, media_type) for item in data.get("results", [])]
    result = {"page": data.get("page", 1), "total_pages": data.get("total_pages", 1), "results": results}

    _set_cache(db, cache_key, result)
    return result
