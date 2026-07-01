-- 2026-06-30-role-tables-3nf.sql
-- Normalise identity to 3NF: split `members` into `users` + per-role tables,
-- introduce RBAC (roles/permissions/role_permissions), re-point every FK,
-- rewrite RLS policies that referenced members.role.
--
-- Run with:
--   psql "$DIRECT_URL" -f scripts/migrations/2026-06-30-role-tables-3nf.sql
--
-- A matching rollback lives in 2026-06-30-role-tables-3nf-rollback.sql.

\set ON_ERROR_STOP on

\echo '=== Pre-migration counts ==='
SELECT
  (SELECT count(*) FROM members)                            AS members_total,
  (SELECT count(*) FROM members WHERE role = 'STUDENT')     AS students,
  (SELECT count(*) FROM members WHERE role = 'INSTRUCTOR')  AS instructors,
  (SELECT count(*) FROM members WHERE role = 'DOJO_MANAGER')AS dojo_managers,
  (SELECT count(*) FROM members WHERE role = 'DOJO_OWNER')  AS dojo_owners,
  (SELECT count(*) FROM members WHERE role = 'ADMIN')       AS admins;

BEGIN;

-- =============================================================
-- 1. RBAC tables
-- =============================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id              text PRIMARY KEY,             -- slug
  display_name    text NOT NULL,
  display_name_bn text,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id          text PRIMARY KEY,                 -- slug e.g. 'members.read.own_dojo'
  resource    text NOT NULL,
  action      text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       text NOT NULL REFERENCES public.roles(id)       ON DELETE CASCADE,
  permission_id text NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- Seed the five roles.
INSERT INTO public.roles (id, display_name, display_name_bn, description) VALUES
  ('STUDENT',      'Student',       'ছাত্র',          'Regular member; trains at a dojo, attends gradings.'),
  ('INSTRUCTOR',   'Instructor',    'প্রশিক্ষক',       'Teaches at a dojo.'),
  ('DOJO_MANAGER', 'Dojo Manager',  'ডোজো ম্যানেজার',   'Manages day-to-day operations of a dojo.'),
  ('DOJO_OWNER',   'Dojo Head',     'ডোজো প্রধান',     'Head of a dojo; one per dojo.'),
  ('ADMIN',        'Administrator', 'প্রশাসক',        'Federation-wide super-admin.')
ON CONFLICT (id) DO NOTHING;

-- Seed permissions catalog.
INSERT INTO public.permissions (id, resource, action, description) VALUES
  ('members.read.all',           'members',    'read',    'Read every member in the federation.'),
  ('members.read.own_dojo',      'members',    'read',    'Read members of one''s own dojo.'),
  ('members.write.all',          'members',    'write',   'Edit any member in the federation.'),
  ('members.write.own_dojo',     'members',    'write',   'Edit members of one''s own dojo.'),
  ('gradings.approve',           'gradings',   'approve', 'Approve grading applications and finalise results.'),
  ('dojos.manage.all',           'dojos',      'manage',  'Manage every dojo.'),
  ('dojos.manage.own',           'dojos',      'manage',  'Manage one''s own dojo.'),
  ('events.publish.federation',  'events',     'publish', 'Publish federation-wide events.'),
  ('events.publish.dojo',        'events',     'publish', 'Publish dojo-scoped events.'),
  ('shop.manage',                'shop',       'manage',  'Manage the federation shop catalog.'),
  ('attendance.record',          'attendance', 'record',  'Record attendance at a dojo.')
ON CONFLICT (id) DO NOTHING;

