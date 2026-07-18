"""Watch party: combinar um horário pra assistir um título junto com
amigos. O anfitrião marca o título + horário e convida amigos (só entre
amigos, mesma regra das listas colaborativas); cada convite vira uma
linha em WatchPartyInvite que o convidado aceita/recusa.

Um job periódico (ver scheduler.py + check_watch_party_reminders abaixo)
avisa (push + email) quem confirmou presença (+ o anfitrião) quando a
sessão está próxima, uma única vez — `reminder_sent` evita duplicar o
aviso em execuções seguintes do job.
"""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user import User
from app.models.watch_party import WatchParty
from app.models.watch_party_invite import WatchPartyInvite
from app.services import friends as friends_service
from app.services import push as push_service
from app.services.email import send_watch_party_reminder_email
from app.services.library import get_or_create_media
from app.services.tmdb import MediaType

REMINDER_WINDOW_HOURS = 24


class WatchPartyError(Exception):
    """Erro de regra de negócio (título não encontrado, convidado que não
    é amigo, tentar cancelar uma party que não é sua etc.) — não é erro
    de banco/infra."""


def _parse_uuid(value) -> uuid.UUID:
    try:
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
    except (ValueError, AttributeError, TypeError):
        raise WatchPartyError("Watch party não encontrada.")


def _user_out(user: User) -> dict:
    return {"id": str(user.id), "username": user.username, "avatar_url": user.avatar_url}


def _to_out(db: Session, viewer_id, party: WatchParty) -> dict:
    media = db.get(Media, party.media_id)
    host = db.get(User, party.host_id)
    invite_rows = (
        db.query(WatchPartyInvite, User)
        .join(User, WatchPartyInvite.user_id == User.id)
        .filter(WatchPartyInvite.party_id == party.id)
        .all()
    )
    my_invite = next((inv for inv, _u in invite_rows if inv.user_id == viewer_id), None)
    is_host = party.host_id == viewer_id

    return {
        "id": str(party.id),
        "host": _user_out(host),
        "media": {
            "tmdb_id": media.tmdb_id,
            "media_type": media.media_type,
            "title": media.title,
            "poster_url": media.poster_url,
        },
        "scheduled_at": party.scheduled_at,
        "note": party.note,
        "created_at": party.created_at,
        "is_host": is_host,
        "my_status": "host" if is_host else (my_invite.status if my_invite else None),
        "invites": [
            {"user": _user_out(u), "status": inv.status, "responded_at": inv.responded_at}
            for inv, u in invite_rows
        ],
    }


def _get_accessible_party(db: Session, user_id, party_id) -> WatchParty:
    """Anfitrião OU convidado — usado pra ver detalhe/responder convite."""
    party_uuid = _parse_uuid(party_id)
    party = db.get(WatchParty, party_uuid)
    if party is None:
        raise WatchPartyError("Watch party não encontrada.")
    is_invitee = (
        db.query(WatchPartyInvite).filter_by(party_id=party.id, user_id=user_id).first() is not None
    )
    if party.host_id != user_id and not is_invitee:
        raise WatchPartyError("Watch party não encontrada.")
    return party


async def create_party(
    db: Session,
    host_id,
    media_type: MediaType,
    tmdb_id: int,
    scheduled_at: datetime,
    note: str | None,
    invitee_usernames: list[str],
) -> dict:
    if scheduled_at.tzinfo is None:
        scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
    if scheduled_at <= datetime.now(timezone.utc):
        raise WatchPartyError("Escolha um horário no futuro.")

    # Valida TODOS os convidados antes de criar qualquer coisa — evita ter
    # que desfazer party/convites já gravados no meio do caminho.
    invitee_ids: list[uuid.UUID] = []
    seen: set[uuid.UUID] = set()
    for username in invitee_usernames:
        target = db.query(User).filter(User.username == username).first()
        if target is None:
            raise WatchPartyError(f'Usuário "{username}" não encontrado.')
        if target.id == host_id:
            raise WatchPartyError("Você não pode convidar você mesmo.")
        relationship = friends_service.get_relationship(db, host_id, target.id)
        if relationship is None or relationship.status != "accepted":
            raise WatchPartyError(f'"{username}" precisa ser seu amigo pra ser convidado.')
        if target.id not in seen:
            seen.add(target.id)
            invitee_ids.append(target.id)

    media = await get_or_create_media(db, media_type, tmdb_id)

    party = WatchParty(host_id=host_id, media_id=media.id, scheduled_at=scheduled_at, note=note)
    db.add(party)
    db.flush()

    for invitee_id in invitee_ids:
        db.add(WatchPartyInvite(party_id=party.id, user_id=invitee_id, status="pending"))

    db.commit()
    db.refresh(party)
    return _to_out(db, host_id, party)


