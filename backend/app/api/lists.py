from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.schemas.lists import (
    AddListItem,
    CustomListCreate,
    CustomListDetailOut,
    CustomListOut,
    CustomListRename,
    CustomListsResponse,
    ListMembershipResponse,
)
from app.services import lists as lists_service
from app.services.lists import ListError
from app.services.tmdb import TMDBError

router = APIRouter(prefix="/lists", tags=["lists"], dependencies=[Depends(get_current_user)])


async def _call(coro):
    try:
        return await coro
    except TMDBError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message)


@router.get("", response_model=CustomListsResponse)
def get_lists(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return {"results": lists_service.list_lists(db, current_user.id)}


@router.post("", response_model=CustomListOut, status_code=status.HTTP_201_CREATED)
def create_list(
    payload: CustomListCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        custom_list = lists_service.create_list(db, current_user.id, payload.name)
    except ListError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"id": str(custom_list.id), "name": custom_list.name, "created_at": custom_list.created_at, "item_count": 0}


@router.get("/membership", response_model=ListMembershipResponse)
def get_membership(
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Precisa vir antes de /{list_id} na declaração das rotas, senão
    # "membership" seria interpretado como um list_id.
    return {"list_ids": lists_service.get_membership(db, current_user.id, media_type, tmdb_id)}


@router.get("/{list_id}", response_model=CustomListDetailOut)
def get_list(
    list_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return lists_service.get_list_detail(db, current_user.id, list_id)
    except ListError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{list_id}", response_model=CustomListDetailOut)
def rename_list(
    list_id: str,
    payload: CustomListRename,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        lists_service.rename_list(db, current_user.id, list_id, payload.name)
        return lists_service.get_list_detail(db, current_user.id, list_id)
    except ListError as exc:
        status_code = status.HTTP_404_NOT_FOUND if "não encontrada" in str(exc) else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        lists_service.delete_list(db, current_user.id, list_id)
    except ListError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/{list_id}/items", response_model=CustomListDetailOut)
async def add_item(
    list_id: str,
    payload: AddListItem,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return await _call(lists_service.add_item(db, current_user.id, list_id, payload.media_type, payload.tmdb_id))
    except ListError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{list_id}/items/{media_type}/{tmdb_id}", response_model=CustomListDetailOut)
def remove_item(
    list_id: str,
    media_type: Literal["movie", "tv"],
    tmdb_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        return lists_service.remove_item(db, current_user.id, list_id, media_type, tmdb_id)
    except ListError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
