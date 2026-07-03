from supabase import create_client, Client
from config import settings

_admin: Client | None = None


def get_db() -> Client:
    """
    Admin Supabase client (service-role key).
    Bypasses RLS — safe for server-side use only.
    Used for all DB table queries and auth.admin.* operations.
    """
    global _admin
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. '
            'Add them to your .env file or platform environment settings.'
        )
    if _admin is None:
        _admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _admin
