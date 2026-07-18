from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.challenges import ChallengeCreate, ChallengeListResponse, ChallengeOut, LeaderboardResponse
from app.services import challenges as challenges_service
from app.services.challenges import ChallengeError

router = APIRouter(prefix="/challenges", tags=["challenges"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=ChallengeListResponse)
async def get_challenges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {"results": await challenges_service.list_challenges(db, current_user.id)}


@router.post("", response_model=ChallengeOut, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    payload: ChallengeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        challenge = challenges_service.create_challenge(
            db,
            current_user.id,
            payload.title,
            payload.description,
            payload.kind,
            payload.genre_name,
            payload.target_count,
            payload.starts_at,
            payload.ends_at,
        )
    except ChallengeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    progress = await challenges_service.get_progress(db, current_user.id, challenge)
    return challenges_service.to_out(challenge, progress)


@router.delete("/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_challenge(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        challenges_service.delete_challenge(db, current_user.id, challenge_id)
    except ChallengeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{challenge_id}/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    challenge_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await challenges_service.get_leaderboard(db, current_user.id, challenge_id)
    except ChallengeError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
