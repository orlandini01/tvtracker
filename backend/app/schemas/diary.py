from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class DiaryMedia(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None


class DiaryEntryOut(BaseModel):
    type: Literal["movie", "episode_group"]
    watched_at: datetime
    media: DiaryMedia
    detail: str | None
    rating: int | None


class DiaryResponse(BaseModel):
    results: list[DiaryEntryOut]
    page: int
    has_more: bool
