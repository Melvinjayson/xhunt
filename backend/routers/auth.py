"""
Auth router — production implementation.

After migration 032 the user_profiles table owns its own UUIDs (no FK to
auth.users).  Credentials are stored as:
  - user_profiles.email        TEXT UNIQUE
  - user_profiles.password_hash TEXT (bcrypt)

Flow:
  Register  → hash password → INSERT user_profiles (generates UUID)
  Login     → lookup by email → verify bcrypt hash → issue JWT
  Refresh   → verify refresh token → re-issue access token
  Logout    → signal endpoint (cookies cleared by Next.js proxy)
  /me       → decode access JWT → return live profile from DB

Cookies are NOT set here.  The Next.js proxy route handlers (/api/auth/*)
set __xhunt_session (httpOnly) and __xhunt_at (non-httpOnly) on responses
that reach the browser.  The refresh token is passed back in the JSON body
so the Next.js handler can also set __xhunt_refresh.
"""
import logging

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

from config import settings
from database import get_db
from models.auth import (
    AuthResponse, LoginRequest, RegisterRequest, TokenResponse, UserProfile,
)
from services.auth_service import create_access_token, create_refresh_token, decode_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/auth', tags=['auth'])
bearer = HTTPBearer(auto_error=False)

_pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

REFRESH_COOKIE = '__xhunt_refresh'
SESSION_COOKIE = '__xhunt_session'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash(plain: str) -> str:
    return _pwd.hash(plain)


def _verify(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


def _profile_select() -> str:
    return (
        'id, email, display_name, avatar_url, role, '
        'default_surface, onboarding_complete, tenant_id'
    )


def _to_user(p: dict) -> UserProfile:
    return UserProfile(
        id=p['id'],
        email=p.get('email') or '',
        display_name=p.get('display_name'),
        avatar_url=p.get('avatar_url'),
        role=p.get('role') or 'explorer',
        default_surface=p.get('default_surface') or 'home',
        onboarding_complete=bool(p.get('onboarding_complete')),
        tenant_id=p.get('tenant_id'),
    )


def _make_tokens(p: dict) -> tuple[str, int, str]:
    """Return (access_token, expires_in, refresh_token) for a profile row."""
    access_token, expires_in = create_access_token(
        user_id=p['id'],
        email=p.get('email') or '',
        role=p.get('role') or 'explorer',
        surface=p.get('default_surface') or 'home',
        onboarding_complete=bool(p.get('onboarding_complete')),
        tenant_id=p.get('tenant_id'),
    )
    refresh_token = create_refresh_token(p['id'])
    return access_token, expires_in, refresh_token


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post('/register', response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest):
    db = get_db()

    # Reject duplicate emails before attempting insert
    existing = db.table('user_profiles').select('id').eq('email', body.email).execute()
    if existing.data:
        raise HTTPException(409, 'An account with that email already exists')

    display_name  = body.display_name or body.email.split('@')[0]
    password_hash = _hash(body.password)

    try:
        result = db.table('user_profiles').insert({
            'email':          body.email,
            'password_hash':  password_hash,
            'display_name':   display_name,
            'role':           'explorer',
            'default_surface': 'home',
            'onboarding_complete': False,
        }).execute()
    except Exception as exc:
        logger.error('user_profiles insert failed: %s', exc)
        raise HTTPException(500, 'Failed to create account — please try again')

    if not result.data:
        raise HTTPException(500, 'Failed to create account')

    profile = result.data[0]
    access_token, expires_in, refresh_token = _make_tokens(profile)

    return AuthResponse(
        token=TokenResponse(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=refresh_token,
        ),
        user=_to_user(profile),
    )


@router.post('/login', response_model=AuthResponse)
def login(body: LoginRequest):
    db = get_db()

    result = db.table('user_profiles').select(
        _profile_select() + ', password_hash'
    ).eq('email', body.email).execute()

    # Use the same error for both "not found" and "wrong password" to prevent
    # user enumeration attacks.
    if not result.data:
        raise HTTPException(401, 'Invalid email or password')

    profile = result.data[0]

    if not profile.get('password_hash') or not _verify(body.password, profile['password_hash']):
        raise HTTPException(401, 'Invalid email or password')

    access_token, expires_in, refresh_token = _make_tokens(profile)

    return AuthResponse(
        token=TokenResponse(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=refresh_token,
        ),
        user=_to_user(profile),
    )


@router.post('/refresh', response_model=TokenResponse)
def refresh(request: Request):
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(401, 'No refresh token')

    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(401, 'Invalid refresh token')

    if payload.get('type') != 'refresh':
        raise HTTPException(401, 'Invalid token type')

    user_id = payload['sub']
    result  = get_db().table('user_profiles').select(_profile_select()).eq('id', user_id).execute()
    if not result.data:
        raise HTTPException(401, 'User not found')

    access_token, expires_in, _ = _make_tokens(result.data[0])
    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post('/logout')
def logout():
    # Cookies are cleared by the Next.js proxy handler.
    # This endpoint exists for future server-side token invalidation (blocklist).
    return {'ok': True}


@router.get('/me', response_model=UserProfile)
def me(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    raw = credentials.credentials if credentials else request.cookies.get(SESSION_COOKIE)
    if not raw:
        raise HTTPException(401, 'Not authenticated')

    try:
        payload = decode_token(raw)
    except ValueError:
        raise HTTPException(401, 'Invalid token')

    if payload.get('type') != 'access':
        raise HTTPException(401, 'Invalid token type')

    result = get_db().table('user_profiles').select(_profile_select()).eq('id', payload['sub']).execute()
    if not result.data:
        raise HTTPException(404, 'Profile not found')

    return _to_user(result.data[0])
