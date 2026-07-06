-- Web Push subscriptions per user. One user may have many endpoints
-- (multiple browsers / devices / PWA installs). Endpoint is unique per
-- the Web Push spec.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint   text NOT NULL UNIQUE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- A user can read / insert / delete only their own subscriptions.
-- Server-side push send uses the service role which bypasses RLS.
DROP POLICY IF EXISTS push_subscriptions_owner_select ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner_select
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_owner_insert ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner_insert
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_subscriptions_owner_delete ON public.push_subscriptions;
CREATE POLICY push_subscriptions_owner_delete
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());
