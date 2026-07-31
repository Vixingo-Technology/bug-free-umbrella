-- Per-dojo active-student count required before certificates,
-- announcements, transfers, and staff invites auto-unlock. Defaults to 0
-- so features are open unless an admin raises the bar.
ALTER TABLE "dojos"
  ADD COLUMN IF NOT EXISTS "student_milestone" integer NOT NULL DEFAULT 0;
