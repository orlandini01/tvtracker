from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.push import PushSubscribeRequest, VapidPublicKeyResponse
from app.services import push as push_service

router = APIRouter(prefix="/push", tags=["push"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def get_vapid_public_key():
    # Chave pública — não é segredo, o navegador precisa dela pra criar a
    # inscrição. Não exige login: o frontend pode checar se push está
    # habilitado no servidor antes mesmo de o usuário logar.
    return {"public_key": settings.vapid_public_key}


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def subscribe(
    payload: PushSubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    push_service.subscribe(db, current_user.id, payload.endpoint, payload.p256dh, payload.auth)


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe(
    payload: PushSubscribeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    push_service.unsubscribe(db, current_user.id, payload.endpoint)
