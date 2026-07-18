from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.diary import DiaryResponse
from app.services import diary as diary_service

router = APIRouter(prefix="/diary", tags=["diary"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DiaryResponse)
def get_diary(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return diary_service.get_diary(db, current_user.id, page, page_size)
