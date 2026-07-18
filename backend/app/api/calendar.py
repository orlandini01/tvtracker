from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.calendar import CalendarResponse
from app.services import calendar as calendar_service

router = APIRouter(prefix="/calendar", tags=["calendar"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=CalendarResponse)
async def get_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = await calendar_service.get_calendar(db, current_user.id)
    return {"results": results}


@router.get("/export.ics")
async def export_ics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = await calendar_service.export_ics(db, current_user.id)
    return Response(
        content=content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=trackertv-calendario.ics"},
    )
