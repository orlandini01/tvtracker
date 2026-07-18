from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.roulette import RouletteResponse
from app.services import roulette as roulette_service
from app.services.roulette import RouletteError

router = APIRouter(prefix="/roulette", tags=["roulette"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=RouletteResponse)
def spin_roulette(
    list_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = roulette_service.spin(db, current_user.id, list_id)
    except RouletteError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"result": result}
