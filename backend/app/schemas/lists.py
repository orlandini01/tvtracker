from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class CustomListCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CustomListRename(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CustomListItemOut(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None
    added_at: datetime


class CustomListOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    item_count: int


class CustomListDetailOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    items: list[CustomListItemOut]


class CustomListsResponse(BaseModel):
    results: list[CustomListOut]


class AddListItem(BaseModel):
    media_type: Literal["movie", "tv"]
    tmdb_id: int
