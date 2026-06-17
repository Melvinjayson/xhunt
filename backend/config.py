from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    # Optional at startup — validated at request time so the service starts
    # even when env vars haven't been added to Render yet.
    supabase_url: str = ''
    supabase_service_role_key: str = ''

    jwt_secret: str = 'change-this-secret-in-production-minimum-32-chars!'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    redis_url: str = 'redis://localhost:6379/0'

    allowed_origins: str = 'http://localhost:3000,https://xhunt.app,https://xhunt-fsm2.onrender.com'

    app_env: str = 'development'

    next_public_app_url: str = 'https://xhunt.app'
    cron_secret: str = ''
    groq_api_key: str = ''

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(',')]


settings = Settings()  # type: ignore[call-arg]
