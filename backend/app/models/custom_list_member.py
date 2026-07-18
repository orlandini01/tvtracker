"""Colaboradores adicionais de uma lista customizada, além do dono
(CustomList.user_id). Qualquer membro pode ver a lista e adicionar/
remover itens; só o dono pode renomear/excluir a lista ou gerenciar quem
é membro (convidar/remover)."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CustomListMember(Base):
    __tablename__ = "custom_list_members"
    __table_args__ = (UniqueConstraint("list_id", "user_id", name="uq_custom_list_member"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    list_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("custom_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
