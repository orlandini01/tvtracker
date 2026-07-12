from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=1000)


class CommentUser(BaseModel):
    id: str
    username: str


class CommentOut(BaseModel):
    id: str
    user: CommentUser
    body: str
    created_at: datetime
    updated_at: datetime
    is_mine: bool


class CommentListResponse(BaseModel):
    results: list[CommentOut]
