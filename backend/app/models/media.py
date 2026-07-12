import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Media(Base):
    """Cache relacional leve de um título — só o suficiente pra exibir listas
    (título, pôster, data) e servir de chave estrangeira pro status do
    usuário, sem precisar guardar o detalhe completo (isso já fica no
    tmdb_cache, com TTL). Uma linha por (tmdb_id, media_type)."""

    __tablename__ = "media"
    __table_args__ = (UniqueConstraint("tmdb_id", "media_type", name="uq_media_tmdb_id_media_type"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tmdb_id: Mapped[int] = mapped_column(nullable=False, index=True)
    media_type: Mapped[str] = mapped_column(String(10), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    poster_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    release_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    # Total de episódios já visto na última checagem de novidades (só usado
    # pra séries). None = ainda não checamos essa série; nesse caso a
    # primeira checagem só grava a baseline, sem gerar notificação (evita
    # notificar "novidade" pra episódios antigos na primeira vez que o
    # recurso roda pra um show já existente).
    known_episode_count: Mapped[int | None] = mapped_column(nullable=True)
