from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configurações da aplicação, carregadas de variáveis de ambiente / .env.

    Nunca colocar valores reais de segredo aqui — apenas defaults seguros
    para desenvolvimento local. Em produção, tudo vem de variáveis de
    ambiente configuradas no Railway/Render.
    """

    database_url: str
    secret_key: str
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    tmdb_api_key: str = ""
    tmdb_api_base_url: str = "https://api.themoviedb.org/3"
    cors_origins: str = "http://localhost:5173"
    environment: str = "development"

    # SMTP pro email de "esqueci minha senha". Se smtp_host ficar vazio
    # (default), o serviço de email cai no modo dev: só loga o link no
    # console em vez de tentar mandar de verdade — assim o fluxo continua
    # testável antes de configurar um provedor de email de verdade.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "TrackerTV <no-reply@trackertv.local>"
    # URL do frontend usada pra montar o link de redefinição de senha
    # (ex: https://app.trackertv.com) — nunca deduzida do header Origin da
    # requisição, pra não permitir que alguém manipule o link do email.
    frontend_url: str = "http://localhost:5173"

    # De quantas em quantas horas o job em background verifica episódios
    # novos pra TODOS os usuários (dispara notificação in-app + email pra
    # quem tiver a preferência ligada). 6h é um bom equilíbrio entre "chega
    # rápido" e "não fica batendo demais na API do TMDB".
    episode_check_interval_hours: int = 6

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
