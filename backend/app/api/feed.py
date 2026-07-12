from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.feed import FeedResponse
from app.services.feed import list_feed

router = APIRouter(prefix="/feed", tags=["feed"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=FeedResponse)
def get_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_feed(db, current_user.id, page, page_size)
