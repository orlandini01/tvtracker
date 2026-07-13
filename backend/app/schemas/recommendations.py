from pydantic import BaseModel


class RecommendationItem(BaseModel):
    tmdb_id: int
    media_type: str
    title: str
    overview: str
    poster_url: str | None
    release_date: str | None
    vote_average: float | None


class RecommendationsResponse(BaseModel):
    movies: list[RecommendationItem]
    shows: list[RecommendationItem]
