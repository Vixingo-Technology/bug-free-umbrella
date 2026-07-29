-- Multi-step joining flow for new students.
--
-- Students now progress through four stages after signup:
--   FEE_UNPAID        →  paid JKA membership fee?
--   AWAITING_APPROVAL →  dojo owner accepted and set the correct rank?
--   PAST_BELT_UNPAID  →  paid catch-up fee for previous belts? (skipped when White)
--   JOINED            →  full portal access unlocked
--
-- The stage is independent of MembershipStatus (which tracks whether the
-- annual JKA fee is still in good standing).

-- 1. JoinStage enum -----------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'JoinStage') THEN
        CREATE TYPE "JoinStage" AS ENUM (
            'FEE_UNPAID',
            'AWAITING_APPROVAL',
            'PAST_BELT_UNPAID',
            'JOINED'
        );
    END IF;
END$$;

-- 2. Extend students ----------------------------------------------------------
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS join_stage        "JoinStage" NOT NULL DEFAULT 'FEE_UNPAID',
    ADD COLUMN IF NOT EXISTS requested_rank    text,
    ADD COLUMN IF NOT EXISTS assigned_rank     text,
    ADD COLUMN IF NOT EXISTS past_belt_fee_bdt integer,
    ADD COLUMN IF NOT EXISTS join_pdf_url      text,
    ADD COLUMN IF NOT EXISTS joined_at         timestamptz;

-- Backfill existing members: anyone already ACTIVE has effectively joined.
UPDATE students
   SET join_stage = 'JOINED',
       joined_at  = COALESCE(joined_at, created_at)
 WHERE membership_status = 'ACTIVE'
   AND join_stage = 'FEE_UNPAID';

-- 3. Past-belt fee setting ---------------------------------------------------
ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS past_belt_fee_per_rank_bdt numeric(10, 2);

-- 4. Shop-order flag ---------------------------------------------------------
ALTER TABLE shop_orders
    ADD COLUMN IF NOT EXISTS includes_past_belt_fee boolean NOT NULL DEFAULT false;