-- Grant matrix.
INSERT INTO public.role_permissions (role_id, permission_id) VALUES
  ('ADMIN',        'members.read.all'),
  ('ADMIN',        'members.write.all'),
  ('ADMIN',        'gradings.approve'),
  ('ADMIN',        'dojos.manage.all'),
  ('ADMIN',        'events.publish.federation'),
  ('ADMIN',        'shop.manage'),

  ('DOJO_OWNER',   'members.read.own_dojo'),
  ('DOJO_OWNER',   'members.write.own_dojo'),
  ('DOJO_OWNER',   'gradings.approve'),
  ('DOJO_OWNER',   'dojos.manage.own'),
  ('DOJO_OWNER',   'events.publish.dojo'),
  ('DOJO_OWNER',   'attendance.record'),

  ('DOJO_MANAGER', 'members.read.own_dojo'),
  ('DOJO_MANAGER', 'members.write.own_dojo'),
  ('DOJO_MANAGER', 'attendance.record'),

  ('INSTRUCTOR',   'members.read.own_dojo'),
  ('INSTRUCTOR',   'attendance.record')
ON CONFLICT DO NOTHING;

-- =============================================================
-- 2. users — shared profile table (mirrors auth.users)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id         uuid PRIMARY KEY,
  email      text NOT NULL UNIQUE,
  phone      text,
  full_name  text NOT NULL,
  avatar_url text,
  role_id    text NOT NULL DEFAULT 'STUDENT' REFERENCES public.roles(id),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_id_idx ON public.users (role_id);

