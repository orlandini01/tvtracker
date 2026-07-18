import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Status possíveis — validados de verdade no schema Pydantic (app/schemas/library.py);
# aqui é só string simples pra manter a migration/tabela sem enum nativo do Postgres
# (mais fácil de estender depois sem precisar de ALTER TYPE).
WATCH_STATUSES = ("quero_assistir", "assistindo", "assistido", "abandonei")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UserMediaStatus(Base):
    __tablename__ = "user_media_status"
    __table_args__ = (UniqueConstraint("user_id", "media_id", name="uq_user_media"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"), nullable=False, index=True)

    status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    watched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Quantas vezes o usuário marcou "já assisti de novo" depois da primeira
    # vez (filme só, por enquanto — série tem o conceito por episódio, que
    # já é outro fluxo). watched_at sempre reflete a data do watch mais
    # recente (primeira vez OU último rewatch), então o Diário automaticamente
    # "sobe" o título de novo quando ele é reassistido.
    rewatch_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
