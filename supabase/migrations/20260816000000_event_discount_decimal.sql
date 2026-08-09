-- Allow decimal precision on event discount percentages so admins can set
-- fractional values (e.g. 12.5 %). The old range check (0..100) still
-- applies — BETWEEN works on numeric.

ALTER TABLE public.events
    ALTER COLUMN member_discount_percent TYPE numeric(5, 2)
        USING member_discount_percent::numeric(5, 2),
    ALTER COLUMN member_discount_percent SET DEFAULT 0;

ALTER TABLE public.events
    ALTER COLUMN multi_division_discount_percent TYPE numeric(5, 2)
        USING multi_division_discount_percent::numeric(5, 2),
    ALTER COLUMN multi_division_discount_percent SET DEFAULT 0;
