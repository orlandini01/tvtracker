from pydantic import BaseModel


class GenreCount(BaseModel):
    name: str
    count: int


class PersonCount(BaseModel):
    name: str
    count: int


class AdvancedStatsOut(BaseModel):
    total_minutes_watched: int
    longest_streak_days: int
    top_genres: list[GenreCount]
    top_people: list[PersonCount]
    movies_watched: int
    shows_watched: int
