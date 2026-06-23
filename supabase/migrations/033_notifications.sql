-- Migration 033: In-app notifications
--
-- Persists user-facing notifications for mission events, rewards, social
-- activity, and system messages.  Separate from the email-only route at
-- /api/notifications/email.

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL CHECK (type IN (
               'mission_start', 'mission_complete', 'proof_approved', 'proof_rejected',
               'reward_earned', 'follow', 'mention', 'community', 'live_session', 'system'
             )),
  title      TEXT        NOT NULL,
  body       TEXT,
  link       TEXT,
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notifications"
  ON public.notifications FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.notifications IS
  'In-app notification feed. Rows are inserted server-side when events occur '
  '(mission updates, reward payouts, social actions). Frontend polls GET /api/notifications.';
