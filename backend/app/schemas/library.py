from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

WatchStatus = Literal["quero_assistir", "assistindo", "assistido", "abandonei"]


class LibraryEntryUpdate(BaseModel):
    """Atualização parcial — só os campos enviados são alterados.
    Mandar `status: null` explicitamente limpa o status (ex: tirar da lista
    de 'quero assistir' sem desfavoritar)."""

    status: WatchStatus | None = None
    is_favorite: bool | None = None
    rating: int | None = Field(None, ge=1, le=10)


class LibraryEntryOut(BaseModel):
    tmdb_id: int
    media_type: Literal["movie", "tv"]
    title: str
    poster_url: str | None
    status: WatchStatus | None
    is_favorite: bool
    rating: int | None
    watched_at: datetime | None
    rewatch_count: int
    updated_at: datetime


class LibraryListResponse(BaseModel):
    results: list[LibraryEntryOut]
