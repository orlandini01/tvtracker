"""Watch party: combinar um horário pra assistir um título junto com
amigos. O anfitrião marca o título + horário e convida amigos (cada
convite vira uma linha em WatchPartyInvite); um job periódico (ver
scheduler.py) avisa (push + email) quem confirmou presença quando a
sessão está próxima, uma única vez (reminder_sent evita duplicar)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WatchParty(Base):
    __tablename__ = "watch_parties"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    host_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    media_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("media.id", ondelete="CASCADE"), nullable=False, index=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    note: Mapped[str | None] = mapped_column(String(280), nullable=True)
    # True depois que o job de lembrete já avisou os confirmados uma vez —
    # sem isso, cada execução do job (a cada poucos minutos) mandaria o
    # aviso de novo enquanto a janela de "está prestes a começar" durar.
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
