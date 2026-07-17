from typing import Literal

from pydantic import BaseModel


class TopGenre(BaseModel):
    name: str
    count: int


class WrappedMedia(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None


class WrappedResponse(BaseModel):
    year: int
    total_hours: float
    total_movies: int
    total_shows: int
    total_episodes: int
    top_genres: list[TopGenre]
    top_show: WrappedMedia | None
    top_show_episode_count: int | None
    top_movie: WrappedMedia | None
    previous_year_hours: float
    hours_change_pct: float | None


class PublicWrappedResponse(WrappedResponse):
    """Mesma coisa que WrappedResponse, mas exposta via link público sem
    login — inclui o username pra a página saber de quem é o Wrapped."""

    username: str
