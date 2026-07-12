"""Feed social: atividades recentes dos amigos aceitos do usuário."""
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.media import Media
from app.models.user import User
from app.services.friends import get_friend_ids


def list_feed(db: Session, user_id, page: int = 1, page_size: int = 20) -> dict:
    friend_ids = get_friend_ids(db, user_id)
    if not friend_ids:
        return {"results": [], "page": page, "has_more": False}

    offset = (page - 1) * page_size
    rows = (
        db.query(Activity, Media, User)
        .join(Media, Activity.media_id == Media.id)
        .join(User, Activity.user_id == User.id)
        .filter(Activity.user_id.in_(friend_ids))
        .order_by(Activity.created_at.desc())
        .offset(offset)
        .limit(page_size + 1)
        .all()
    )

    has_more = len(rows) > page_size
    rows = rows[:page_size]

    results = [
        {
            "id": str(activity.id),
            "user": {"id": str(user.id), "username": user.username},
            "media": {
                "tmdb_id": media.tmdb_id,
                "media_type": media.media_type,
                "title": media.title,
                "poster_url": media.poster_url,
            },
            "action": activity.action,
            "detail": activity.detail,
            "created_at": activity.created_at,
        }
        for activity, media, user in rows
    ]
    return {"results": results, "page": page, "has_more": has_more}
