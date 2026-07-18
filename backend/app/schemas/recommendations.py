from typing import Literal

from pydantic import BaseModel

# Categorias fixas de humor — cada uma mapeia pra um conjunto de gêneros
# TMDB (ver MOOD_GENRES em services/recommendations.py). Fechado por
# design: evita ter que lidar com humor livre/texto do usuário.
Mood = Literal["feliz", "triste", "emocionante", "assustador", "relaxante", "reflexivo"]


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
