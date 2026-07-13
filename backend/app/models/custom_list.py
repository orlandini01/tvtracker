"""Listas customizáveis do usuário (ex: "Pra assistir com a galera",
"Terror de sexta") — complementam os status fixos (quero_assistir/
assistindo/assistido/abandonei) sem substituí-los; um título pode estar
em quantas listas customizadas o usuário quiser, independente do status."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CustomList(Base):
    __tablename__ = "custom_lists"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_custom_list_user_name"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
