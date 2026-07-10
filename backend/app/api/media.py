from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.schemas.media import MediaDetail, MediaListResponse, WatchProvidersResponse
from app.services import tmdb
from app.services.tmdb import TMDBError

router = APIRouter(prefix="/media", tags=["media"], dependencies=[Depends(get_current_user)])


async def _call(coro):
    try:
        return await coro
    except TMDBError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/search", response_model=MediaListResponse)
async def search_media(
    query: str = Query(..., min_length=1, max_length=200),
    page: int = Query(1, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return await _call(tmdb.search(db, query, page))


@router.get("/discover/{category}", response_model=MediaListResponse)
async def discover_media(
    category: str,
    page: int = Query(1, ge=1, le=500),
    db: Session = Depends(get_db),
):
    return await _call(tmdb.discover(db, category, page))


@router.get("/{media_type}/{tmdb_id}", response_model=MediaDetail)
async def media_detail(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    db: Session = Depends(get_db),
):
    return await _call(tmdb.get_detail(db, media_type, tmdb_id))


@router.get("/{media_type}/{tmdb_id}/providers", response_model=WatchProvidersResponse)
async def media_watch_providers(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    region: str = Query("BR", min_length=2, max_length=2),
    db: Session = Depends(get_db),
):
    return await _call(tmdb.get_watch_providers(db, media_type, tmdb_id, region))
