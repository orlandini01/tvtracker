from typing import Literal

from pydantic import BaseModel


class MediaSummary(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    overview: str
    poster_url: str | None
    release_date: str | None
    vote_average: float | None


class MediaListResponse(BaseModel):
    page: int
    total_pages: int
    results: list[MediaSummary]


class MediaDetail(MediaSummary):
    backdrop_url: str | None
    genres: list[str]
    runtime: int | None
    number_of_seasons: int | None
    status: str | None


class WatchProvider(BaseModel):
    provider_name: str
    logo_url: str | None


class WatchProvidersResponse(BaseModel):
    region: str
    link: str | None
    flatrate: list[WatchProvider]
    rent: list[WatchProvider]
    buy: list[WatchProvider]
