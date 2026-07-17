"""Conquistas/emblemas do usuário.

Assim como o Wrapped, não existe tabela própria: tudo é calculado na hora
a partir de tabelas que já existem (UserMediaStatus, WatchedEpisode,
CustomList, Friendship, Comment). Isso evita mais uma migration e mantém
a "definição" dos emblemas só no código — fácil de ajustar metas ou
adicionar um emblema novo sem tocar no banco.

Cada emblema tem um id estável (usado pelo frontend pra resolver ícone/
nome/descrição via i18n — o backend não manda texto, só o estado
earned/progress/target, igual o padrão já usado em WATCH_STATUSES).
"""
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.custom_list import CustomList
from app.models.friendship import Friendship
from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.models.watched_episode import WatchedEpisode

# Emblemas cujo alvo é fixo (a maioria). "maratonista" é calculado à parte
# porque depende de um agrupamento (maior rajada de episódios num único
# dia), não de uma contagem simples.
MOVIES_TARGET = 25
EPISODES_TARGET = 100
RATINGS_TARGET = 20
LISTS_TARGET = 3
FRIENDS_TARGET = 5
COMMENTS_TARGET = 10
FAVORITES_TARGET = 15
BINGE_TARGET = 10


def _capped(progress: int, target: int) -> dict:
    return {"progress": min(progress, target), "target": target, "earned": progress >= target}


def _movies_watched_count(db: Session, user_id) -> int:
    return (
        db.query(sa.func.count(UserMediaStatus.id))
        .join(Media, UserMediaStatus.media_id == Media.id)
        .filter(UserMediaStatus.user_id == user_id, Media.media_type == "movie", UserMediaStatus.status == "assistido")
        .scalar()
        or 0
    )


def _episodes_watched_count(db: Session, user_id) -> int:
    return db.query(sa.func.count(WatchedEpisode.id)).filter(WatchedEpisode.user_id == user_id).scalar() or 0


def _shows_with_progress_count(db: Session, user_id) -> int:
    return (
        db.query(sa.func.count(sa.distinct(WatchedEpisode.media_id)))
        .filter(WatchedEpisode.user_id == user_id)
        .scalar()
        or 0
    )


def _ratings_count(db: Session, user_id) -> int:
    movie_ratings = (
        db.query(sa.func.count(UserMediaStatus.id))
        .filter(UserMediaStatus.user_id == user_id, UserMediaStatus.rating.isnot(None))
        .scalar()
        or 0
    )
    episode_ratings = (
        db.query(sa.func.count(WatchedEpisode.id))
        .filter(WatchedEpisode.user_id == user_id, WatchedEpisode.rating.isnot(None))
        .scalar()
        or 0
    )
    return movie_ratings + episode_ratings


def _lists_count(db: Session, user_id) -> int:
    return db.query(sa.func.count(CustomList.id)).filter(CustomList.user_id == user_id).scalar() or 0


def _friends_count(db: Session, user_id) -> int:
    return (
        db.query(sa.func.count(Friendship.id))
        .filter(
            Friendship.status == "accepted",
            sa.or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
        )
        .scalar()
        or 0
    )


def _comments_count(db: Session, user_id) -> int:
    return db.query(sa.func.count(Comment.id)).filter(Comment.user_id == user_id).scalar() or 0


def _favorites_count(db: Session, user_id) -> int:
    return (
        db.query(sa.func.count(UserMediaStatus.id))
        .filter(UserMediaStatus.user_id == user_id, UserMediaStatus.is_favorite.is_(True))
        .scalar()
        or 0
    )


def _max_single_day_binge(db: Session, user_id) -> int:
    """Maior quantidade de episódios (de uma mesma série) assistidos no
    mesmo dia — "maratonar". Agrupa por (media_id, data), não só por data,
    pra não misturar episódios de séries diferentes vistos no mesmo dia."""
    rows = (
        db.query(sa.func.count(WatchedEpisode.id))
        .filter(WatchedEpisode.user_id == user_id)
        .group_by(WatchedEpisode.media_id, sa.func.date(WatchedEpisode.watched_at))
        .all()
    )
    return max((count for (count,) in rows), default=0)


def get_achievements(db: Session, user_id) -> list[dict]:
    movies = _movies_watched_count(db, user_id)
    episodes = _episodes_watched_count(db, user_id)
    shows = _shows_with_progress_count(db, user_id)
    ratings = _ratings_count(db, user_id)
    lists_count = _lists_count(db, user_id)
    friends = _friends_count(db, user_id)
    comments = _comments_count(db, user_id)
    favorites = _favorites_count(db, user_id)
    binge = _max_single_day_binge(db, user_id)

    # "primeiro_passo": qualquer título assistido (filme ou pelo menos um
    # episódio de série) — meta simbólica de 1.
    first_watch_progress = 1 if (movies > 0 or shows > 0) else 0

    achievements = [
        {"id": "primeiro_passo", **_capped(first_watch_progress, 1)},
        {"id": "maratonista", **_capped(binge, BINGE_TARGET)},
        {"id": "cinefilo", **_capped(movies, MOVIES_TARGET)},
        {"id": "serie_viciado", **_capped(episodes, EPISODES_TARGET)},
        {"id": "critico", **_capped(ratings, RATINGS_TARGET)},
        {"id": "curador", **_capped(lists_count, LISTS_TARGET)},
        {"id": "social", **_capped(friends, FRIENDS_TARGET)},
        {"id": "comentarista", **_capped(comments, COMMENTS_TARGET)},
        {"id": "favoritos", **_capped(favorites, FAVORITES_TARGET)},
    ]
    return achievements
