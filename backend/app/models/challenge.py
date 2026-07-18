"""Desafio sazonal (ex.: "5 filmes de terror em outubro"). Assim como as
conquistas, o progresso de cada usuário nunca fica guardado — é calculado
na hora a partir de UserMediaStatus/WatchedEpisode dentro da janela
[starts_at, ends_at), reaproveitando o mesmo padrão dinâmico já usado em
achievements.py."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CHALLENGE_KINDS = ("movie_count", "episode_count", "genre_count")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    # Só usado quando kind == "genre_count" — nome do gênero TMDB (ex:
    # "Terror"), igual ao formato já usado em recommendations.py.
    genre_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
