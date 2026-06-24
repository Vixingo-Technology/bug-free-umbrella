-- 2026-06-24-unified-role-system.sql
-- Unifies MemberRole + DojoRole into a single members.role enum.
-- Run with: psql "$DIRECT_URL" -f scripts/migrations/2026-06-24-unified-role-system.sql

\set ON_ERROR_STOP on

-- ─────────────────────────────────────────────
-- PRE-FLIGHT: snapshot counts so we can verify
-- ─────────────────────────────────────────────
\echo '=== Pre-migration counts ==='
SELECT
  (SELECT count(*) FROM members)                            AS members_total,
  (SELECT count(*) FROM members WHERE role = 'STUDENT')     AS members_student,
  (SELECT count(*) FROM members WHERE role = 'INSTRUCTOR')  AS members_instructor,
  (SELECT count(*) FROM members WHERE role = 'ADMIN')       AS members_admin,
  (SELECT count(*) FROM instructors)                        AS instructors_table,
  (SELECT count(*) FROM admins)                             AS admins_table,
  (SELECT count(*) FROM dojos WHERE head_instructor_id IS NOT NULL) AS dojos_with_head;

-- ─────────────────────────────────────────────
-- PART 1: Add new enum values (must be its own tx)
-- ─────────────────────────────────────────────
BEGIN;
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'DOJO_MANAGER';
ALTER TYPE "MemberRole" ADD VALUE IF NOT EXISTS 'DOJO_OWNER';
COMMIT;

-- ─────────────────────────────────────────────
-- PART 2: Backfill + schema change (single tx)
-- ─────────────────────────────────────────────
BEGIN;

-- 2a. Backfill DOJO_OWNER from dojos.head_instructor_id.
--     Federation ADMINs are preserved — if they're listed as a dojo
--     head, the dojo just loses its head pointer (re-assign via UI later).
UPDATE members m
   SET role    = 'DOJO_OWNER',
       dojo_id = d.id
  FROM dojos d
 WHERE d.head_instructor_id = m.id
   AND d.head_instructor_id IS NOT NULL
   AND m.role <> 'ADMIN';

-- 2b. Backfill INSTRUCTOR + dojoId from the instructors side-table for
--     anyone NOT already promoted to DOJO_OWNER and NOT a federation ADMIN.
--     (No-op if the instructors table is empty.)
UPDATE members m
   SET role    = 'INSTRUCTOR',
       dojo_id = i.dojo_id
  FROM instructors i
 WHERE i.member_id = m.id
   AND m.role NOT IN ('DOJO_OWNER', 'ADMIN');

-- 2c. Backfill ADMIN from the (currently empty) admins side-table.
--     Kept for completeness — no-op when admins is empty.
UPDATE members m
   SET role = 'ADMIN'
  FROM admins a
 WHERE a.member_id = m.id;

-- 2d. Drop the now-redundant side tables.
DROP TABLE IF EXISTS instructors CASCADE;
DROP TABLE IF EXISTS admins      CASCADE;

-- 2e. Drop the redundant pointer column.
ALTER TABLE dojos DROP COLUMN IF EXISTS head_instructor_id;

-- 2f. Enforce "one DOJO_OWNER per dojo" at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS members_one_owner_per_dojo
    ON members (dojo_id)
 WHERE role = 'DOJO_OWNER';

COMMIT;

-- ─────────────────────────────────────────────
-- POST-FLIGHT: verify the unified counts
-- ─────────────────────────────────────────────
\echo '=== Post-migration counts ==='
SELECT
  role,
  count(*) AS n,
  count(*) FILTER (WHERE dojo_id IS NOT NULL) AS with_dojo
  FROM members
 GROUP BY role
 ORDER BY role;
