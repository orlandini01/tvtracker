from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class WatchPartyCreate(BaseModel):
    media_type: Literal["movie", "tv"]
    tmdb_id: int
    scheduled_at: datetime
    note: str | None = Field(None, max_length=280)
    invitee_usernames: list[str] = Field(default_factory=list, max_length=50)


class PartyUserOut(BaseModel):
    id: str
    username: str
    avatar_url: str | None


class PartyMediaOut(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None


class InviteOut(BaseModel):
    user: PartyUserOut
    status: Literal["pending", "accepted", "declined"]
    responded_at: datetime | None


class WatchPartyOut(BaseModel):
    id: str
    host: PartyUserOut
    media: PartyMediaOut
    scheduled_at: datetime
    note: str | None
    created_at: datetime
    is_host: bool
    my_status: str | None
    invites: list[InviteOut]


class WatchPartyListResponse(BaseModel):
    results: list[WatchPartyOut]


class InviteRespondRequest(BaseModel):
    status: Literal["accepted", "declined"]
