from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.achievements import router as achievements_router
from app.api.auth import limiter, router as auth_router
from app.api.calendar import router as calendar_router
from app.api.challenges import router as challenges_router
from app.api.comments import router as comments_router
from app.api.diary import router as diary_router
from app.api.episodes import router as episodes_router
from app.api.feed import router as feed_router
from app.api.friends import router as friends_router
from app.api.library import router as library_router
from app.api.lists import router as lists_router
from app.api.media import router as media_router
from app.api.notifications import router as notifications_router
from app.api.profile import router as profile_router
from app.api.public import router as public_router
from app.api.push import router as push_router
from app.api.recommendations import router as recommendations_router
from app.api.roulette import router as roulette_router
from app.api.routes import router as health_router
from app.api.stats import router as stats_router
from app.api.wrapped import router as wrapped_router
from app.core.config import settings
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Job de checagem de novos episódios em lote (in-app + email) — não
    # roda em testes (SessionLocal/engine de teste não deve ganhar um
    # scheduler de fundo brigando pela conexão), então cada teste que sobe
    # o app via TestClient simplesmente nunca chama isso de verdade.
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="TrackerTV API",
    version="0.1.0",
    description="Backend do tracker de séries/filmes estilo TV Time.",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(episodes_router)
app.include_router(media_router)
app.include_router(library_router)
app.include_router(friends_router)
app.include_router(feed_router)
app.include_router(comments_router)
app.include_router(notifications_router)
app.include_router(wrapped_router)
app.include_router(recommendations_router)
app.include_router(lists_router)
app.include_router(calendar_router)
app.include_router(profile_router)
app.include_router(public_router)
app.include_router(achievements_router)
app.include_router(diary_router)
app.include_router(stats_router)
app.include_router(roulette_router)
app.include_router(challenges_router)
app.include_router(push_router)

# Avatares customizados: servidos como arquivos estáticos direto do disco
# do servidor. O diretório fica fora do controle de versão (.gitignore) e é
# criado automaticamente se ainda não existir.
_uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")
