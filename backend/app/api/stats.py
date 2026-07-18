from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.stats import AdvancedStatsOut
from app.services import stats as stats_service

router = APIRouter(prefix="/stats", tags=["stats"], dependencies=[Depends(get_current_user)])


@router.get("/advanced", response_model=AdvancedStatsOut)
async def get_advanced_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await stats_service.get_advanced_stats(db, current_user.id)
