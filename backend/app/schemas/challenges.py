from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChallengeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    kind: Literal["movie_count", "episode_count", "genre_count"]
    genre_name: str | None = None
    target_count: int = Field(ge=1, le=1000)
    starts_at: datetime
    ends_at: datetime


class ChallengeOut(BaseModel):
    id: str
    title: str
    description: str | None
    kind: Literal["movie_count", "episode_count", "genre_count"]
    genre_name: str | None
    target_count: int
    starts_at: datetime
    ends_at: datetime
    status: Literal["upcoming", "active", "ended"]
    progress: int
    earned: bool


class ChallengeListResponse(BaseModel):
    results: list[ChallengeOut]


class LeaderboardUser(BaseModel):
    id: str
    username: str
    avatar_url: str | None


class LeaderboardEntry(BaseModel):
    user: LeaderboardUser
    progress: int
    earned: bool
    is_viewer: bool


class LeaderboardResponse(BaseModel):
    challenge: ChallengeOut
    entries: list[LeaderboardEntry]
