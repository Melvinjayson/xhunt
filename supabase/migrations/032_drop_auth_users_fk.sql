-- Migration 032: Complete custom-auth migration
--
-- Migration 028 added email + password_hash to user_profiles but left the
-- FK constraint (user_profiles.id → auth.users.id) in place, which blocked
-- the Python auth service from inserting new users (FK violation on INSERT).
--
-- This migration:
--   1. Drops the FK so user_profiles.id becomes a self-managed UUID.
--   2. Adds a DEFAULT so new rows auto-generate their own UUID.
--   3. Adds default_surface column used by the auth service surface routing.
--   4. Ensures explorer role is allowed (initial schema only allowed 'participant').
--   5. Adds the role 'explorer' as an alias for participant-level consumers.

-- 1. Drop FK constraint to auth.users
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- 2. Add UUID default so inserts without explicit id still work
ALTER TABLE public.user_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Add default_surface column for post-login routing
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS default_surface TEXT NOT NULL DEFAULT 'home'
    CHECK (default_surface IN ('home', 'workspace', 'admin'));

-- 4. Expand role check to include 'explorer' (consumer-facing alias)
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check CHECK (
    role IN (
      'platform_admin', 'tenant_admin',
      'mission_creator', 'analyst', 'participant', 'explorer'
    )
  );

-- 5. Update existing 'participant' rows to 'explorer' for consistency
UPDATE public.user_profiles SET role = 'explorer' WHERE role = 'participant';

-- 6. Ensure email index exists (may already exist from 028)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles (email);

COMMENT ON TABLE public.user_profiles IS
  'Application user profiles. Auth credentials (email + bcrypt hash) are managed
   by the X-Hunt Python auth service. No dependency on Supabase auth.users.';
