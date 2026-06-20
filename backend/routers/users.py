"""
User profile management routes.
Email is sourced from the JWT (embedded at login) — user_profiles does not
store email; that lives in Supabase auth.users.
"""
import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from database import get_db
from models.auth import UserProfile
from services.auth_service import decode_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/users', tags=['users'])
bearer = HTTPBearer(auto_error=False)

SESSION_COOKIE = '__xhunt_session'


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    default_surface: str | None = None


def _resolve_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> dict:
    raw = credentials.credentials if credentials else request.cookies.get(SESSION_COOKIE)
    if not raw:
        raise HTTPException(401, 'Not authenticated')
    try:
        payload = decode_token(raw)
    except ValueError:
        raise HTTPException(401, 'Invalid token')
    if payload.get('type') != 'access':
        raise HTTPException(401, 'Invalid token type')
    return payload


def _fetch_profile(user_id: str) -> dict:
    db = get_db()
    result = db.table('user_profiles').select(
        'id, display_name, avatar_url, role, default_surface, onboarding_complete, tenant_id'
    ).eq('id', user_id).execute()
    if not result.data:
        raise HTTPException(404, 'Profile not found')
    return result.data[0]


def _to_user_profile(p: dict, email: str) -> UserProfile:
    return UserProfile(
        id=p['id'],
        email=email,
        display_name=p.get('display_name'),
        avatar_url=p.get('avatar_url'),
        role=p.get('role') or 'explorer',
        default_surface=p.get('default_surface') or 'home',
        onboarding_complete=bool(p.get('onboarding_complete')),
        tenant_id=p.get('tenant_id'),
    )


@router.patch('/me', response_model=UserProfile)
def update_me(
    body: UpdateProfileRequest,
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    payload = _resolve_token(request, credentials)
    user_id = payload['sub']
    email   = payload.get('email') or ''

    updates: dict = {}
    if body.display_name is not None:
        updates['display_name'] = body.display_name
    if body.avatar_url is not None:
        updates['avatar_url'] = body.avatar_url
    if body.default_surface in ('home', 'workspace', 'admin'):
        updates['default_surface'] = body.default_surface

    if updates:
        get_db().table('user_profiles').update(updates).eq('id', user_id).execute()

    return _to_user_profile(_fetch_profile(user_id), email)


@router.post('/me/complete-onboarding', response_model=UserProfile)
def complete_onboarding(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    payload = _resolve_token(request, credentials)
    user_id = payload['sub']
    email   = payload.get('email') or ''

    get_db().table('user_profiles').update(
        {'onboarding_complete': True}
    ).eq('id', user_id).execute()

    return _to_user_profile(_fetch_profile(user_id), email)
