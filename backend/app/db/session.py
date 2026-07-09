from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# pool_pre_ping evita erro de "connection já fechada" depois de idle longo
engine = create_engine(settings.database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency do FastAPI: abre uma sessão por request e sempre fecha no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
