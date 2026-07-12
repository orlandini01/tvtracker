from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NotificationMedia(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None


class NotificationOut(BaseModel):
    id: str
    media: NotificationMedia
    kind: Literal["new_episodes"]
    message: str
    created_at: datetime
    is_read: bool


class NotificationListResponse(BaseModel):
    results: list[NotificationOut]
    unread_count: int


class UnreadCountResponse(BaseModel):
    unread_count: int
