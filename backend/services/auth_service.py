"""
JWT helpers for X-Hunt authentication.

Token structure mirrors what the Next.js middleware (src/proxy.ts) and
Supabase RLS both expect:
  - sub          → user UUID (= user_profiles.id = auth.users.id)
  - role         → 'authenticated' (Supabase RLS requirement)
  - aud          → 'authenticated' (Supabase requirement)
  - app_role     → application role (explorer / tenant_admin / platform_admin)
  - surface      → default post-login destination (home / workspace / admin)
  - onboarding_complete → gating flag read by proxy.ts
  - tenant_id    → workspace UUID, null for explorers
  - type         → 'access' | 'refresh'  (validated by proxy.ts)
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import jwt, JWTError

from config import settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    surface: str,
    onboarding_complete: bool = False,
    tenant_id: str | None = None,
) -> tuple[str, int]:
    """Return (signed_jwt, expires_in_seconds)."""
    expires_in = settings.access_token_expire_minutes * 60
    payload: dict[str, Any] = {
        'sub': user_id,
        'aud': 'authenticated',
        'iat': _now(),
        'exp': _now() + timedelta(seconds=expires_in),
        # Supabase RLS — auth.role() returns 'authenticated' for this value
        'role': 'authenticated',
        # Custom claims read by proxy.ts and frontend
        'email': email,
        'app_role': role,
        'surface': surface,
        'onboarding_complete': onboarding_complete,
        'tenant_id': tenant_id,
        'type': 'access',
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires_in


def create_refresh_token(user_id: str) -> str:
    payload: dict[str, Any] = {
        'sub': user_id,
        'type': 'refresh',
        'iat': _now(),
        'exp': _now() + timedelta(days=settings.refresh_token_expire_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={'verify_aud': False},
        )
    except JWTError as exc:
        raise ValueError(f'Invalid token: {exc}') from exc
