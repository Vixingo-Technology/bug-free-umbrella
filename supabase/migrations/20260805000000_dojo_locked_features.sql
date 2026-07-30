-- Feature keys the JKA admin has explicitly locked for a dojo. Combined
-- with the automatic milestone locks (see lib/dojo/feature-locks.ts) to
-- decide which /portal/dojo/* routes and invite roles are gated.
ALTER TABLE "dojos"
  ADD COLUMN IF NOT EXISTS "locked_features" text[] NOT NULL DEFAULT ARRAY[]::text[];
