"""Job em background: de tempos em tempos, checa episódios novos pra TODOS
os usuários de uma vez (ver app/services/notifications.py) e dispara email
pra quem tiver a preferência ligada.

Usa APScheduler rodando dentro do próprio processo do FastAPI (via
lifespan) — não precisa de infra extra (cron externo, worker separado)
pra um projeto desse tamanho. Cada instância do backend em produção teria
seu próprio scheduler; como o comportamento é idempotente (só age quando
detecta aumento real no total de episódios), rodar em mais de uma
instância no máximo duplica trabalho, nunca notificação.
"""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.notifications import check_new_episodes_for_all_users

logger = logging.getLogger("app.scheduler")

scheduler = AsyncIOScheduler()


async def _run_episode_check_job() -> None:
    db = SessionLocal()
    try:
        result = await check_new_episodes_for_all_users(db)
        logger.info(
            "Checagem de novos episódios concluída — %d email(s) e %d push(es) enviados.",
            result["emails_sent"],
            result["pushes_sent"],
        )
    except Exception:
        # Nunca deixa uma falha nessa checagem periódica derrubar o
        # scheduler inteiro (ele continuaria tentando na próxima janela).
        logger.exception("Falha na checagem periódica de novos episódios.")
    finally:
        db.close()


def start_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(
        _run_episode_check_job,
        "interval",
        hours=settings.episode_check_interval_hours,
        id="episode_check",
        next_run_time=None,  # não roda imediatamente ao subir; espera o primeiro intervalo
    )
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
