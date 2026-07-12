"""Progresso de episódios assistidos por série (só faz sentido pra
media_type="tv" — filmes não têm temporada/episódio)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WatchedEpisode(Base):
    __tablename__ = "watched_episodes"
    __table_args__ = (
        UniqueConstraint("user_id", "media_id", "season_number", "episode_number", name="uq_watched_episode"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"), nullable=False, index=True)
    season_number: Mapped[int] = mapped_column(Integer, nullable=False)
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    watched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
