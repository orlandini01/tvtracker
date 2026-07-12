from typing import Literal

from pydantic import BaseModel

from app.schemas.friends import FriendUserOut


class LibrarySignal(BaseModel):
    status: str | None
    is_favorite: bool
    rating: int | None


class CommonTitle(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None
    you: LibrarySignal
    friend: LibrarySignal


class RecommendedTitle(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None
    friend_is_favorite: bool
    friend_rating: int | None
    friend_status: str | None


class CompareResponse(BaseModel):
    friend: FriendUserOut
    compatibility_score: float
    common_count: int
    total_count: int
    common_titles: list[CommonTitle]
    recommendations: list[RecommendedTitle]
