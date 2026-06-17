import { SignJWT } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'change-this-to-a-long-random-secret-at-least-64-chars',
);

export const PREVIEW_ENABLED = process.env.PREVIEW_MODE === 'true';

export interface PreviewUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: null;
  role: string;
  default_surface: string;
  onboarding_complete: boolean;
  tenant_id: null;
}

export async function createPreviewSession(
  email: string,
  displayName: string,
): Promise<{ token: { access_token: string; expires_in: number }; user: PreviewUser }> {
  const userId = crypto.randomUUID();
  const expiresIn = 15 * 60; // 15 minutes

  const access_token = await new SignJWT({
    sub: userId,
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_role: 'explorer',
    surface: 'home',
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
      role: 'explorer',
      default_surface: 'home',
      onboarding_complete: false,
      tenant_id: null,
    },
  };
}
