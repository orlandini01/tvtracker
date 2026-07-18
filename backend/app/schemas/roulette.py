from typing import Literal

from pydantic import BaseModel


class RouletteResult(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None


class RouletteResponse(BaseModel):
    result: RouletteResult | None
