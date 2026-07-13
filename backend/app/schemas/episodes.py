from pydantic import BaseModel, Field


class EpisodeOut(BaseModel):
    episode_number: int
    name: str
    air_date: str | None
    still_url: str | None
    watched: bool
    rating: int | None


class SeasonEpisodesResponse(BaseModel):
    season_number: int
    episodes: list[EpisodeOut]


class ShowProgress(BaseModel):
    watched_count: int
    total_count: int


class EpisodeRatingUpdate(BaseModel):
    rating: int = Field(ge=1, le=10)
