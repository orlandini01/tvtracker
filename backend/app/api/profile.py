from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.profile import ShareStatusResponse
from app.services import profile as profile_service

router = APIRouter(prefix="/profile", tags=["profile"], dependencies=[Depends(get_current_user)])


def _status(user: User) -> dict:
    return {"enabled": user.share_token is not None, "share_token": user.share_token}


@router.get("/share", response_model=ShareStatusResponse)
async def get_share(current_user: User = Depends(get_current_user)):
    return _status(current_user)


@router.post("/share", response_model=ShareStatusResponse)
async def activate_share(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_service.enable_share(db, current_user)
    return _status(current_user)


@router.post("/share/rotate", response_model=ShareStatusResponse)
async def rotate_share(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_service.rotate_share(db, current_user)
    return _status(current_user)


@router.delete("/share", response_model=ShareStatusResponse)
async def deactivate_share(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile_service.disable_share(db, current_user)
    return _status(current_user)
