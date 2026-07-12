import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.comments import CommentCreate, CommentListResponse, CommentOut
from app.services import comments as comments_service

router = APIRouter(prefix="/comments", tags=["comments"], dependencies=[Depends(get_current_user)])


@router.get("/{media_type}/{tmdb_id}", response_model=CommentListResponse)
def get_comments(
    media_type: str,
    tmdb_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = comments_service.list_comments(db, current_user.id, media_type, tmdb_id)
    return CommentListResponse(results=results)


@router.post("/{media_type}/{tmdb_id}", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def post_comment(
    media_type: str,
    tmdb_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await comments_service.create_comment(db, current_user.id, media_type, tmdb_id, payload.body)
    return result


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        cid = uuid.UUID(comment_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")
    ok = comments_service.delete_comment(db, current_user.id, cid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comentário não encontrado.")
