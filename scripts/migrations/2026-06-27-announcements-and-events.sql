-- Announcements + Event categorisation.
--
-- Adds:
--   - `event_category` enum (BELT_TEST, TOURNAMENT, SEMINAR, TRAINING_CAMP, OTHER)
--   - events.category, events.posted_by_id, events.dojo_id
--   - new `announcements` table with posted_by_id + dojo_id
--   - RLS policies — only ADMIN and DOJO_OWNER may insert/update/delete
--     (federation-wide post when dojo_id IS NULL; dojo-scoped otherwise)

BEGIN;

-- ─────────────────────────────────────────────
-- 1. Enum
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventCategory') THEN
    CREATE TYPE "EventCategory" AS ENUM (
      'BELT_TEST',
      'TOURNAMENT',
      'SEMINAR',
      'TRAINING_CAMP',
      'OTHER'
    );
  END IF;
END$$;

-- ─────────────────────────────────────────────
-- 2. Extend events table
-- ─────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS category      "EventCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN IF NOT EXISTS posted_by_id  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dojo_id       uuid REFERENCES public.dojos(id)   ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS events_published_date_idx ON public.events (is_published, event_date);
CREATE INDEX IF NOT EXISTS events_category_idx       ON public.events (category);

-- ─────────────────────────────────────────────
-- 3. Announcements table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  body          text,
  link          text,
  is_published  boolean NOT NULL DEFAULT true,
  published_at  timestamptz NOT NULL DEFAULT now(),
  posted_by_id  uuid REFERENCES public.members(id) ON DELETE SET NULL,
  dojo_id       uuid REFERENCES public.dojos(id)   ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_published_idx
  ON public.announcements (is_published, published_at DESC);

-- updated_at trigger to mirror the Prisma @updatedAt behaviour
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS announcements_set_updated_at ON public.announcements;
CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. RLS — announcements
-- ─────────────────────────────────────────────
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_delete ON public.announcements;

-- SELECT: anyone can read published announcements; admins see all.
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (
    is_published = true
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR posted_by_id = auth.uid()
  );

-- INSERT: ADMIN may post anything; DOJO_OWNER may post only for their own dojo.
CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT WITH CHECK (
    (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
      AND posted_by_id = auth.uid()
    )
  );

CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE USING (
    (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
    )
  );

CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE USING (
    (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────
-- 5. RLS — events  (refresh, since we just added posted_by_id/dojo_id)
-- ─────────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_select ON public.events;
DROP POLICY IF EXISTS events_insert ON public.events;
DROP POLICY IF EXISTS events_update ON public.events;
DROP POLICY IF EXISTS events_delete ON public.events;

CREATE POLICY events_select ON public.events
  FOR SELECT USING (
    is_published = true
    OR (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR posted_by_id = auth.uid()
  );

CREATE POLICY events_insert ON public.events
  FOR INSERT WITH CHECK (
    (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
      AND posted_by_id = auth.uid()
    )
  );

CREATE POLICY events_update ON public.events
  FOR UPDATE USING (
    (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
    )
  );

CREATE POLICY events_delete ON public.events
  FOR DELETE USING (
    (SELECT role FROM members WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role FROM members WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM members WHERE id = auth.uid())
    )
  );

COMMIT;
