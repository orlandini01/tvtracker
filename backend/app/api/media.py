from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.schemas.media import (
    MediaDetail,
    MediaListResponse,
    WatchProviderCatalogResponse,
    WatchProvidersResponse,
)
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


@router.get("/providers/catalog", response_model=WatchProviderCatalogResponse)
async def providers_catalog(
    media_type: Literal["movie", "tv"] = Query("movie"),
    region: str = Query("BR", min_length=2, max_length=2),
    db: Session = Depends(get_db),
):
    results = await _call(tmdb.list_watch_provider_catalog(db, media_type, region))
    return {"results": results}


@router.get("/discover-by-provider", response_model=MediaListResponse)
async def discover_by_provider(
    media_type: Literal["movie", "tv"] = Query("movie"),
    providers: str = Query(..., description="IDs de provedor separados por vírgula, ex: 8,119,337"),
    region: str = Query("BR", min_length=2, max_length=2),
    page: int = Query(1, ge=1, le=500),
    db: Session = Depends(get_db),
):
    try:
        provider_ids = [int(p) for p in providers.split(",") if p.strip()]
    except ValueError:
        raise HTTPException(status_code=422, detail="Parâmetro 'providers' deve ser uma lista de IDs separados por vírgula")
    return await _call(tmdb.discover_by_providers(db, media_type, provider_ids, region, page))


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