-- =============================================================
-- 3. Per-role profile tables (1:1 with users)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.students (
  id                      uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  member_number           text UNIQUE,
  current_rank            text NOT NULL DEFAULT 'White Belt',
  join_date               timestamptz NOT NULL DEFAULT now(),
  expiry_date             timestamptz,
  dojo_id                 uuid REFERENCES public.dojos(id),
  onboarding_complete     boolean NOT NULL DEFAULT false,
  membership_status       public."MembershipStatus" NOT NULL DEFAULT 'PENDING',
  date_of_birth           date,
  blood_group             text,
  address                 text,
  national_id             text,
  father_name             text,
  mother_name             text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_dojo_id_idx ON public.students (dojo_id);

CREATE TABLE IF NOT EXISTS public.instructors (
  id          uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dojo_id     uuid REFERENCES public.dojos(id),
  joined_date timestamptz NOT NULL DEFAULT now(),
  bio         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS instructors_dojo_id_idx ON public.instructors (dojo_id);

CREATE TABLE IF NOT EXISTS public.dojo_managers (
  id         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dojo_id    uuid REFERENCES public.dojos(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dojo_managers_dojo_id_idx ON public.dojo_managers (dojo_id);

CREATE TABLE IF NOT EXISTS public.dojo_owners (
  id            uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  dojo_id       uuid UNIQUE REFERENCES public.dojos(id),   -- replaces partial unique on members
  signature_url text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admins (
  id         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  scope      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 4. Backfill from members
-- =============================================================

INSERT INTO public.users (id, email, phone, full_name, avatar_url, role_id, is_active, created_at, updated_at)
SELECT m.id, m.email, m.phone, m.full_name, m.avatar_url, m.role::text, m.is_active, m.created_at, m.updated_at
  FROM public.members m
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (
  id, member_number, current_rank, join_date, expiry_date, dojo_id,
  onboarding_complete, membership_status,
  date_of_birth, blood_group, address, national_id, father_name, mother_name,
  emergency_contact_name, emergency_contact_phone,
  created_at, updated_at
)
SELECT
  m.id, m.member_number, m.current_rank, m.join_date, m.expiry_date, m.dojo_id,
  m.onboarding_complete, m.membership_status,
  m.date_of_birth, m.blood_group, m.address, m.national_id, m.father_name, m.mother_name,
  m.emergency_contact_name, m.emergency_contact_phone,
  m.created_at, m.updated_at
  FROM public.members m
 WHERE m.role = 'STUDENT'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instructors (id, dojo_id, created_at, updated_at)
SELECT m.id, m.dojo_id, m.created_at, m.updated_at
  FROM public.members m
 WHERE m.role = 'INSTRUCTOR'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dojo_managers (id, dojo_id, created_at, updated_at)
SELECT m.id, m.dojo_id, m.created_at, m.updated_at
  FROM public.members m
 WHERE m.role = 'DOJO_MANAGER'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dojo_owners (id, dojo_id, created_at, updated_at)
SELECT m.id, m.dojo_id, m.created_at, m.updated_at
  FROM public.members m
 WHERE m.role = 'DOJO_OWNER'
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (id, created_at, updated_at)
SELECT m.id, m.created_at, m.updated_at
  FROM public.members m
 WHERE m.role = 'ADMIN'
ON CONFLICT (id) DO NOTHING;

-- =============================================================
-- 5. Repoint FK columns on dependent tables.
--    Pattern: drop old FK constraint → rename column → add new FK to
--    users or students depending on semantics.
-- =============================================================

-- attendance.member_id → student_id (FK students)
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_member_id_fkey;
ALTER TABLE public.attendance RENAME COLUMN member_id TO student_id;
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- gradings.member_id → student_id (FK students)
ALTER TABLE public.gradings DROP CONSTRAINT IF EXISTS gradings_member_id_fkey;
ALTER TABLE public.gradings RENAME COLUMN member_id TO student_id;
ALTER TABLE public.gradings
  ADD CONSTRAINT gradings_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- grading_applications.member_id → student_id (FK students)
ALTER TABLE public.grading_applications DROP CONSTRAINT IF EXISTS grading_applications_member_id_fkey;
ALTER TABLE public.grading_applications RENAME COLUMN member_id TO student_id;
ALTER TABLE public.grading_applications
  ADD CONSTRAINT grading_applications_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- Rebuild the partial unique indexes that named member_id.
DROP INDEX IF EXISTS public.one_pending_request_per_member;
CREATE UNIQUE INDEX one_pending_request_per_student
  ON public.grading_applications (student_id)
  WHERE grading_event_id IS NULL AND status = 'SUBMITTED';

DROP INDEX IF EXISTS public.one_app_per_member_per_event;
CREATE UNIQUE INDEX one_app_per_student_per_event
  ON public.grading_applications (student_id, grading_event_id)
  WHERE grading_event_id IS NOT NULL;

DROP INDEX IF EXISTS public.grading_applications_member_id_idx;
CREATE INDEX IF NOT EXISTS grading_applications_student_id_idx
  ON public.grading_applications (student_id);

-- tournament_participants.member_id → user_id (FK users — any role can compete)
ALTER TABLE public.tournament_participants DROP CONSTRAINT IF EXISTS tournament_participants_member_id_fkey;
ALTER TABLE public.tournament_participants
  DROP CONSTRAINT IF EXISTS tournament_participants_tournament_id_member_id_key;
ALTER TABLE public.tournament_participants RENAME COLUMN member_id TO user_id;
ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tournament_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.tournament_participants
  ADD CONSTRAINT tournament_participants_tournament_id_user_id_key
  UNIQUE (tournament_id, user_id);

-- certificate_requests.member_id → student_id (FK students)
ALTER TABLE public.certificate_requests DROP CONSTRAINT IF EXISTS certificate_requests_member_id_fkey;
ALTER TABLE public.certificate_requests RENAME COLUMN member_id TO student_id;
ALTER TABLE public.certificate_requests
  ADD CONSTRAINT certificate_requests_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

-- member_achievements → student_achievements; column rename
ALTER TABLE public.member_achievements RENAME TO student_achievements;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS member_achievements_member_id_fkey;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS member_achievements_achievement_id_fkey;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS member_achievements_awarded_by_id_fkey;
ALTER TABLE public.student_achievements DROP CONSTRAINT IF EXISTS member_achievements_member_id_achievement_id_key;
ALTER TABLE public.student_achievements RENAME COLUMN member_id TO student_id;
ALTER TABLE public.student_achievements RENAME COLUMN awarded_by_id TO awarded_by_user_id;
ALTER TABLE public.student_achievements
  ADD CONSTRAINT student_achievements_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.student_achievements
  ADD CONSTRAINT student_achievements_achievement_id_fkey
  FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;
ALTER TABLE public.student_achievements
  ADD CONSTRAINT student_achievements_awarded_by_user_id_fkey
  FOREIGN KEY (awarded_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.student_achievements
  ADD CONSTRAINT student_achievements_student_id_achievement_id_key
  UNIQUE (student_id, achievement_id);

DROP INDEX IF EXISTS public.member_achievements_member_idx;
DROP INDEX IF EXISTS public.member_achievements_achievement_idx;
CREATE INDEX IF NOT EXISTS student_achievements_student_idx
  ON public.student_achievements (student_id);
CREATE INDEX IF NOT EXISTS student_achievements_achievement_idx
  ON public.student_achievements (achievement_id);

-- notifications.member_id → user_id (FK users)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_member_id_fkey;
ALTER TABLE public.notifications RENAME COLUMN member_id TO user_id;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- shop_orders.member_id → user_id (FK users)
ALTER TABLE public.shop_orders DROP CONSTRAINT IF EXISTS shop_orders_member_id_fkey;
ALTER TABLE public.shop_orders RENAME COLUMN member_id TO user_id;
ALTER TABLE public.shop_orders
  ADD CONSTRAINT shop_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- event_registrations.member_id → user_id, checked_in_by_id → checked_in_by_user_id
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_member_id_fkey;
ALTER TABLE public.event_registrations DROP CONSTRAINT IF EXISTS event_registrations_checked_in_by_id_fkey;
ALTER TABLE public.event_registrations RENAME COLUMN member_id TO user_id;
ALTER TABLE public.event_registrations RENAME COLUMN checked_in_by_id TO checked_in_by_user_id;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.event_registrations
  ADD CONSTRAINT event_registrations_checked_in_by_user_id_fkey
  FOREIGN KEY (checked_in_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.one_registration_per_member_per_event;
CREATE UNIQUE INDEX one_registration_per_user_per_event
  ON public.event_registrations (event_id, user_id)
  WHERE user_id IS NOT NULL;

DROP INDEX IF EXISTS public.one_guest_registration_per_event;
CREATE UNIQUE INDEX one_guest_registration_per_event
  ON public.event_registrations (event_id, lower(guest_email))
  WHERE user_id IS NULL AND guest_email IS NOT NULL;

-- events.posted_by_id (kept name) → users
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_posted_by_id_fkey;
ALTER TABLE public.events
  ADD CONSTRAINT events_posted_by_id_fkey
  FOREIGN KEY (posted_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- announcements.posted_by_id (kept name) → users
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_posted_by_id_fkey;
ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_posted_by_id_fkey
  FOREIGN KEY (posted_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- dojo_sales.member_id → buyer_user_id; sold_by_user_id (kept) → users
ALTER TABLE public.dojo_sales DROP CONSTRAINT IF EXISTS dojo_sales_member_id_fkey;
ALTER TABLE public.dojo_sales DROP CONSTRAINT IF EXISTS dojo_sales_sold_by_user_id_fkey;
ALTER TABLE public.dojo_sales RENAME COLUMN member_id TO buyer_user_id;
ALTER TABLE public.dojo_sales
  ADD CONSTRAINT dojo_sales_buyer_user_id_fkey
  FOREIGN KEY (buyer_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.dojo_sales
  ADD CONSTRAINT dojo_sales_sold_by_user_id_fkey
  FOREIGN KEY (sold_by_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.dojo_sales_member_id_idx;
CREATE INDEX IF NOT EXISTS dojo_sales_buyer_user_id_idx
  ON public.dojo_sales (buyer_user_id)
  WHERE buyer_user_id IS NOT NULL;

-- =============================================================
-- 6. Carry over the dojo_owner signature_url that lived on dojos
-- =============================================================
UPDATE public.dojo_owners ow
   SET signature_url = d.owner_signature_url
  FROM public.dojos d
 WHERE d.id = ow.dojo_id
   AND d.owner_signature_url IS NOT NULL;

-- =============================================================
-- 7. RLS — drop old policies on dependent tables, recreate against
--    `users` instead of `members`. RLS shape preserved as-is.
-- =============================================================

-- grading_applications --------------------------------------------------
DROP POLICY IF EXISTS grading_applications_select ON public.grading_applications;
DROP POLICY IF EXISTS grading_applications_insert ON public.grading_applications;
DROP POLICY IF EXISTS grading_applications_update ON public.grading_applications;
DROP POLICY IF EXISTS grading_applications_delete ON public.grading_applications;

CREATE POLICY grading_applications_select ON public.grading_applications
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.id = grading_applications.student_id
         AND s.dojo_id = (SELECT dojo_id FROM public.students WHERE id = auth.uid())
         AND (SELECT role_id FROM public.users WHERE id = auth.uid())
             IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY grading_applications_insert ON public.grading_applications
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND grading_event_id IS NULL
    AND status = 'SUBMITTED'
    AND EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.id = auth.uid()
         AND s.membership_status = 'ACTIVE'
    )
  );

CREATE POLICY grading_applications_update ON public.grading_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.id = grading_applications.student_id
         AND s.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = auth.uid()
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = auth.uid()
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = auth.uid()
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY grading_applications_delete ON public.grading_applications
  FOR DELETE USING (
    (student_id = auth.uid()
      AND grading_event_id IS NULL
      AND status = 'SUBMITTED')
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- certificate_requests --------------------------------------------------
DROP POLICY IF EXISTS "members read own cert requests"       ON public.certificate_requests;
DROP POLICY IF EXISTS "dojo staff read dojo cert requests"   ON public.certificate_requests;
DROP POLICY IF EXISTS "admins read all cert requests"        ON public.certificate_requests;

CREATE POLICY "students read own cert requests"
  ON public.certificate_requests
  FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "dojo staff read dojo cert requests"
  ON public.certificate_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND certificate_requests.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
  );

CREATE POLICY "admins manage all cert requests"
  ON public.certificate_requests
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_id = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_id = 'ADMIN')
  );

-- system_settings -------------------------------------------------------
DROP POLICY IF EXISTS "admins write system settings" ON public.system_settings;

CREATE POLICY "admins write system settings"
  ON public.system_settings
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_id = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role_id = 'ADMIN')
  );

-- announcements ---------------------------------------------------------
DROP POLICY IF EXISTS announcements_select ON public.announcements;
DROP POLICY IF EXISTS announcements_insert ON public.announcements;
DROP POLICY IF EXISTS announcements_update ON public.announcements;
DROP POLICY IF EXISTS announcements_delete ON public.announcements;

CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (
    is_published = true
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR posted_by_id = auth.uid()
  );

CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT WITH CHECK (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
      AND posted_by_id = auth.uid()
    )
  );

CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE USING (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
    )
  );

CREATE POLICY announcements_delete ON public.announcements
  FOR DELETE USING (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
    )
  );

-- events ---------------------------------------------------------------
DROP POLICY IF EXISTS events_select ON public.events;
DROP POLICY IF EXISTS events_insert ON public.events;
DROP POLICY IF EXISTS events_update ON public.events;
DROP POLICY IF EXISTS events_delete ON public.events;

CREATE POLICY events_select ON public.events
  FOR SELECT USING (
    is_published = true
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR posted_by_id = auth.uid()
  );

CREATE POLICY events_insert ON public.events
  FOR INSERT WITH CHECK (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
      AND posted_by_id = auth.uid()
    )
  );

CREATE POLICY events_update ON public.events
  FOR UPDATE USING (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
    )
  );

CREATE POLICY events_delete ON public.events
  FOR DELETE USING (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR (
      (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
      AND dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
    )
  );

-- event_registrations --------------------------------------------------
DROP POLICY IF EXISTS event_registrations_select ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_insert ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_update ON public.event_registrations;
DROP POLICY IF EXISTS event_registrations_delete ON public.event_registrations;

CREATE POLICY event_registrations_select ON public.event_registrations
  FOR SELECT USING (
    user_id = auth.uid()
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR EXISTS (
      SELECT 1 FROM public.events e
       WHERE e.id = event_registrations.event_id
         AND (
           e.posted_by_id = auth.uid()
           OR (
             e.dojo_id IS NOT NULL
             AND e.dojo_id = (SELECT dojo_id FROM public.dojo_owners WHERE id = auth.uid())
             AND (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'DOJO_OWNER'
           )
         )
    )
  );

CREATE POLICY event_registrations_insert ON public.event_registrations
  FOR INSERT WITH CHECK (
    user_id IS NULL
    OR user_id = auth.uid()
  );

CREATE POLICY event_registrations_update ON public.event_registrations
  FOR UPDATE USING (
    (SELECT role_id FROM public.users WHERE id = auth.uid()) IN ('ADMIN','DOJO_OWNER')
  );

CREATE POLICY event_registrations_delete ON public.event_registrations
  FOR DELETE USING (
    user_id = auth.uid()
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- dojo_inventory_items -------------------------------------------------
DROP POLICY IF EXISTS "dojo staff read dojo inventory"  ON public.dojo_inventory_items;
DROP POLICY IF EXISTS "dojo staff write dojo inventory" ON public.dojo_inventory_items;

CREATE POLICY "dojo staff read dojo inventory"
  ON public.dojo_inventory_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND dojo_inventory_items.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "dojo staff write dojo inventory"
  ON public.dojo_inventory_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND dojo_inventory_items.dojo_id IN (
           SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners WHERE id = u.id
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND dojo_inventory_items.dojo_id IN (
           SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners WHERE id = u.id
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- dojo_sales -----------------------------------------------------------
DROP POLICY IF EXISTS "dojo staff read dojo sales"  ON public.dojo_sales;
DROP POLICY IF EXISTS "members read own dojo sales" ON public.dojo_sales;
DROP POLICY IF EXISTS "dojo staff write dojo sales" ON public.dojo_sales;

CREATE POLICY "dojo staff read dojo sales"
  ON public.dojo_sales
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND dojo_sales.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "users read own dojo sales"
  ON public.dojo_sales
  FOR SELECT
  USING (buyer_user_id = auth.uid());

CREATE POLICY "dojo staff write dojo sales"
  ON public.dojo_sales
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND dojo_sales.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = auth.uid()
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND dojo_sales.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
  );

-- dojo_sale_items ------------------------------------------------------
DROP POLICY IF EXISTS "dojo staff read dojo sale items"  ON public.dojo_sale_items;
DROP POLICY IF EXISTS "dojo staff write dojo sale items" ON public.dojo_sale_items;

CREATE POLICY "dojo staff read dojo sale items"
  ON public.dojo_sale_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.dojo_sales s
        JOIN public.users u ON u.id = auth.uid()
       WHERE s.id = dojo_sale_items.sale_id
         AND (
           u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
           AND s.dojo_id IN (
             SELECT dojo_id FROM public.instructors   WHERE id = u.id
             UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
             UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
           )
           OR s.buyer_user_id = u.id
         )
    )
  );

CREATE POLICY "dojo staff write dojo sale items"
  ON public.dojo_sale_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM public.dojo_sales s
        JOIN public.users u ON u.id = auth.uid()
       WHERE s.id = dojo_sale_items.sale_id
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND s.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM public.dojo_sales s
        JOIN public.users u ON u.id = auth.uid()
       WHERE s.id = dojo_sale_items.sale_id
         AND u.role_id IN ('INSTRUCTOR','DOJO_MANAGER','DOJO_OWNER','ADMIN')
         AND s.dojo_id IN (
           SELECT dojo_id FROM public.instructors   WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_managers WHERE id = u.id
           UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = u.id
         )
    )
  );

-- =============================================================
-- 8. Drop the now-unused partial unique on members owner-per-dojo
-- =============================================================
DROP INDEX IF EXISTS public.members_one_owner_per_dojo;

-- =============================================================
-- 9. Drop members + MemberRole enum
-- =============================================================
DROP TABLE IF EXISTS public.members CASCADE;
DROP TYPE  IF EXISTS public."MemberRole";

-- updated_at triggers for new tables (reuse existing function)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS users_set_updated_at         ON public.users;
DROP TRIGGER IF EXISTS students_set_updated_at      ON public.students;
DROP TRIGGER IF EXISTS instructors_set_updated_at   ON public.instructors;
DROP TRIGGER IF EXISTS dojo_managers_set_updated_at ON public.dojo_managers;
DROP TRIGGER IF EXISTS dojo_owners_set_updated_at   ON public.dojo_owners;
DROP TRIGGER IF EXISTS admins_set_updated_at        ON public.admins;

CREATE TRIGGER users_set_updated_at         BEFORE UPDATE ON public.users         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER students_set_updated_at      BEFORE UPDATE ON public.students      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER instructors_set_updated_at   BEFORE UPDATE ON public.instructors   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER dojo_managers_set_updated_at BEFORE UPDATE ON public.dojo_managers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER dojo_owners_set_updated_at   BEFORE UPDATE ON public.dojo_owners   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER admins_set_updated_at        BEFORE UPDATE ON public.admins        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- 10. Enable RLS on new tables
-- =============================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dojo_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dojo_owners   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Baseline: an authenticated user reads their own user / role rows; admins read all.
CREATE POLICY users_read_self ON public.users
  FOR SELECT USING (id = auth.uid()
                    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY users_update_self ON public.users
  FOR UPDATE USING (id = auth.uid()
                    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY students_read_self_or_dojo ON public.students
  FOR SELECT USING (
    id = auth.uid()
    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN'
    OR students.dojo_id IN (
      SELECT dojo_id FROM public.instructors   WHERE id = auth.uid()
      UNION SELECT dojo_id FROM public.dojo_managers WHERE id = auth.uid()
      UNION SELECT dojo_id FROM public.dojo_owners   WHERE id = auth.uid()
    )
  );

CREATE POLICY instructors_read_self_or_admin ON public.instructors
  FOR SELECT USING (id = auth.uid()
                    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY dojo_managers_read_self_or_admin ON public.dojo_managers
  FOR SELECT USING (id = auth.uid()
                    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY dojo_owners_read_self_or_admin ON public.dojo_owners
  FOR SELECT USING (id = auth.uid()
                    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY admins_read_self_or_admin ON public.admins
  FOR SELECT USING (id = auth.uid()
                    OR (SELECT role_id FROM public.users WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY roles_public_read       ON public.roles            FOR SELECT USING (true);
CREATE POLICY permissions_public_read ON public.permissions      FOR SELECT USING (true);
CREATE POLICY role_permissions_public_read ON public.role_permissions FOR SELECT USING (true);

COMMIT;

\echo '=== Post-migration counts ==='
SELECT
  (SELECT count(*) FROM users)         AS users_total,
  (SELECT count(*) FROM students)      AS students,
  (SELECT count(*) FROM instructors)   AS instructors,
  (SELECT count(*) FROM dojo_managers) AS dojo_managers,
  (SELECT count(*) FROM dojo_owners)   AS dojo_owners,
  (SELECT count(*) FROM admins)        AS admins;
