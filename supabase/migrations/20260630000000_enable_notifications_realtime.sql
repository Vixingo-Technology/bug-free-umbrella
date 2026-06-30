-- Enable Supabase Realtime for the notifications table so the portal
-- can push new notifications to logged-in members in real time (sound +
-- badge update). Without this, postgres_changes subscriptions silently
-- never fire.
--
-- ALTER PUBLICATION fails if the table is already a member, so we guard
-- with a DO block that checks pg_publication_tables first. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END
$$;
