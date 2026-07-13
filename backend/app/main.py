from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.auth import limiter, router as auth_router
from app.api.comments import router as comments_router
from app.api.episodes import router as episodes_router
from app.api.feed import router as feed_router
from app.api.friends import router as friends_router
from app.api.library import router as library_router
from app.api.media import router as media_router
from app.api.notifications import router as notifications_router
from app.api.recommendations import router as recommendations_router
from app.api.routes import router as health_router
from app.api.wrapped import router as wrapped_router
from app.core.config import settings

app = FastAPI(title="TrackerTV API", version="0.1.0", description="Backend do tracker de séries/filmes estilo TV Time.")

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
