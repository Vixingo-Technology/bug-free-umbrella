-- Real-time activity log for the admin monitoring panel.
--
-- Every meaningful action in the system (auth, admin CRUD, payment webhook,
-- role change, etc.) writes one row here. The admin sidebar subscribes via
-- Supabase Realtime and shows the tail live. Anomaly rows (severity ERROR /
-- CRITICAL) also fan out as notifications to admins via lib/activity/log.ts.

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id           uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id     uuid            REFERENCES public.users(id) ON DELETE SET NULL,
    actor_label  text,
    actor_role   text,
    action       text            NOT NULL,
    resource     text,
    resource_id  text,
    severity     text            NOT NULL DEFAULT 'INFO'
                                  CHECK (severity IN ('INFO','SUCCESS','WARNING','ERROR','CRITICAL')),
    message      text            NOT NULL,
    ip           inet,
    user_agent   text,
    metadata     jsonb           NOT NULL DEFAULT '{}'::jsonb,
    created_at   timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_created_at_idx
    ON public.activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_severity_idx
    ON public.activity_logs (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_logs_actor_idx
    ON public.activity_logs (actor_id, created_at DESC);

-- Realtime: admins subscribe to INSERTs. Requires SELECT for the
-- authenticated role gated by an RLS policy.
GRANT SELECT ON public.activity_logs TO authenticated;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activity_logs_admin_select ON public.activity_logs;
CREATE POLICY activity_logs_admin_select
    ON public.activity_logs
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );

-- INSERT stays server-side (Prisma via postgres role bypasses RLS).
