from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.wrapped import WrappedResponse
from app.services import wrapped as wrapped_service

router = APIRouter(prefix="/wrapped", tags=["wrapped"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=WrappedResponse)
async def get_wrapped(
    year: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target_year = year or datetime.now(timezone.utc).year
    return await wrapped_service.get_wrapped(db, current_user.id, target_year)
