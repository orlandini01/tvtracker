from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.library import LibraryEntryOut, LibraryEntryUpdate, LibraryListResponse
from app.services import library as library_service
from app.services.tmdb import TMDBError

router = APIRouter(prefix="/library", tags=["library"], dependencies=[Depends(get_current_user)])


async def _call(coro):
    try:
        return await coro
    except TMDBError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("", response_model=LibraryListResponse)
async def list_library(
    status_filter: Literal["quero_assistir", "assistindo", "assistido", "abandonei"] | None = Query(None, alias="status"),
    favorites_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = library_service.list_library(db, current_user.id, status_filter, favorites_only)
    return {"results": results}


@router.get("/{media_type}/{tmdb_id}", response_model=LibraryEntryOut)
async def get_status(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _call(library_service.get_status(db, current_user.id, media_type, tmdb_id))


@router.put("/{media_type}/{tmdb_id}", response_model=LibraryEntryOut)
async def upsert_status(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    payload: LibraryEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update = payload.model_dump(exclude_unset=True)
    return await _call(library_service.upsert_status(db, current_user.id, media_type, tmdb_id, update))


@router.delete("/{media_type}/{tmdb_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_status(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    library_service.delete_status(db, current_user.id, media_type, tmdb_id)
    return None
