import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notifications import NotificationListResponse, UnreadCountResponse
from app.services import notifications as notifications_service

router = APIRouter(prefix="/notifications", tags=["notifications"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await notifications_service.check_new_episodes(db, current_user.id)
    result = notifications_service.list_notifications(db, current_user.id)
    return result


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"unread_count": notifications_service.unread_count(db, current_user.id)}


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        nid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada.")
    ok = notifications_service.mark_read(db, current_user.id, nid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificação não encontrada.")


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifications_service.mark_all_read(db, current_user.id)
