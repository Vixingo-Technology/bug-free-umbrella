-- Track dojo-owner invites sent from the admin dojos page.
--
-- The invite itself is a promise-by-email — the invitee completes
-- /enlist-dojo/signup on their own, at which point `accepted_at` is
-- stamped by matching the enlistment email against this table.
--
-- Email is UNIQUE — re-inviting the same address updates invited_at
-- and invited_by_id via ON CONFLICT.

CREATE TABLE IF NOT EXISTS dojo_owner_invites (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL UNIQUE,
  full_name      text,
  invited_by_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_at     timestamp NOT NULL DEFAULT now(),
  accepted_at    timestamp
);

CREATE INDEX IF NOT EXISTS dojo_owner_invites_invited_by_id_idx
  ON dojo_owner_invites(invited_by_id);

-- RLS: only ADMINs read this table. Server actions run under the service
-- role and bypass RLS for the write path.
ALTER TABLE dojo_owner_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dojo_owner_invites_admin_read ON dojo_owner_invites;
CREATE POLICY dojo_owner_invites_admin_read ON dojo_owner_invites
  FOR SELECT
  USING ((SELECT role_id FROM users WHERE id = auth.uid()) = 'ADMIN');
