from pydantic import BaseModel


class EpisodeOut(BaseModel):
    episode_number: int
    name: str
    air_date: str | None
    still_url: str | None
    watched: bool


class SeasonEpisodesResponse(BaseModel):
    season_number: int
    episodes: list[EpisodeOut]


class ShowProgress(BaseModel):
    watched_count: int
    total_count: int
