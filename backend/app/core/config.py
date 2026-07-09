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
