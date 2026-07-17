from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth import limiter
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.profile import (
    ChangePassword,
    ProfileOut,
    ShareStatusResponse,
    UpdateBio,
    UpdateEmailNotifications,
    UpdateUsername,
)
from app.services import avatar as avatar_service
from app.services import profile as profile_service
from app.services.avatar import AvatarError
from app.services.profile import ProfileError

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


@router.get("/me", response_model=ProfileOut)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return profile_service.get_own_profile(db, current_user)


@router.patch("/me/bio", response_model=ProfileOut)
def update_my_bio(
    payload: UpdateBio,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_service.update_bio(db, current_user, payload.bio)
    return profile_service.get_own_profile(db, current_user)


@router.patch("/me/username", response_model=ProfileOut)
def update_my_username(
    payload: UpdateUsername,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        profile_service.update_username(db, current_user, payload.username)
    except ProfileError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return profile_service.get_own_profile(db, current_user)


@router.patch("/me/email-notifications", response_model=ProfileOut)
def update_my_email_notifications(
    payload: UpdateEmailNotifications,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile_service.update_email_notifications(db, current_user, payload.enabled)
    return profile_service.get_own_profile(db, current_user)


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    payload: ChangePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        profile_service.change_password(db, current_user, payload.current_password, payload.new_password)
    except ProfileError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/me/avatar", response_model=ProfileOut)
@limiter.limit("10/minute")
async def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        await avatar_service.save_avatar(db, current_user, file)
    except AvatarError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return profile_service.get_own_profile(db, current_user)


@router.delete("/me/avatar", response_model=ProfileOut)
def delete_my_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    avatar_service.remove_avatar(db, current_user)
    return profile_service.get_own_profile(db, current_user)


@router.get("/{user_id}", response_model=ProfileOut)
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return profile_service.get_friend_profile(db, current_user.id, user_id)
    except ProfileError as exc:
        status_code = status.HTTP_404_NOT_FOUND if "não encontrado" in str(exc) else status.HTTP_403_FORBIDDEN
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
