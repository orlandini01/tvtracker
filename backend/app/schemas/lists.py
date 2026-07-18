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
    rating: int | None = None


class MemberOut(BaseModel):
    id: str
    username: str
    avatar_url: str | None


class CustomListOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    item_count: int
    is_owner: bool
    member_count: int


class CustomListDetailOut(BaseModel):
    id: str
    name: str
    created_at: datetime
    items: list[CustomListItemOut]
    is_owner: bool
    owner: MemberOut
    members: list[MemberOut]


class CustomListsResponse(BaseModel):
    results: list[CustomListOut]


class ListMembershipResponse(BaseModel):
    list_ids: list[str]


class AddListItem(BaseModel):
    media_type: Literal["movie", "tv"]
    tmdb_id: int


class AddListMember(BaseModel):
    username: str = Field(min_length=3, max_length=50)
