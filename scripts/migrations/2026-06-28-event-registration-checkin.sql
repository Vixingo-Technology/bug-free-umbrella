-- Event registration overhaul: allow public/guest registration and add a
-- QR-token-based check-in flow.
--
-- The original `event_registrations` table required a member_id and enforced
-- (event_id, member_id) uniqueness. Public-facing event signup now needs to
-- accept anonymous guests, so:
--   - member_id becomes nullable
--   - guest_name / guest_email / guest_phone capture non-member participants
--   - qr_token is the unique value embedded in the participant's QR code
--   - checked_in_at / checked_in_by_id track on-site check-in by an authority

BEGIN;

ALTER TABLE public.event_registrations
  ALTER COLUMN member_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS guest_name        text,
  ADD COLUMN IF NOT EXISTS guest_email       text,
  ADD COLUMN IF NOT EXISTS guest_phone       text,
  ADD COLUMN IF NOT EXISTS qr_token          text,
  ADD COLUMN IF NOT EXISTS checked_in_at     timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by_id  uuid REFERENCES public.members(id) ON DELETE SET NULL;

-- Backfill qr_token for any existing rows so we can enforce NOT NULL + UNIQUE.
UPDATE public.event_registrations
   SET qr_token = replace(gen_random_uuid()::text, '-', '')
 WHERE qr_token IS NULL;

ALTER TABLE public.event_registrations
  ALTER COLUMN qr_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_qr_token_key
  ON public.event_registrations (qr_token);

-- Replace the strict composite uniqueness with two partial indexes:
--   (a) one registration per signed-in member per event
--   (b) one registration per guest email per event
ALTER TABLE public.event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS one_registration_per_member_per_event
  ON public.event_registrations (event_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS one_guest_registration_per_event
  ON public.event_registrations (event_id, lower(guest_email))
  WHERE member_id IS NULL AND guest_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS event_registrations_event_checkin_idx
  ON public.event_registrations (event_id, checked_in_at);

-- RLS — refresh policies now that the public can register.
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_registrations_select ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_insert ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_update ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_delete ON public.event_registrations;

-- SELECT: the registrant themselves (member match), admins, and the dojo owner
-- that posted the event. Guest rows are accessible by anyone holding the qr_token
-- (enforced in app logic, not RLS — service-role / server-side queries).
CREATE POLICY event_registrations_select ON public.event_registrations
  FOR SELECT USING (
    member_id = auth.uid()
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM events e
       WHERE e.id = event_registrations.event_id
         AND (
           e.posted_by_id = auth.uid()
           OR (
             e.dojo_id IS NOT NULL
             AND e.dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
             AND (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
           )
         )
    )
  );

-- INSERT: server actions perform inserts via the service role; we leave the
-- INSERT policy permissive enough for signed-in members registering themselves.
CREATE POLICY event_registrations_insert ON public.event_registrations
  FOR INSERT WITH CHECK (
    member_id IS NULL
    OR member_id = auth.uid()
  );

-- UPDATE: only admins / dojo owners (check-in) — server actions enforce this.
CREATE POLICY event_registrations_update ON public.event_registrations
  FOR UPDATE USING (
    (SELECT role FROM members WHERE id = auth.uid()) IN ('ADMIN', 'DOJO_OWNER')
  );

CREATE POLICY event_registrations_delete ON public.event_registrations
  FOR DELETE USING (
    member_id = auth.uid()
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
  );

COMMIT;
