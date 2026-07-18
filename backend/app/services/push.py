"""Notificação push do navegador (Web Push API + VAPID).

Assim como o email de novos episódios, é melhor-esforço: se as chaves
VAPID não estiverem configuradas, ou o navegador tiver cancelado a
inscrição (a API do provedor de push responde 404/410 nesse caso), a
falha só é logada — nunca derruba o job periódico que dispara isso.

O "opt-in" aqui não é um campo booleano no usuário (diferente do email) —
é a própria existência de uma inscrição salva: o navegador só manda uma
quando o usuário aceita a permissão de notificação e clica em "ativar" no
app. Sem inscrição, sem push. Desativar = apagar a inscrição.
"""
import json
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.push_subscription import PushSubscription

logger = logging.getLogger("app.push")


def subscribe(db: Session, user_id, endpoint: str, p256dh: str, auth: str) -> None:
    existing = db.query(PushSubscription).filter_by(endpoint=endpoint).first()
    if existing is not None:
        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
    else:
        db.add(PushSubscription(user_id=user_id, endpoint=endpoint, p256dh=p256dh, auth=auth))
    db.commit()


def unsubscribe(db: Session, user_id, endpoint: str) -> None:
    db.query(PushSubscription).filter_by(user_id=user_id, endpoint=endpoint).delete()
    db.commit()


def has_subscription(db: Session, user_id) -> bool:
    return db.query(PushSubscription).filter_by(user_id=user_id).first() is not None


def list_subscriptions_for_users(db: Session, user_ids) -> list[PushSubscription]:
    user_ids = list(user_ids)
    if not user_ids:
        return []
    return db.query(PushSubscription).filter(PushSubscription.user_id.in_(user_ids)).all()


def send_push(db: Session, subscription: PushSubscription, title: str, body: str, url: str = "/") -> bool:
    if not settings.vapid_private_key:
        logger.warning(
            "VAPID não configurado — push pra %s não enviado (modo dev): %s", subscription.endpoint, title
        )
        return False

    from pywebpush import WebPushException, webpush

    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_claims_email},
        )
        return True
    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", None)
        if status_code in (404, 410):
            # inscrição expirada/revogada no navegador — limpa do banco
            db.query(PushSubscription).filter_by(id=subscription.id).delete()
            db.commit()
        else:
            logger.warning("Falha ao enviar push pra %s: %s", subscription.endpoint, exc)
        return False
