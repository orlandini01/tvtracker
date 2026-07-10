from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TmdbCache(Base):
    """Cache genérico de respostas já mapeadas do TMDB (chave -> payload).

    Evita bater no TMDB de novo a cada request para dados que não mudam a
    cada minuto (populares, em cartaz, detalhes, etc). TTL é aplicado na
    hora da leitura (ver app/services/tmdb.py), não há job de limpeza —
    linhas velhas só são sobrescritas quando o cache_key é reconsultado.
    """

    __tablename__ = "tmdb_cache"

    cache_key: Mapped[str] = mapped_column(String(255), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSONB)
    cached_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
