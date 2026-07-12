"""Comparação de gostos entre dois amigos.

Compatibilidade = índice de Jaccard sobre o conjunto de títulos com que
cada um "interagiu de verdade" (favoritou, marcou algum status ou deu
nota) — títulos em comum / total de títulos distintos entre os dois.

Recomendações = títulos que o amigo marcou (favorito, status ou nota) e o
usuário atual ainda não tem nenhuma entrada — ordenados priorizando
favoritos e notas altas do amigo.
"""
from sqlalchemy.orm import Session

from app.models.media import Media
from app.models.user_media_status import UserMediaStatus
from app.services.friends import FriendError, get_relationship


def _interacted_map(db: Session, user_id) -> dict:
    """media_id -> (UserMediaStatus, Media) só para linhas com algum sinal
    real (mesma regra usada em list_library)."""
    from sqlalchemy import or_

    rows = (
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
        .all()
    )
    return {entry.media_id: (entry, media) for entry, media in rows}


def _entry_out(entry: UserMediaStatus | None) -> dict:
    return {
        "status": entry.status if entry else None,
        "is_favorite": entry.is_favorite if entry else False,
        "rating": entry.rating if entry else None,
    }


def compare_users(db: Session, user_id, friend_id) -> dict:
    relationship = get_relationship(db, user_id, friend_id)
    if relationship is None or relationship.status != "accepted":
        raise FriendError("Vocês precisam ser amigos pra comparar gostos.")

    my_map = _interacted_map(db, user_id)
    friend_map = _interacted_map(db, friend_id)

    my_ids = set(my_map.keys())
    friend_ids = set(friend_map.keys())
    common_ids = my_ids & friend_ids
    union_ids = my_ids | friend_ids

    score = round(len(common_ids) / len(union_ids) * 100, 1) if union_ids else 0.0

    common_titles = []
    for media_id in common_ids:
        my_entry, media = my_map[media_id]
        friend_entry, _ = friend_map[media_id]
        common_titles.append(
            {
                "tmdb_id": media.tmdb_id,
                "media_type": media.media_type,
                "title": media.title,
                "poster_url": media.poster_url,
                "you": _entry_out(my_entry),
                "friend": _entry_out(friend_entry),
            }
        )
    # mais recentes primeiro (baseado na atualização do amigo, que é quem "gerou" a comparação relevante)
    common_titles.sort(key=lambda c: (c["friend"]["rating"] or 0, c["friend"]["is_favorite"]), reverse=True)

    recommend_only_ids = friend_ids - my_ids
    recommendations = []
    for media_id in recommend_only_ids:
        friend_entry, media = friend_map[media_id]
        recommendations.append(
            {
                "tmdb_id": media.tmdb_id,
                "media_type": media.media_type,
                "title": media.title,
                "poster_url": media.poster_url,
                "friend_is_favorite": friend_entry.is_favorite,
                "friend_rating": friend_entry.rating,
                "friend_status": friend_entry.status,
            }
        )
    recommendations.sort(
        key=lambda r: (r["friend_is_favorite"], r["friend_rating"] or 0),
        reverse=True,
    )
    recommendations = recommendations[:10]

    return {
        "compatibility_score": score,
        "common_count": len(common_ids),
        "total_count": len(union_ids),
        "common_titles": common_titles,
        "recommendations": recommendations,
    }
