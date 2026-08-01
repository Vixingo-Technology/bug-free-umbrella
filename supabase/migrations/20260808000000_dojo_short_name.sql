-- Short display name for a dojo. Rendered above "Dojo Console" in the
-- portal sidebar; captured on the enlistment form.
ALTER TABLE "dojos"
  ADD COLUMN IF NOT EXISTS "short_name" text;
