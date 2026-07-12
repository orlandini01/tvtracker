from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.friends import FriendUserOut


class ActivityMedia(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None


class ActivityOut(BaseModel):
    id: str
    user: FriendUserOut
    media: ActivityMedia
    action: Literal["favorited", "status_changed", "rated"]
    detail: str | None
    created_at: datetime


class FeedResponse(BaseModel):
    results: list[ActivityOut]
    page: int
    has_more: bool
