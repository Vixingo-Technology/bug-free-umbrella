-- 2026-06-30-role-tables-3nf-rollback.sql
-- Reverse of 2026-06-30-role-tables-3nf.sql. Restores the legacy `members`
-- table from `users` + per-role tables, repoints FKs back to members,
-- restores the legacy MemberRole enum + RLS policies.
--
-- Run with: psql "$DIRECT_URL" -f scripts/migrations/2026-06-30-role-tables-3nf-rollback.sql

\set ON_ERROR_STOP on

BEGIN;

-- Restore the MemberRole enum.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MemberRole') THEN
    CREATE TYPE public."MemberRole" AS ENUM ('STUDENT','INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN');
  END IF;
END$$;

-- Rebuild members from users + role tables.
CREATE TABLE IF NOT EXISTS public.members (
  id                     uuid PRIMARY KEY,
  full_name              text NOT NULL,
  email                  text NOT NULL UNIQUE,
  phone                  text,
  avatar_url             text,
  role                   public."MemberRole" NOT NULL DEFAULT 'STUDENT',
  member_number          text UNIQUE,
  current_rank           text NOT NULL DEFAULT 'White Belt',
  join_date              timestamptz NOT NULL DEFAULT now(),
  expiry_date            timestamptz,
  is_active              boolean NOT NULL DEFAULT true,
  dojo_id                uuid REFERENCES public.dojos(id),
  onboarding_complete    boolean NOT NULL DEFAULT false,
  membership_status      public."MembershipStatus" NOT NULL DEFAULT 'PENDING',
  date_of_birth          date,
  blood_group            text,
  address                text,
  national_id            text,
  father_name            text,
  mother_name            text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.members (
  id, full_name, email, phone, avatar_url, role, member_number, current_rank,
  join_date, expiry_date, is_active, dojo_id, onboarding_complete, membership_status,
  date_of_birth, blood_group, address, national_id, father_name, mother_name,
  emergency_contact_name, emergency_contact_phone, created_at, updated_at
)
SELECT
  u.id, u.full_name, u.email, u.phone, u.avatar_url, u.role_id::public."MemberRole",
  s.member_number, COALESCE(s.current_rank, 'White Belt'),
  COALESCE(s.join_date, u.created_at), s.expiry_date, u.is_active,
  COALESCE(s.dojo_id, i.dojo_id, dm.dojo_id, do_.dojo_id),
  COALESCE(s.onboarding_complete, false),
  COALESCE(s.membership_status, 'PENDING'),
  s.date_of_birth, s.blood_group, s.address, s.national_id, s.father_name, s.mother_name,
  s.emergency_contact_name, s.emergency_contact_phone, u.created_at, u.updated_at
  FROM public.users u
  LEFT JOIN public.students      s   ON s.id   = u.id
  LEFT JOIN public.instructors   i   ON i.id   = u.id
  LEFT JOIN public.dojo_managers dm  ON dm.id  = u.id
  LEFT JOIN public.dojo_owners   do_ ON do_.id = u.id
ON CONFLICT (id) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS members_one_owner_per_dojo
  ON public.members (dojo_id) WHERE role = 'DOJO_OWNER';

-- Repoint FKs back to members.

-- attendance
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_student_id_fkey;
ALTER TABLE public.attendance RENAME COLUMN student_id TO member_id;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- gradings
ALTER TABLE public.gradings DROP CONSTRAINT IF EXISTS gradings_student_id_fkey;
ALTER TABLE public.gradings RENAME COLUMN student_id TO member_id;
ALTER TABLE public.gradings
  ADD CONSTRAINT gradings_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- grading_applications
ALTER TABLE public.grading_applications DROP CONSTRAINT IF EXISTS grading_applications_student_id_fkey;
ALTER TABLE public.grading_applications RENAME COLUMN student_id TO member_id;
ALTER TABLE public.grading_applications
  ADD CONSTRAINT grading_applications_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS public.one_pending_request_per_student;
DROP INDEX IF EXISTS public.one_app_per_student_per_event;
DROP INDEX IF EXISTS public.grading_applications_student_id_idx;
CREATE UNIQUE INDEX one_pending_request_per_member
  ON public.grading_applications (member_id)
  WHERE grading_event_id IS NULL AND status = 'SUBMITTED';
CREATE UNIQUE INDEX one_app_per_member_per_event
  ON public.grading_applications (member_id, grading_event_id)
  WHERE grading_event_id IS NOT NULL;

-- tournament_participants
ALTER TABLE public.tournament_participants DROP CONSTRAINT IF EXISTS tournament_participants_student_id_fkey;
ALTER TABLE public.tournament_participants DROP CONSTRAINT IF EXISTS tournament_participants_tournament_id_student_id_key;
ALTER TABLE public.tournament_participants RENAME COLUMN student_id TO member_id;
ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tournament_participants_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tournament_participants_tournament_id_member_id_key
  UNIQUE (tournament_id, member_id);

-- certificate_requests
ALTER TABLE public.certificate_requests DROP CONSTRAINT IF EXISTS certificate_requests_student_id_fkey;
ALTER TABLE public.certificate_requests RENAME COLUMN student_id TO member_id;
ALTER TABLE public.certificate_requests
  ADD CONSTRAINT certificate_requests_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- student_achievements → member_achievements
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS student_achievements_student_id_fkey;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS student_achievements_achievement_id_fkey;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS student_achievements_awarded_by_user_id_fkey;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS student_achievements_student_id_achievement_id_key;
ALTER TABLE public.student_achievements RENAME COLUMN student_id TO member_id;
ALTER TABLE public.student_achievements RENAME COLUMN awarded_by_user_id TO awarded_by_id;
ALTER TABLE public.student_achievements RENAME TO member_achievements;
ALTER TABLE public.member_achievements
  ADD CONSTRAINT member_achievements_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
ALTER TABLE public.member_achievements
  ADD CONSTRAINT member_achievements_achievement_id_fkey
  FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.member_achievements
  ADD CONSTRAINT member_achievements_awarded_by_id_fkey
  FOREIGN KEY (awarded_by_id) REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.member_achievements
  ADD CONSTRAINT member_achievements_member_id_achievement_id_key
  UNIQUE (member_id, achievement_id);

-- notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications RENAME COLUMN user_id TO member_id;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- shop_orders
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_user_id_fkey;
ALTER TABLE public.shop_orders RENAME COLUMN user_id TO member_id;
ALTER TABLE public.shop_orders
  ADD CONSTRAINT shop_orders_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- event_registrations
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_checked_in_by_user_id_fkey;
ALTER TABLE public.event_registrations RENAME COLUMN user_id TO member_id;
ALTER TABLE public.event_registrations RENAME COLUMN checked_in_by_user_id TO checked_in_by_id;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_checked_in_by_id_fkey
  FOREIGN KEY (checked_in_by_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- events
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_posted_by_id_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_posted_by_id_fkey
  FOREIGN KEY (posted_by_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- announcements
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_posted_by_id_fkey;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_posted_by_id_fkey
  FOREIGN KEY (posted_by_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- dojo_sales
ALTER TABLE public.dojo_sales DROP CONSTRAINT IF EXISTS dojo_sales_buyer_user_id_fkey;
ALTER TABLE public.dojo_sales DROP CONSTRAINT IF EXISTS dojo_sales_sold_by_user_id_fkey;
ALTER TABLE public.dojo_sales RENAME COLUMN buyer_user_id TO member_id;
ALTER TABLE public.dojo_sales
  ADD CONSTRAINT dojo_sales_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.dojo_sales
  ADD CONSTRAINT dojo_sales_sold_by_user_id_fkey
  FOREIGN KEY (sold_by_user_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- Drop new tables.
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.permissions      CASCADE;
DROP TABLE IF EXISTS public.admins           CASCADE;
DROP TABLE IF EXISTS public.dojo_owners      CASCADE;
DROP TABLE IF EXISTS public.dojo_managers    CASCADE;
DROP TABLE IF EXISTS public.instructors      CASCADE;
DROP TABLE IF EXISTS public.students         CASCADE;
DROP TABLE IF EXISTS public.users            CASCADE;
DROP TABLE IF EXISTS public.roles            CASCADE;

COMMIT;

\echo '=== Rollback complete. NOTE: You must reapply the original RLS policy SQL files manually:'
\echo '   - scripts/migrations/2026-06-24-belt-test-requests.sql (grading_applications policies)'
\echo '   - scripts/migrations/2026-06-25-certificates.sql        (certificate_requests / system_settings policies)'
\echo '   - scripts/migrations/2026-06-27-announcements-and-events.sql'
\echo '   - scripts/migrations/2026-06-28-event-registration-checkin.sql'
\echo '   - scripts/migrations/2026-06-30-dojo-inventory-sales.sql'
