import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(5), default="pt", server_default="pt")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
