"""Calendário de lançamentos: próximos episódios (séries) e estreias
(filmes) dos títulos que o usuário acompanha.

Mesmo critério de elegibilidade usado nas notificações de novo episódio
(favoritado OU status "quero_assistir"/"assistindo") — não faz sentido
avisar quem já abandonou o título ou nunca teve relação com ele.
"""
import asyncio
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.services import tmdb
from app.services.tmdb import TMDBError


def _tracked_media(db: Session, user_id) -> list[Media]:
    return (
        db.query(Media)
        .join(UserMediaStatus, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id)
        .filter(
            (UserMediaStatus.is_favorite.is_(True))
            | (UserMediaStatus.status.in_(["quero_assistir", "assistindo"]))
        )
        .all()
    )


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


async def _detail_or_none(db: Session, media: Media) -> dict | None:
    try:
        return await tmdb.get_detail(db, media.media_type, media.tmdb_id)
    except TMDBError:
        # Título pode ter sido removido do TMDB ou a API estar instável —
        # não deixa isso quebrar o calendário inteiro.
        return None


async def get_calendar(db: Session, user_id) -> list[dict]:
    tracked = _tracked_media(db, user_id)
    today = datetime.now(timezone.utc).date()

    # Mesma justificativa de segurança já usada no serviço de recomendações:
    # cada chamada só faz um GET de rede antes de qualquer mutação no cache
    # (get_detail grava no cache de forma síncrona, sem await no meio), então
    # paralelizar com gather sobre a mesma Session é seguro aqui.
    details = await asyncio.gather(*(_detail_or_none(db, media) for media in tracked))

    items: list[dict] = []
    for media, detail in zip(tracked, details):
        if detail is None:
            continue

        if media.media_type == "movie":
            release = _parse_date(detail.get("release_date"))
            if release is not None and release >= today:
                items.append(
                    {
                        "tmdb_id": media.tmdb_id,
                        "media_type": "movie",
                        "title": media.title,
                        "poster_url": media.poster_url,
                        "date": release.isoformat(),
                        "kind": "movie_release",
                        "season_number": None,
                        "episode_number": None,
                        "episode_name": None,
                    }
                )
        else:
            next_ep = detail.get("next_episode_to_air")
            if next_ep:
                air_date = _parse_date(next_ep.get("air_date"))
                if air_date is not None and air_date >= today:
                    items.append(
                        {
                            "tmdb_id": media.tmdb_id,
                            "media_type": "tv",
                            "title": media.title,
                            "poster_url": media.poster_url,
                            "date": air_date.isoformat(),
                            "kind": "episode",
                            "season_number": next_ep.get("season_number"),
                            "episode_number": next_ep.get("episode_number"),
                            "episode_name": next_ep.get("name"),
                        }
                    )

    items.sort(key=lambda i: i["date"])
    return items


def _escape_ics(text: str) -> str:
    """Escapa caracteres especiais de texto livre em campos ICS (RFC 5545
    §3.3.11): barra invertida, ponto e vírgula, vírgula e quebra de linha."""
    return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold_ics_line(line: str) -> str:
    """RFC 5545 §3.1 exige quebrar linhas com mais de 75 octetos, com
    continuação iniciando por um espaço. Aproximação por caracteres (não
    por octeto UTF-8 exato) — suficiente pros títulos normais do TMDB e
    aceito pelos principais clientes de calendário."""
    if len(line) <= 75:
        return line
    parts = [line[:75]]
    rest = line[75:]
    while rest:
        parts.append(" " + rest[:74])
        rest = rest[74:]
    return "\r\n".join(parts)


async def export_ics(db: Session, user_id) -> str:
    """Gera o conteúdo de um arquivo .ics com um VEVENT por lançamento
    futuro rastreado (mesma fonte de dados do calendário na tela) — export
    autenticado sob demanda, não uma URL "assinável" (isso exigiria um
    esquema de token secreto separado, como o share_token do Wrapped)."""
    items = await get_calendar(db, user_id)
    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TrackerTV//Calendario de Lancamentos//PT",
        "CALSCALE:GREGORIAN",
    ]

    for item in items:
        dt = item["date"].replace("-", "")
        uid = f"trackertv-{item['media_type']}-{item['tmdb_id']}-{item['date']}@trackertv"

        if item["kind"] == "movie_release":
            summary = f"Estreia: {item['title']}"
        else:
            ep_label = ""
            if item.get("season_number") is not None and item.get("episode_number") is not None:
                ep_label = f" T{item['season_number']}E{item['episode_number']}"
            summary = f"{item['title']}{ep_label}"
            if item.get("episode_name"):
                summary += f" - {item['episode_name']}"

        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:{uid}")
        lines.append(f"DTSTAMP:{now_stamp}")
        lines.append(f"DTSTART;VALUE=DATE:{dt}")
        lines.append(f"SUMMARY:{_escape_ics(summary)}")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold_ics_line(line) for line in lines) + "\r\n"
