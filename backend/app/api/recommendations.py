from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.schemas.recommendations import RecommendationsResponse
from app.services import recommendations as recommendations_service

router = APIRouter(prefix="/recommendations", tags=["recommendations"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=RecommendationsResponse)
async def get_recommendations(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await recommendations_service.get_recommendations(db, current_user.id)
