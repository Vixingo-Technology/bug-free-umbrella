# Unified Role System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the two parallel role systems (`MemberRole` enum + `DojoRole` derived from `Instructor`/`Admin`/`Dojo.headInstructorId`) into a single `members.role` enum, eliminating duplication and bringing the schema into clean 3NF.

**Architecture:** Extend `MemberRole` to `STUDENT | INSTRUCTOR | DOJO_MANAGER | DOJO_OWNER | ADMIN`. Drop the `admins` and `instructors` tables and the `dojos.head_instructor_id` column. A unique partial index on `members(dojoId) WHERE role = 'DOJO_OWNER'` enforces "one head per dojo". Route trees stay where they are; only the role-resolution code changes.

**Tech Stack:** PostgreSQL (Supabase), Prisma 7, Next.js 15, TypeScript.

## Global Constraints

- Production-like database with ~700 members. Migration MUST be transactional and reversible until commit.
- No formal Prisma migration history exists — use raw SQL via `psql` against `DIRECT_URL`, then `npm run db:push` to align Prisma.
- PostgreSQL constraint: `ALTER TYPE ... ADD VALUE` cannot run in the same transaction as code that uses the new value. Split DDL across two transactions.
- Working branch is `main` per user preference — no feature branches.
- Backfill must preserve every existing role assignment. Verify row counts before and after.
- Scope is **schema + queries only**. Do not consolidate `/dashboard`, `/portal`, `/dojo/dashboard` route trees in this pass.

---

### Task 1: Write the backfill + DDL SQL migration

**Files:**
- Create: `scripts/migrations/2026-06-24-unified-role-system.sql`

**Interfaces:**
- Produces: a single SQL file that adds enum values, backfills `members.role` + `members.dojoId`, drops `instructors` / `admins` tables, drops `dojos.head_instructor_id`, adds the partial unique index.

- [ ] **Step 1: Create the SQL migration file**

```sql
-- 2026-06-24-unified-role-system.sql
-- Unifies MemberRole + DojoRole into a single members.role enum.
-- Run with: psql "$DIRECT_URL" -f scripts/migrations/2026-06-24-unified-role-system.sql

\set ON_ERROR_STOP on

-- ─────────────────────────────────────────────
-- PRE-FLIGHT: snapshot counts so we can verify
-- ─────────────────────────────────────────────
\echo '=== Pre-migration counts ==='
SELECT
  (SELECT count(*) FROM members)                       AS members_total,
  (SELECT count(*) FROM members WHERE role = 'STUDENT')    AS members_student,
  (SELECT count(*) FROM members WHERE role = 'INSTRUCTOR') AS members_instructor,
  (SELECT count(*) FROM members WHERE role = 'ADMIN')      AS members_admin,
  (SELECT count(*) FROM instructors)                   AS instructors_table,
  (SELECT count(*) FROM admins)                        AS admins_table,
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
-- Heads take precedence over INSTRUCTOR rows for the same user.
UPDATE members m
   SET role   = 'DOJO_OWNER',
       dojo_id = d.id
  FROM dojos d
 WHERE d.head_instructor_id = m.id
   AND d.head_instructor_id IS NOT NULL;

-- 2b. Backfill INSTRUCTOR + dojoId from the instructors table for
--     anyone NOT already promoted to DOJO_OWNER above.
UPDATE members m
   SET role   = 'INSTRUCTOR',
       dojo_id = i.dojo_id
  FROM instructors i
 WHERE i.member_id = m.id
   AND m.role <> 'DOJO_OWNER';

-- 2c. Backfill ADMIN. Admin overrides any prior assignment because
--     federation admins are top-tier.
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
-- POST-FLIGHT: verify the unified counts add up
-- ─────────────────────────────────────────────
\echo '=== Post-migration counts ==='
SELECT
  role,
  count(*) AS n,
  count(*) FILTER (WHERE dojo_id IS NOT NULL) AS with_dojo
  FROM members
 GROUP BY role
 ORDER BY role;
```

- [ ] **Step 2: Open the file and re-read it end-to-end for typos**

