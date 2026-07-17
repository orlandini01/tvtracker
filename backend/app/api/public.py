"""Endpoints públicos — sem login. Superfície bem pequena de propósito:
só o Wrapped de um usuário que ativou o compartilhamento, resolvido por
um token opaco (nunca pelo user_id real). Rate-limitado como qualquer
outro endpoint sensível a abuso por não exigir autenticação."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.auth import limiter
from app.db.session import get_db
from app.schemas.wrapped import PublicWrappedResponse
from app.services import profile as profile_service
from app.services import wrapped as wrapped_service

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/wrapped/{token}", response_model=PublicWrappedResponse)
@limiter.limit("30/minute")
async def public_wrapped(
    request: Request,
    token: str,
    year: int | None = Query(default=None, ge=2000, le=2100),
    db: Session = Depends(get_db),
):
    user = profile_service.get_user_by_share_token(db, token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link não encontrado ou desativado")

    target_year = year or datetime.now(timezone.utc).year
    data = await wrapped_service.get_wrapped(db, user.id, target_year)
    return {**data, "username": user.username}
