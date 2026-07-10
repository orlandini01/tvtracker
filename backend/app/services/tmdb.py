"""Camada de acesso à API do TMDB.

A chave (TMDB_API_KEY) só existe aqui, no servidor — nunca é enviada ao
frontend. Todo endpoint do TMDB é chamado a partir daqui, nunca direto
do browser do usuário.
"""
from typing import Any, Literal

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

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


def _image_url(path: str | None, base: str = IMAGE_BASE_URL) -> str | None:
    if not path:
        return None
    return f"{base}{path}"


class TMDBError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


async def _get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    if not settings.tmdb_api_key:
        raise TMDBError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "TMDB_API_KEY não configurada no servidor",
        )

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


async def search(query: str, page: int = 1) -> dict[str, Any]:
    async def _search_in(language: str | None) -> dict[str, Any]:
        params: dict[str, Any] = {"query": query, "page": page, "include_adult": "false"}
        if language:
            params["language"] = language
        return await _get("/search/multi", params)

    # Busca padrão em PT-BR.
    data = await _search_in(None)
    raw_results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]

    # Se não achou nada, o usuário pode ter digitado o título original
    # (inglês, italiano etc.) — tenta de novo em inglês antes de desistir.
    if not raw_results:
        data = await _search_in("en-US")
        raw_results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]

    # Correspondência exata de título (traduzido ou original) sobe pro topo,
    # já que a relevância do TMDB às vezes enterra o resultado óbvio.
    raw_results.sort(key=lambda item: 0 if _is_exact_title_match(item, query) else 1)

    results = [_map_summary(item, item["media_type"]) for item in raw_results]
    return {"page": data.get("page", 1), "total_pages": data.get("total_pages", 1), "results": results}


async def discover(category: str, page: int = 1) -> dict[str, Any]:
    if category not in DISCOVER_ENDPOINTS:
        raise TMDBError(status.HTTP_400_BAD_REQUEST, f"Categoria inválida: {category}")
    path, media_type = DISCOVER_ENDPOINTS[category]
    data = await _get(path, {"page": page})
    results = [_map_summary(item, media_type) for item in data.get("results", [])]
    return {"page": data.get("page", 1), "total_pages": data.get("total_pages", 1), "results": results}


async def get_detail(media_type: MediaType, tmdb_id: int) -> dict[str, Any]:
    if media_type not in ("movie", "tv"):
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "media_type deve ser 'movie' ou 'tv'")

    data = await _get(f"/{media_type}/{tmdb_id}")
    summary = _map_summary({**data, "id": data["id"]}, media_type)

    runtime = None
    if media_type == "movie":
        runtime = data.get("runtime")
    else:
        episode_runtimes = data.get("episode_run_time") or []
        runtime = episode_runtimes[0] if episode_runtimes else None

    return {
        **summary,
        "backdrop_url": _image_url(data.get("backdrop_path"), BACKDROP_BASE_URL),
        "genres": [g["name"] for g in data.get("genres", [])],
        "runtime": runtime,
        "number_of_seasons": data.get("number_of_seasons"),
        "status": data.get("status"),
    }


async def get_watch_providers(media_type: MediaType, tmdb_id: int, region: str = "BR") -> dict[str, Any]:
    if media_type not in ("movie", "tv"):
        raise TMDBError(status.HTTP_400_BAD_REQUEST, "media_type deve ser 'movie' ou 'tv'")

    data = await _get(f"/{media_type}/{tmdb_id}/watch/providers")
    region_data = data.get("results", {}).get(region.upper(), {})

    def _providers(key: str) -> list[dict[str, Any]]:
        return [
            {
                "provider_name": p["provider_name"],
                "logo_url": _image_url(p.get("logo_path"), "https://image.tmdb.org/t/p/w92"),
            }
            for p in region_data.get(key, [])
        ]

    return {
        "region": region.upper(),
        "link": region_data.get("link"),
        "flatrate": _providers("flatrate"),
        "rent": _providers("rent"),
        "buy": _providers("buy"),
    }