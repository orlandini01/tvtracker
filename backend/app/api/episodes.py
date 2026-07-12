from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.schemas.episodes import SeasonEpisodesResponse, ShowProgress
from app.services import episodes as episodes_service
from app.services import tmdb
from app.services.tmdb import TMDBError

router = APIRouter(prefix="/media/tv", tags=["episodes"], dependencies=[Depends(get_current_user)])


async def _call(coro):
    try:
        return await coro
    except TMDBError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("/{tmdb_id}/season/{season_number}", response_model=SeasonEpisodesResponse)
async def get_season(
    tmdb_id: int,
    season_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _call(episodes_service.list_season_with_progress(db, current_user.id, tmdb_id, season_number))


@router.put("/{tmdb_id}/season/{season_number}/episode/{episode_number}", status_code=status.HTTP_204_NO_CONTENT)
async def mark_episode(
    tmdb_id: int,
    season_number: int,
    episode_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _call(episodes_service.mark_episode(db, current_user.id, tmdb_id, season_number, episode_number))


@router.delete("/{tmdb_id}/season/{season_number}/episode/{episode_number}", status_code=status.HTTP_204_NO_CONTENT)
def unmark_episode(
    tmdb_id: int,
    season_number: int,
    episode_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    episodes_service.unmark_episode(db, current_user.id, tmdb_id, season_number, episode_number)


@router.post("/{tmdb_id}/season/{season_number}/mark-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_season(
    tmdb_id: int,
    season_number: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    await _call(episodes_service.mark_season(db, current_user.id, tmdb_id, season_number))


@router.get("/{tmdb_id}/progress", response_model=ShowProgress)
async def show_progress(
    tmdb_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    detail = await _call(tmdb.get_detail(db, "tv", tmdb_id))
    seasons = detail.get("seasons") or []
    return episodes_service.get_show_progress(db, current_user.id, tmdb_id, seasons)