def list_parties(db: Session, user_id) -> list[dict]:
    hosted_ids = {row[0] for row in db.query(WatchParty.id).filter_by(host_id=user_id).all()}
    invited_ids = {
        row[0] for row in db.query(WatchPartyInvite.party_id).filter_by(user_id=user_id).all()
    }
    all_ids = hosted_ids | invited_ids
    if not all_ids:
        return []

    parties = (
        db.query(WatchParty).filter(WatchParty.id.in_(all_ids)).order_by(WatchParty.scheduled_at.asc()).all()
    )
    return [_to_out(db, user_id, p) for p in parties]


def get_party_detail(db: Session, user_id, party_id) -> dict:
    party = _get_accessible_party(db, user_id, party_id)
    return _to_out(db, user_id, party)


def respond_invite(db: Session, user_id, party_id, response_status: str) -> dict:
    party_uuid = _parse_uuid(party_id)
    invite = db.query(WatchPartyInvite).filter_by(party_id=party_uuid, user_id=user_id).first()
    if invite is None:
        raise WatchPartyError("Convite não encontrado.")

    invite.status = response_status
    invite.responded_at = datetime.now(timezone.utc)
    db.commit()

    party = db.get(WatchParty, party_uuid)
    return _to_out(db, user_id, party)


def cancel_party(db: Session, host_id, party_id) -> None:
    party_uuid = _parse_uuid(party_id)
    party = db.query(WatchParty).filter_by(id=party_uuid, host_id=host_id).first()
    if party is None:
        raise WatchPartyError("Watch party não encontrada ou você não é o anfitrião.")
    db.delete(party)
    db.commit()


async def check_watch_party_reminders(db: Session) -> dict:
    """Job periódico (ver scheduler.py): avisa quem confirmou presença
    (+ o anfitrião) quando a sessão está a menos de REMINDER_WINDOW_HOURS
    de distância — uma única vez por party, controlado por reminder_sent."""
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=REMINDER_WINDOW_HOURS)

    parties = (
        db.query(WatchParty)
        .filter(WatchParty.reminder_sent.is_(False))
        .filter(WatchParty.scheduled_at >= now, WatchParty.scheduled_at <= window_end)
        .all()
    )

    emails_sent = 0
    pushes_sent = 0

    for party in parties:
        media = db.get(Media, party.media_id)
        title = media.title if media else "o título combinado"
        when_label = party.scheduled_at.strftime("%d/%m às %H:%M UTC")
        push_body = f'Watch party de "{title}" começa {when_label}.'

        recipient_ids = {party.host_id}
        accepted_invites = (
            db.query(WatchPartyInvite).filter_by(party_id=party.id, status="accepted").all()
        )
        recipient_ids.update(inv.user_id for inv in accepted_invites)

        users = db.query(User).filter(User.id.in_(recipient_ids)).all()
        for user in users:
            if user.email_notifications_enabled:
                send_watch_party_reminder_email(user.email, title, when_label)
                emails_sent += 1

        subscriptions = push_service.list_subscriptions_for_users(db, recipient_ids)
        for subscription in subscriptions:
            if push_service.send_push(db, subscription, "Watch party chegando", push_body, url="/watch-parties"):
                pushes_sent += 1

        party.reminder_sent = True

    db.commit()
    return {"emails_sent": emails_sent, "pushes_sent": pushes_sent, "parties_notified": len(parties)}
