-- Attachments on announcements + events.
-- Adds an optional file (image or PDF) shown on the detail page.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttachmentType') THEN
    CREATE TYPE "AttachmentType" AS ENUM ('IMAGE', 'PDF');
  END IF;
END$$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS attachment_url  text,
  ADD COLUMN IF NOT EXISTS attachment_type "AttachmentType";

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS attachment_url  text,
  ADD COLUMN IF NOT EXISTS attachment_type "AttachmentType";

COMMIT;
