import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-this-to-a-long-random-secret-at-least-64-chars',
);

/**
 * Preview mode is ONLY active when PREVIEW_MODE=true is explicitly set.
 * It is never active in production (NODE_ENV=production ignores this flag).
 * Production auth runs through the Python backend (NEXT_PUBLIC_AUTH_URL).
 */
export const PREVIEW_ENABLED =
  process.env.PREVIEW_MODE === 'true' && process.env.NODE_ENV !== 'production';

// Fixed tenant ID used for all workspace preview sessions
const PREVIEW_TENANT_ID = '00000000-0000-0000-0000-preview000001';

export interface PreviewUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: null;
  role: string;
  default_surface: string;
  onboarding_complete: boolean;
  tenant_id: string | null;
}

export async function createPreviewSession(
  email: string,
  displayName: string,
  opts?: { surface?: 'home' | 'workspace' },
): Promise<{ token: { access_token: string; expires_in: number }; user: PreviewUser }> {
  const userId = crypto.randomUUID();
  const expiresIn = 15 * 60; // 15 minutes

  const isWorkspace = opts?.surface === 'workspace';
  const role = isWorkspace ? 'tenant_admin' : 'explorer';
  const surface = isWorkspace ? 'workspace' : 'home';
  const tenantId = isWorkspace ? PREVIEW_TENANT_ID : null;

  const access_token = await new SignJWT({
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_role: role,
    surface,
    onboarding_complete: true,
    tenant_id: tenantId,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(SECRET);

  return {
    token: { access_token, expires_in: expiresIn },
    user: {
      id: userId,
      email,
      display_name: displayName,
      avatar_url: null,
      role,
      default_surface: surface,
      onboarding_complete: true,
      tenant_id: tenantId,
    },
  };
}
