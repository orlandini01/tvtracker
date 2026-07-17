import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.compare import CompareResponse
from app.schemas.friends import (
    FriendListResponse,
    FriendRequestCreate,
    FriendRequestListResponse,
    FriendRequestOut,
    FriendUserOut,
    UserSearchResponse,
    UserSearchResult,
)
from app.services import compare as compare_service
from app.services import friends as friends_service
from app.services.friends import FriendError

router = APIRouter(prefix="/friends", tags=["friends"], dependencies=[Depends(get_current_user)])


def _friend_user_out(u: User) -> FriendUserOut:
    return FriendUserOut(id=str(u.id), username=u.username, avatar_url=u.avatar_url)


def _request_out(f) -> FriendRequestOut:
    return FriendRequestOut(
        id=str(f.id),
        requester=_friend_user_out(f.requester),
        addressee=_friend_user_out(f.addressee),
        status=f.status,
        created_at=f.created_at,
    )


@router.get("/search", response_model=UserSearchResponse)
def search_users(
    q: str = Query(min_length=2, max_length=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    matches = friends_service.search_users(db, current_user.id, q)
    return UserSearchResponse(
        results=[
            UserSearchResult(id=str(u.id), username=u.username, avatar_url=u.avatar_url, relationship_status=rel)
            for u, rel in matches
        ]
    )


@router.post("/requests", response_model=FriendRequestOut, status_code=status.HTTP_201_CREATED)
def send_friend_request(
    payload: FriendRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        friendship = friends_service.send_request(db, current_user.id, payload.username)
    except FriendError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return _request_out(friendship)


@router.get("/requests", response_model=FriendRequestListResponse)
def list_requests(
    direction: str = Query("incoming", pattern="^(incoming|outgoing)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        friends_service.list_incoming_requests(db, current_user.id)
        if direction == "incoming"
        else friends_service.list_outgoing_requests(db, current_user.id)
    )
    return FriendRequestListResponse(results=[_request_out(f) for f in rows])


@router.post("/requests/{friendship_id}/accept", response_model=FriendRequestOut)
def accept_request(
    friendship_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fid = uuid.UUID(friendship_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
    try:
        friendship = friends_service.accept_request(db, current_user.id, fid)
    except FriendError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _request_out(friendship)


@router.delete("/requests/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def decline_or_cancel_request(
    friendship_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fid = uuid.UUID(friendship_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")
    ok = friends_service.remove_relationship(db, current_user.id, fid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido não encontrado.")


@router.get("", response_model=FriendListResponse)
def list_friends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    friends = friends_service.list_friends(db, current_user.id)
    return FriendListResponse(results=[_friend_user_out(u) for u in friends])


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friend(
    friend_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fid = uuid.UUID(friend_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    ok = friends_service.remove_friend_by_user_id(db, current_user.id, fid)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Amizade não encontrada.")


@router.get("/{friend_id}/compare", response_model=CompareResponse)
def compare_with_friend(
    friend_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fid = uuid.UUID(friend_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    friend = db.query(User).filter(User.id == fid).first()
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    try:
        result = compare_service.compare_users(db, current_user.id, fid)
    except FriendError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return CompareResponse(friend=_friend_user_out(friend), **result)