Confirm:
- enum name is `"MemberRole"` (quoted, mixed-case — Prisma's default)
- column names use snake_case (`head_instructor_id`, `dojo_id`, `member_id`)
- table names are plural snake_case (`dojos`, `members`, `instructors`, `admins`)

- [ ] **Step 3: Commit the SQL file (no DB changes yet)**

```bash
git add scripts/migrations/2026-06-24-unified-role-system.sql
git commit -m "chore(db): unified role migration SQL (not yet applied)"
```

---

### Task 2: Dry-run the backfill on a transaction-rolled-back session

**Files:**
- None modified.

**Interfaces:** N/A — verification only.

- [ ] **Step 1: Run a manual `BEGIN; ... ROLLBACK;` test of Part 2 only**

We can't dry-run Part 1 (enum ADD VALUE is committed by Postgres), so just verify the backfill UPDATEs and the post-flight counts look right. The DROPs make this destructive — wrap in ROLLBACK first.

```bash
psql "$DIRECT_URL" <<'SQL'
BEGIN;
-- copy/paste 2a, 2b, 2c, 2d, 2e from the migration file here
SELECT role, count(*) FROM members GROUP BY role ORDER BY role;
ROLLBACK;
SQL
```

Expected: every member who was INSTRUCTOR, ADMIN, or a dojo head ends up with the correct role and a non-null `dojo_id` (where applicable). Total row count in `members` is unchanged.

- [ ] **Step 2: If counts look wrong, fix the SQL and re-test before moving on**

The pre/post counts in the file must reconcile: `members_instructor (before) + instructors_table − overlap_with_admin − overlap_with_dojo_head` should equal `INSTRUCTOR (after)`. If not, the backfill is wrong.

---

### Task 3: Apply the migration for real

**Files:**
- None modified by hand. Database is mutated.

**Interfaces:** Database now has the new enum values, unified `members.role`, and no `admins`/`instructors`/`dojos.head_instructor_id`.

- [ ] **Step 1: Apply the SQL file**

```bash
psql "$DIRECT_URL" -f scripts/migrations/2026-06-24-unified-role-system.sql
```

Expected: pre-flight counts print, both transactions COMMIT, post-flight `SELECT ... GROUP BY role` shows STUDENT, INSTRUCTOR, DOJO_OWNER (and ADMIN if any).

- [ ] **Step 2: Sanity-check via psql**

```bash
psql "$DIRECT_URL" -c "SELECT role, count(*) FROM members GROUP BY role;"
psql "$DIRECT_URL" -c "SELECT to_regclass('public.instructors'), to_regclass('public.admins');"
# expect both NULLs (tables gone)
psql "$DIRECT_URL" -c "\d dojos" | grep -i head_instructor
# expect no rows (column gone)
```

- [ ] **Step 3: Commit nothing (DB-only step)**

---

### Task 4: Update `prisma/schema.prisma` to match the new database

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: a Prisma schema with the unified `MemberRole`, no `Admin`/`Instructor` models, no `Dojo.headInstructorId`/`headInstructor`/`dojoHeadOf` relations, plus the partial unique index declared via `@@index`/raw — or, since Prisma doesn't model partial unique indexes ergonomically, left as a DB-only index documented in the schema header.

- [ ] **Step 1: Edit the `MemberRole` enum**

```prisma
enum MemberRole {
  STUDENT
  INSTRUCTOR
  DOJO_MANAGER
  DOJO_OWNER
  ADMIN
}
```

- [ ] **Step 2: Delete the `Admin` model entirely**

Remove the entire `model Admin { ... }` block and remove the `admin Admin?` field from `Member`.

- [ ] **Step 3: Delete the `Instructor` model entirely**

Remove the entire `model Instructor { ... }` block and remove the `instructor Instructor?` field from `Member`. Also remove the `instructors Instructor[]` field on `Dojo`.

- [ ] **Step 4: Remove `headInstructorId` and related relations from `Dojo`**

Delete these lines from `model Dojo`:

```prisma
headInstructorId  String? @db.Uuid       @map("head_instructor_id")
headInstructor Member?      @relation("DojoHeadInstructor", fields: [headInstructorId], references: [id])
```

And from `model Member`, delete:

```prisma
dojoHeadOf           Dojo[]                  @relation("DojoHeadInstructor")
```

- [ ] **Step 5: Add a header comment noting the DB-only partial unique index**

Just above `model Member`, add:

```prisma
// Note: a partial unique index `members_one_owner_per_dojo` enforces
// "one DOJO_OWNER per dojo" at the DB level. Created in
// scripts/migrations/2026-06-24-unified-role-system.sql; Prisma does
// not model partial unique indexes, so it lives in SQL.
```

- [ ] **Step 6: Push the schema and regenerate the client**

```bash
npm run db:push -- --skip-generate
npm run db:generate
```

Expected: `db push` says "Already in sync" (or applies only cosmetic comment-level changes). Generate succeeds.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma scripts/migrations/2026-06-24-unified-role-system.sql
git commit -m "feat(schema): unify role system into MemberRole enum"
```

---

### Task 5: Rewrite `lib/dojo-roles.ts` to alias `MemberRole`

**Files:**
- Modify: `lib/dojo-roles.ts`

**Interfaces:**
- Consumes: `MemberRole` from `@/prisma/generated/client`.
- Produces: `DojoRole` is now a string-literal subset of `MemberRole`. `hasAtLeast`, `ROLE_LABEL`, `ROLE_BADGE_COLOR`, `isDojoRole`, `PREVIEW_COOKIE` keep the same shape.

- [ ] **Step 1: Replace the file contents**

```ts
// Shared role constants and predicates. No server-only imports here —
// this module is imported by client components (e.g. dashboard shell).
import type { MemberRole } from "@/prisma/generated/client";

export const DOJO_ROLES = [
    "INSTRUCTOR",
    "DOJO_MANAGER",
    "DOJO_OWNER",
] as const satisfies readonly MemberRole[];

export type DojoRole = (typeof DOJO_ROLES)[number];

const ROLE_RANK: Record<DojoRole, number> = {
    INSTRUCTOR:    1,
    DOJO_MANAGER:  2,
    DOJO_OWNER:    3,
};

export const ROLE_LABEL: Record<DojoRole, string> = {
    INSTRUCTOR:   "Instructor",
    DOJO_MANAGER: "Manager",
    DOJO_OWNER:   "Dojo Head",
};

export const ROLE_BADGE_COLOR: Record<DojoRole, string> = {
    INSTRUCTOR:   "bg-emerald-100 text-emerald-700 border-emerald-200",
    DOJO_MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
    DOJO_OWNER:   "bg-accent-red/10 text-accent-red border-accent-red/30",
};

export const PREVIEW_COOKIE = "jka_dojo_preview_role";

export function hasAtLeast(role: DojoRole, min: DojoRole): boolean {
    return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function isDojoRole(value: unknown): value is DojoRole {
    return (
        typeof value === "string" &&
        (DOJO_ROLES as readonly string[]).includes(value)
    );
}
```

Note: the old `DOJO_INSTRUCTOR` literal becomes plain `INSTRUCTOR` — both meant "teaches at this dojo".

- [ ] **Step 2: Commit**

```bash
git add lib/dojo-roles.ts
git commit -m "refactor(dojo-roles): alias DojoRole to MemberRole literals"
```

---

### Task 6: Simplify `lib/dojo-resolver.ts`

**Files:**
- Modify: `lib/dojo-resolver.ts`

**Interfaces:**
- Consumes: `prisma`, `MemberRole`, `DojoRole`.
- Produces: same exported `getCurrentDojoForUser(userId)` signature and same `ResolvedDojo` shape, but **without** `headInstructorId` (the field is gone). Role comes directly from `member.role`.

- [ ] **Step 1: Replace the file contents**

```ts
import { prisma } from "@/lib/prisma";
import { isDojoRole, type DojoRole } from "@/lib/dojo-roles";

export type ResolvedDojo = {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
    latitude: number | null;
    longitude: number | null;
    isActive: boolean;
};

export type DojoMembership = {
    dojo: ResolvedDojo;
    role: DojoRole;
};

/**
 * Resolve the dojo a member belongs to and their role inside it.
 *
 * With the unified role system this is a single row read: members.role
 * tells us the dojo-scoped role (INSTRUCTOR / DOJO_MANAGER / DOJO_OWNER)
 * and members.dojoId tells us which dojo.
 */
export async function getCurrentDojoForUser(
    userId: string
): Promise<DojoMembership | null> {
    const member = await prisma.member.findUnique({
        where: { id: userId },
        select: {
            role: true,
            dojo: { select: dojoSelect() },
        },
    });

    if (!member || !member.dojo) return null;
    if (!isDojoRole(member.role)) return null;

    return { dojo: member.dojo, role: member.role };
}

function dojoSelect() {
    return {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        email: true,
        latitude: true,
        longitude: true,
        isActive: true,
    } as const;
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: any errors in this file are gone. Errors elsewhere are addressed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add lib/dojo-resolver.ts
git commit -m "refactor(dojo-resolver): read role directly from members"
```

---

### Task 7: Clean up `lib/dojo-session.ts`

**Files:**
- Modify: `lib/dojo-session.ts`

**Interfaces:**
- Same exported `getDojoSession()` and `requireDojoRole(min)` signatures.
- `realRole`/`role` now use the new `DojoRole` literals (`INSTRUCTOR` instead of `DOJO_INSTRUCTOR`).

- [ ] **Step 1: Update the role-resolution comment block**

In the docstring of `getDojoSession`, replace the "Source of truth" section with:

```ts
/**
 * Resolve the current viewer's dojo, role, and identity.
 *
 * Source of truth:
 *   1. members.role + members.dojoId — single read, no joins.
 *   2. Supabase user_metadata.role — used as a transient role while an
 *      enlistment application is still pending admin approval. The
 *      session is flagged `pendingApproval: true` in that case.
 */
```

- [ ] **Step 2: Verify the body still compiles**

The body already calls `getCurrentDojoForUser` and `hasAtLeast` — both still exist with the same signatures. Default `metaRole` fallback should remain `"DOJO_OWNER"`.

```bash
npx tsc --noEmit lib/dojo-session.ts
```

- [ ] **Step 3: Commit**

```bash
git add lib/dojo-session.ts
git commit -m "docs(dojo-session): update role source-of-truth comment"
```

---

### Task 8: Fix `headInstructorId` consumers

**Files (each modified):**
- `app/dashboard/page.tsx`
- `app/portal/admin/dojos/page.tsx`
- `app/dojo/dashboard/settings/page.tsx`
- `app/actions/admin-dojo-applications.ts`
- `app/actions/admin-dojos.ts`
- `components/portal/admin/dojos-client.tsx`

**Interfaces:** these files previously read `dojo.headInstructorId` or set it via Prisma. Replace with a query against `members` where `role = 'DOJO_OWNER' AND dojoId = <dojo.id>`.

- [ ] **Step 1: For each file, grep for `headInstructor` and replace per the patterns below**

```bash
grep -n "headInstructor" app/dashboard/page.tsx app/portal/admin/dojos/page.tsx app/dojo/dashboard/settings/page.tsx app/actions/admin-dojo-applications.ts app/actions/admin-dojos.ts components/portal/admin/dojos-client.tsx
```

Patterns:

**Reading the head** (replace any `include: { headInstructor: true }` or `dojo.headInstructor`):

```ts
// before
const dojo = await prisma.dojo.findUnique({
  where: { id },
  include: { headInstructor: true },
});
const headName = dojo?.headInstructor?.fullName;

// after
const dojo = await prisma.dojo.findUnique({ where: { id } });
const head = await prisma.member.findFirst({
  where: { dojoId: id, role: "DOJO_OWNER" },
});
const headName = head?.fullName;
```

**Assigning a head** (replace any `headInstructorId: memberId` on `dojo.create`/`dojo.update`):

```ts
// before
await prisma.dojo.update({
  where: { id: dojoId },
  data: { headInstructorId: memberId },
});

// after — promote the member; partial unique index guarantees one per dojo
await prisma.member.update({
  where: { id: memberId },
  data: { role: "DOJO_OWNER", dojoId: dojoId },
});
```

**Selecting `headInstructorId` in admin listings:** drop it from the `select`/`include`; fetch the owner separately with the query above if needed.

- [ ] **Step 2: After each file is edited, type-check the file**

```bash
npx tsc --noEmit
```

Repeat per file until zero errors remain in the affected paths.

- [ ] **Step 3: Commit once all six files compile**

```bash
git add app/dashboard/page.tsx app/portal/admin/dojos/page.tsx app/dojo/dashboard/settings/page.tsx app/actions/admin-dojo-applications.ts app/actions/admin-dojos.ts components/portal/admin/dojos-client.tsx
git commit -m "refactor: derive dojo head from members.role instead of headInstructorId"
```

---

### Task 9: Drop the dashboard-shell role-color literal mismatch

**Files:**
- Modify: `components/dashboard/dashboard-shell.tsx:83`

The line currently checks `role === "ADMIN" ? "#f59e0b" : role === "INSTRUCTOR" ? "#3b82f6" : "#10b981"`. New roles (`DOJO_OWNER`, `DOJO_MANAGER`) just fall to the default green — that's acceptable for this pass.

- [ ] **Step 1: Decide if the default is acceptable; leave as-is for now**

No change required unless visual feedback is requested. Mark this task complete.

- [ ] **Step 2: Commit nothing**

---

### Task 10: Full type-check + boot test

**Files:** none modified.

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. If anything still references `prisma.instructor.*`, `prisma.admin.*`, `dojo.headInstructor*`, `Member.instructor`, `Member.admin`, or `Member.dojoHeadOf` — fix it inline.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no new errors introduced by this work.

- [ ] **Step 3: Boot the dev server and smoke-test three role views**

```bash
npm run dev
```

In a browser:
1. Sign in as an existing student → `/portal/dashboard` renders without 500.
2. Sign in as an existing instructor (one whose `members.role` is now `INSTRUCTOR` and `dojoId` is set) → `/dashboard` shows the instructor view; their dojo students appear.
3. Sign in as an existing admin → `/portal/admin/dojos` lists dojos; each row shows the dojo head's name fetched via the new member query.

- [ ] **Step 4: Commit final fixes if any**

```bash
git add -A
git commit -m "fix: post-migration follow-ups from smoke test"
```

---

## Self-Review

**Spec coverage:**
- ✅ Single `members.role` enum: Task 4.
- ✅ Drop `admins` + `instructors`: Task 1, applied in Task 3, schema sync in Task 4.
- ✅ Drop `dojos.head_instructor_id`: Task 1 + Task 4 + Task 8.
- ✅ 3NF + partial unique index for one-owner-per-dojo: Task 1, step 2f.
- ✅ Code changes use the new role surface: Tasks 5–8.
- ✅ Backfill preserves existing assignments: Task 1, steps 2a–2c.
- ✅ Verification before destruction: Task 2.
- ❌ RLS policies: **deferred** — current `lib/supabase/middleware.ts` checks `members.role` via Prisma, not via RLS predicates on `instructors`/`admins`. Confirm no Supabase SQL RLS references the dropped tables before merging. (If `supabase/migrations/*.sql` ever lands, audit it then.)
- ❌ Backwards-compat for `user_metadata.role`: still uses `"INSTRUCTOR"`/`"ADMIN"` literals which are valid in the new enum. Safe.

**Placeholder scan:** no "TBD", no "handle edge cases", every code step shows real code. ✅

**Type consistency:** `DojoRole` literals changed from `DOJO_INSTRUCTOR` → `INSTRUCTOR` in Task 5; downstream consumers (`requireDojoRole("DOJO_INSTRUCTOR")` calls in `/dojo/dashboard/*` pages) need a find-and-replace.

**Add to Task 8 follow-up:**

- [ ] **Bonus Step: Replace `DOJO_INSTRUCTOR` literal across `/dojo/dashboard/*`**

```bash
grep -rln "DOJO_INSTRUCTOR" app/dojo/dashboard components/dojo lib
# for each hit, replace "DOJO_INSTRUCTOR" with "INSTRUCTOR"
```

Commit with the rest of Task 8.
