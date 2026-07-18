"""Regras de negócio dos comentários em títulos.

Comentários são visíveis pra qualquer usuário logado que abra a página do
título (igual a um mural público da obra, não é privado por amizade) —
mantém simples, já que o feed já cuida de mostrar só atividade de amigos.
Criar um comentário também gera uma Activity, pra aparecer no feed social.
"""
from sqlalchemy.orm import Session, joinedload

from app.models.comment import Comment
from app.models.media import Media
from app.services.library import _log_activity, get_or_create_media
from app.services.tmdb import MediaType


def _to_out(comment: Comment, current_user_id) -> dict:
    return {
        "id": str(comment.id),
        "user": {"id": str(comment.user.id), "username": comment.user.username},
        "body": comment.body,
        "contains_spoiler": comment.contains_spoiler,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
        "is_mine": comment.user_id == current_user_id,
    }


async def create_comment(
    db: Session, user_id, media_type: MediaType, tmdb_id: int, body: str, contains_spoiler: bool = False
) -> dict:
    media = await get_or_create_media(db, media_type, tmdb_id)
    comment = Comment(user_id=user_id, media_id=media.id, body=body.strip(), contains_spoiler=contains_spoiler)
    db.add(comment)
    # Nunca loga o texto de um comentário com spoiler no feed — só o fato
    # de que a pessoa comentou, sem vazar o conteúdo em outro lugar.
    activity_detail = "Comentário com spoiler" if contains_spoiler else body.strip()[:60]
    _log_activity(db, user_id, media.id, "commented", activity_detail)
    db.commit()
    db.refresh(comment)
    _ = comment.user  # força carregar a relationship antes de montar o dict de saida
    return _to_out(comment, user_id)


def list_comments(db: Session, current_user_id, media_type: MediaType, tmdb_id: int) -> list[dict]:
    media = db.query(Media).filter_by(tmdb_id=tmdb_id, media_type=media_type).first()
    if media is None:
        return []
    comments = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.media_id == media.id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [_to_out(c, current_user_id) for c in comments]


def delete_comment(db: Session, user_id, comment_id) -> bool:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if comment is None or comment.user_id != user_id:
        return False
    db.delete(comment)
    db.commit()
    return True
