-- Fix: the earlier migration used TEXT + CHECK, but the Prisma model
-- declares `severity ActivitySeverity` — Prisma binds enum params as the
-- named Postgres type, so INSERTs fail with:
--   type "public.ActivitySeverity" does not exist
-- Create the enum and switch the column over. Idempotent.

DO $$ BEGIN
    CREATE TYPE public."ActivitySeverity" AS ENUM ('INFO','SUCCESS','WARNING','ERROR','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.activity_logs
    DROP CONSTRAINT IF EXISTS activity_logs_severity_check;

ALTER TABLE public.activity_logs
    ALTER COLUMN severity DROP DEFAULT;

ALTER TABLE public.activity_logs
    ALTER COLUMN severity TYPE public."ActivitySeverity"
    USING severity::public."ActivitySeverity";

ALTER TABLE public.activity_logs
    ALTER COLUMN severity SET DEFAULT 'INFO'::public."ActivitySeverity";
