-- Enable RLS + owner-scoped SELECT on public.notifications so that:
--   (1) the portal client can read its own unread count and dropdown list
--   (2) Supabase Realtime `postgres_changes` INSERT events are delivered
--       to the subscribed user (Realtime v2 requires SELECT privilege +
--       an authorizing RLS policy for the receiving role).
--
-- Mark-read runs via server actions using Prisma (postgres role, bypasses
-- RLS), so we only need to grant SELECT to authenticated. INSERT stays
-- server-side.
--
-- Idempotent: safe to re-run.

-- 1. Grants — authenticated JWT users can read; anon cannot.
GRANT SELECT ON public.notifications TO authenticated;

-- 2. Enable RLS.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Owner-only SELECT policy. Uses auth.uid() which is the Supabase
--    session's user id, matching users.id (and therefore user_id here).
DROP POLICY IF EXISTS notifications_owner_select ON public.notifications;
CREATE POLICY notifications_owner_select
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 4. Replica identity default (= primary key) is already what we want —
--    INSERT payloads carry the full new row. No change needed. This
--    comment is here so future readers don't second-guess it.
