"""Regras de negócio da lista pessoal do usuário (favoritos, status, notas).

`Media` é um cache relacional leve — só é criado na primeira vez que
QUALQUER usuário marca aquele título (favorita, muda status ou avalia).
Usa o proxy TMDB (já com cache próprio) só pra pegar título/pôster/data na
primeira vez; depois disso nunca mais precisa do TMDB pra esse título.

Toda mudança "positiva" (favoritou, mudou status, deu nota) também grava
uma `Activity`, usada para montar o feed social dos amigos. Não logamos
remoções/limpezas (desfavoritar, tirar nota) pra não poluir o feed com
eventos negativos.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.services import tmdb
from app.services.tmdb import MediaType


class LibraryError(Exception):
    """Erro de regra de negócio (ex.: tentar marcar rewatch de um título
    que o usuário nunca assistiu) — não é erro de banco/infra."""


async def get_or_create_media(db: Session, media_type: MediaType, tmdb_id: int) -> Media:
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is not None:
        return media

    detail = await tmdb.get_detail(db, media_type, tmdb_id)
    media = Media(
        tmdb_id=tmdb_id,
        media_type=media_type,
        title=detail["title"],
        poster_url=detail["poster_url"],
        release_date=detail["release_date"],
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


def _get_entry(db: Session, user_id, media_id) -> UserMediaStatus | None:
    return db.query(UserMediaStatus).filter_by(user_id=user_id, media_id=media_id).first()


def _to_out(media: Media, entry: UserMediaStatus | None) -> dict:
    return {
        "tmdb_id": media.tmdb_id,
        "media_type": media.media_type,
        "title": media.title,
        "poster_url": media.poster_url,
        "status": entry.status if entry else None,
        "is_favorite": entry.is_favorite if entry else False,
        "rating": entry.rating if entry else None,
        "watched_at": entry.watched_at if entry else None,
        "rewatch_count": entry.rewatch_count if entry else 0,
        "updated_at": entry.updated_at if entry else media.created_at,
    }


def _log_activity(db: Session, user_id, media_id, action: str, detail: str | None) -> None:
    db.add(Activity(user_id=user_id, media_id=media_id, action=action, detail=detail))


async def get_status(db: Session, user_id, media_type: MediaType, tmdb_id: int) -> dict:
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is None:
        return {
            "tmdb_id": tmdb_id,
            "media_type": media_type,
            "title": "",
            "poster_url": None,
            "status": None,
            "is_favorite": False,
            "rating": None,
            "watched_at": None,
            "rewatch_count": 0,
            "updated_at": datetime.now(timezone.utc),
        }
    entry = _get_entry(db, user_id, media.id)
    return _to_out(media, entry)


async def upsert_status(db: Session, user_id, media_type: MediaType, tmdb_id: int, update: dict) -> dict:
    media = await get_or_create_media(db, media_type, tmdb_id)
    entry = _get_entry(db, user_id, media.id)
    if entry is None:
        entry = UserMediaStatus(user_id=user_id, media_id=media.id)
        db.add(entry)

    was_favorite = entry.is_favorite
    old_status = entry.status

    if "status" in update:
        entry.status = update["status"]
        if update["status"] == "assistido" and entry.watched_at is None:
            entry.watched_at = datetime.now(timezone.utc)
    if "is_favorite" in update:
        entry.is_favorite = update["is_favorite"]
    if "rating" in update:
        entry.rating = update["rating"]

    # Loga atividade só em transições "positivas" (algo novo marcado), não
    # quando o usuário desmarca/limpa um campo.
    if "is_favorite" in update and update["is_favorite"] and not was_favorite:
        _log_activity(db, user_id, media.id, "favorited", None)
    if "status" in update and update["status"] is not None and update["status"] != old_status:
        _log_activity(db, user_id, media.id, "status_changed", update["status"])
    if "rating" in update and update["rating"] is not None:
        _log_activity(db, user_id, media.id, "rated", str(update["rating"]))

    db.commit()
    db.refresh(entry)
    return _to_out(media, entry)


async def mark_rewatch(db: Session, user_id, media_type: MediaType, tmdb_id: int) -> dict:
    """"Já assisti de novo" — só faz sentido pra um título que o usuário já
    marcou como assistido antes (senão seria só a primeira vez, que já é
    coberta por upsert_status). Atualiza watched_at pra agora (o Diário
    passa a mostrar esse rewatch como o evento mais recente do título) e
    incrementa o contador."""
    media = await get_or_create_media(db, media_type, tmdb_id)
    entry = _get_entry(db, user_id, media.id)
    if entry is None or entry.status != "assistido":
        raise LibraryError("Marque esse título como assistido antes de registrar um rewatch.")

    entry.rewatch_count += 1
    entry.watched_at = datetime.now(timezone.utc)
    _log_activity(db, user_id, media.id, "rewatched", None)
    db.commit()
    db.refresh(entry)
    return _to_out(media, entry)


def delete_status(db: Session, user_id, media_type: MediaType, tmdb_id: int) -> bool:
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is None:
        return False
    entry = _get_entry(db, user_id, media.id)
    if entry is None:
        return False
    db.delete(entry)
    db.commit()
    return True


def list_library(db: Session, user_id, status_filter: str | None, favorites_only: bool) -> list[dict]:
    from sqlalchemy import or_

    query = (
        db.query(UserMediaStatus, Media)
        .join(Media, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id)
        .filter(
            or_(
                UserMediaStatus.status.is_not(None),
                UserMediaStatus.is_favorite.is_(True),
                UserMediaStatus.rating.is_not(None),
            )
        )
    )
    if status_filter:
        query = query.filter(UserMediaStatus.status == status_filter)
    if favorites_only:
        query = query.filter(UserMediaStatus.is_favorite.is_(True))
    query = query.order_by(UserMediaStatus.updated_at.desc())

    return [_to_out(media, entry) for entry, media in query.all()]
