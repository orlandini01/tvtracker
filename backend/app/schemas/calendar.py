from typing import Literal

from pydantic import BaseModel


class CalendarItemOut(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None
    date: str
    kind: Literal["movie_release", "episode"]
    season_number: int | None
    episode_number: int | None
    episode_name: str | None


class CalendarResponse(BaseModel):
    results: list[CalendarItemOut]
