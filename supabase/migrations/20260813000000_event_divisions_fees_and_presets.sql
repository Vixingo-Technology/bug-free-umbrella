-- Event flexibility upgrade:
--   1. Per-event multi-division discount %.
--   2. Reusable division presets an admin can save and re-import.
-- Division fees themselves live inside the JSON stored on
-- tournament_details.custom_divisions and division_presets.divisions, so
-- no schema change is needed for them.

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS multi_division_discount_percent integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.division_presets (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    description   text,
    divisions     jsonb NOT NULL,
    created_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS division_presets_created_by_created_at_idx
    ON public.division_presets (created_by_id, created_at DESC);

ALTER TABLE public.division_presets ENABLE ROW LEVEL SECURITY;

-- Admins may read/write every preset. Non-admins have no access; presets
-- are an admin-only feature (event creation is admin-only today).
DROP POLICY IF EXISTS "division_presets_admin_all" ON public.division_presets;
CREATE POLICY "division_presets_admin_all" ON public.division_presets
    FOR ALL
    USING (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    )
    WITH CHECK (
        (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    );
