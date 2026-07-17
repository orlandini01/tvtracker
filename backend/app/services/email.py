"""Envio de email transacional (esqueci minha senha, novos episódios).

Usa smtplib (biblioteca padrão do Python — sem dependência nova pra
gerenciar). Se SMTP_HOST não estiver configurado (.env), não tenta
conectar em lugar nenhum: só loga a mensagem/link no console, marcado
claramente como "modo dev", pra o fluxo continuar testável antes de ter
um provedor de email real configurado.
"""
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("app.email")


def _smtp_configured() -> bool:
    return bool(settings.smtp_host)


def _send_email(to_email: str, subject: str, body: str) -> None:
    if not _smtp_configured():
        # Modo dev: sem SMTP configurado, só loga o conteúdo pra continuar
        # testável. NUNCA deve acontecer em produção (environment != "development").
        logger.warning(
            "SMTP não configurado — email pra %s (modo dev, não enviado de verdade). Assunto: %s\n%s",
            to_email,
            subject,
            body,
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    subject = "Redefinição de senha — TrackerTV"
    body = (
        f"Recebemos um pedido pra redefinir a senha da sua conta no TrackerTV.\n\n"
        f"Clique no link abaixo pra escolher uma senha nova (válido por 30 minutos):\n"
        f"{reset_link}\n\n"
        f"Se você não pediu isso, pode ignorar este email — sua senha continua a mesma."
    )
    _send_email(to_email, subject, body)


def send_new_episodes_email(to_email: str, messages: list[str]) -> None:
    """Um único email por usuário, mesmo que várias séries tenham episódio
    novo na mesma checagem — evita inbox spam de vários emails picados."""
    subject = "Novos episódios disponíveis — TrackerTV"
    bullet_list = "\n".join(f"- {m}" for m in messages)
    body = (
        f"Tem novidade nas séries que você acompanha no TrackerTV:\n\n"
        f"{bullet_list}\n\n"
        f"Entre no app pra conferir e marcar como assistido.\n\n"
        f"Você pode desativar esses emails a qualquer momento na página de perfil."
    )
    _send_email(to_email, subject, body)
