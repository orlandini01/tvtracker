from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RelationshipStatus = Literal["none", "friends", "pending_outgoing", "pending_incoming"]


class FriendUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    username: str


class UserSearchResult(BaseModel):
    id: str
    username: str
    relationship_status: RelationshipStatus


class UserSearchResponse(BaseModel):
    results: list[UserSearchResult]


class FriendRequestCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)


class FriendRequestOut(BaseModel):
    id: str
    requester: FriendUserOut
    addressee: FriendUserOut
    status: str
    created_at: datetime


class FriendRequestListResponse(BaseModel):
    results: list[FriendRequestOut]


class FriendListResponse(BaseModel):
    results: list[FriendUserOut]
