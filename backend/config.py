from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    # Supabase — service role key gives admin DB access (bypasses RLS)
    supabase_url: str = ''
    supabase_service_role_key: str = ''

    # JWT — MUST match NEXT_PUBLIC_AUTH_URL consumer (Next.js JWT_SECRET)
    jwt_secret: str = 'change-this-secret-in-production-minimum-64-chars-xxxxxxxxxxxxxxxx'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Infrastructure
    redis_url: str = 'redis://localhost:6379/0'
    allowed_origins: str = 'http://localhost:3000,https://xhunt.app,https://xhunt-fsm2.onrender.com'
    app_env: str = 'development'

    # Integrations (optional — used by worker / notification tasks)
    next_public_app_url: str = 'https://xhunt.app'
    cron_secret: str = ''
    groq_api_key: str = ''

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(',')]

    @property
    def is_production(self) -> bool:
        return self.app_env == 'production'

    def validate_required(self) -> None:
        """Raise at startup if critical env vars are missing."""
        missing = []
        if not self.supabase_url:
            missing.append('SUPABASE_URL')
        if not self.supabase_service_role_key:
            missing.append('SUPABASE_SERVICE_ROLE_KEY')
        if self.jwt_secret.startswith('change-this'):
            missing.append('JWT_SECRET (still using default — set a secure 64-char value)')
        if missing:
            raise RuntimeError(
                f'Missing required environment variables: {", ".join(missing)}\n'
                'Set these in your .env file or platform environment settings.'
            )


settings = Settings()  # type: ignore[call-arg]
