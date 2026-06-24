-- Belt-test-request flow: turn GradingApplication into a request-first model.
--
-- Lifecycle states (composite):
--   pending request   (grading_event_id IS NULL,     status = 'SUBMITTED')
--   declined          (grading_event_id IS NULL,     status = 'REJECTED', decline_reason set)
--   scheduled         (grading_event_id IS NOT NULL, status = 'APPROVED')

BEGIN;

-- 0. Defensive: ensure RLS is enabled (no-op if it already is).
ALTER TABLE grading_applications ENABLE ROW LEVEL SECURITY;

-- 1. Drop the old composite unique that requires both columns to be set.
ALTER TABLE grading_applications
  DROP CONSTRAINT IF EXISTS grading_applications_member_id_grading_event_id_key;

-- 2. Allow NULL on the event FK so a "request" can exist before an exam is scheduled.
ALTER TABLE grading_applications
  ALTER COLUMN grading_event_id DROP NOT NULL;

-- 3. New column for the dojo's decline reason (nullable; only meaningful when status = 'REJECTED').
ALTER TABLE grading_applications
  ADD COLUMN IF NOT EXISTS decline_reason text;

-- 4. Partial unique indexes for the two halves of the lifecycle.
--    (a) at most one pending request per member at any time
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_request_per_member
  ON grading_applications (member_id)
  WHERE grading_event_id IS NULL AND status = 'SUBMITTED';

--    (b) at most one application per member per scheduled exam
CREATE UNIQUE INDEX IF NOT EXISTS one_app_per_member_per_event
  ON grading_applications (member_id, grading_event_id)
  WHERE grading_event_id IS NOT NULL;

-- 5. RLS policy refresh. The table already has RLS enabled by an earlier
--    migration; we replace the policies for INSERT/UPDATE/DELETE to reflect
--    the request-first flow.

DROP POLICY IF EXISTS grading_applications_select ON grading_applications;
DROP POLICY IF EXISTS grading_applications_insert ON grading_applications;
DROP POLICY IF EXISTS grading_applications_update ON grading_applications;
DROP POLICY IF EXISTS grading_applications_delete ON grading_applications;

-- SELECT: student sees their own; dojo staff sees rows for members of their dojo; admins see all.
CREATE POLICY grading_applications_select ON grading_applications
  FOR SELECT USING (
    member_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = grading_applications.member_id
        AND (
          m.dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
          AND (SELECT role FROM members WHERE id = auth.uid())
              IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
        )
    )
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
  );

-- INSERT: student may insert their own pending request (no event id yet),
-- AND only if their membership is currently ACTIVE. This mirrors the
-- requestBeltTestAction server-side check so a direct Supabase-client
-- insert by an expired member is also blocked at the DB level.
CREATE POLICY grading_applications_insert ON grading_applications
  FOR INSERT WITH CHECK (
    member_id = auth.uid()
    AND grading_event_id IS NULL
    AND status = 'SUBMITTED'
    AND EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = auth.uid()
        AND m.membership_status = 'ACTIVE'
    )
  );

-- UPDATE: dojo staff in same dojo, or admin.
CREATE POLICY grading_applications_update ON grading_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM members m
      WHERE m.id = grading_applications.member_id
        AND m.dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
        AND (SELECT role FROM members WHERE id = auth.uid())
            IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER')
    )
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
  );

-- DELETE: student may withdraw their own pending request (event id still null, status still submitted).
CREATE POLICY grading_applications_delete ON grading_applications
  FOR DELETE USING (
    (member_id = auth.uid()
      AND grading_event_id IS NULL
      AND status = 'SUBMITTED')
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
  );

COMMIT;
