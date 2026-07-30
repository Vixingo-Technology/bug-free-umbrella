-- Double promotion — scoring 80+ on a belt test skips a rank.
--
-- The candidate applies for the rank directly above their current one; at 80+
-- marks they are promoted to the rank above *that* instead. gradings.to_rank_id
-- always holds the final rank, so this flag exists only so the UI and the
-- achievement engine can tell a double promotion from a normal pass.
-- See lib/grading-promotion.ts.
ALTER TABLE gradings
  ADD COLUMN IF NOT EXISTS is_double_promotion boolean NOT NULL DEFAULT false;

-- Backfill: every already-published pass scored 80 or above was, under the old
-- rules, a single promotion. They are left as false on purpose — historical
-- ranks must not move retroactively.

-- New achievement rule for the "Double Promotion" badge (80+ in a belt test).
-- Added in its own statement: Postgres will not let a new enum value be used
-- in the same transaction that creates it, so the catalog row that references
-- it is seeded by the next migration.
ALTER TYPE "AchievementRule" ADD VALUE IF NOT EXISTS 'HIGH_MARK_GRADINGS';
