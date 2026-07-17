from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.achievements import AchievementsResponse
from app.services import achievements as achievements_service

router = APIRouter(prefix="/achievements", tags=["achievements"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=AchievementsResponse)
def list_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"results": achievements_service.get_achievements(db, current_user.id)}
