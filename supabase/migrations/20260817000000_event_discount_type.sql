-- Add a discount-type toggle on multi-division discounts so admins can
-- pick between a percentage-off or a flat BDT-off value. Widen the value
-- column so it can hold BDT amounts larger than 100.

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS multi_division_discount_type text NOT NULL DEFAULT 'PERCENT';

ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS events_multi_division_discount_type_check;

ALTER TABLE public.events
    ADD CONSTRAINT events_multi_division_discount_type_check
    CHECK (multi_division_discount_type IN ('PERCENT', 'FIXED'));

ALTER TABLE public.events
    ALTER COLUMN multi_division_discount_percent TYPE numeric(10, 2)
        USING multi_division_discount_percent::numeric(10, 2);
