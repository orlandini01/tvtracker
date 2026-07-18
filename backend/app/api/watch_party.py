from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.watch_party import (
    InviteRespondRequest,
    WatchPartyCreate,
    WatchPartyListResponse,
    WatchPartyOut,
)
from app.services import watch_party as watch_party_service
from app.services.tmdb import TMDBError
from app.services.watch_party import WatchPartyError

router = APIRouter(prefix="/watch-parties", tags=["watch-parties"], dependencies=[Depends(get_current_user)])


async def _call(coro):
    try:
        return await coro
    except TMDBError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)
    except WatchPartyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("", response_model=WatchPartyListResponse)
def list_parties(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"results": watch_party_service.list_parties(db, current_user.id)}


@router.post("", response_model=WatchPartyOut, status_code=status.HTTP_201_CREATED)
async def create_party(
    payload: WatchPartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _call(
        watch_party_service.create_party(
            db,
            current_user.id,
            payload.media_type,
            payload.tmdb_id,
            payload.scheduled_at,
            payload.note,
            payload.invitee_usernames,
        )
    )


@router.get("/{party_id}", response_model=WatchPartyOut)
def get_party(
    party_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return watch_party_service.get_party_detail(db, current_user.id, party_id)
    except WatchPartyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/{party_id}/respond", response_model=WatchPartyOut)
def respond(
    party_id: str,
    payload: InviteRespondRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return watch_party_service.respond_invite(db, current_user.id, party_id, payload.status)
    except WatchPartyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/{party_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_party(
    party_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        watch_party_service.cancel_party(db, current_user.id, party_id)
    except WatchPartyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return None
