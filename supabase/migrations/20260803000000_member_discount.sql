-- Member discount — admin can set a percentage (0–100) on every event and
-- shop product. Applied at purchase / registration when the buyer is a
-- signed-in JKA member (Student with ACTIVE membership).

ALTER TABLE "shop_products"
  ADD COLUMN IF NOT EXISTS "member_discount_percent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "member_discount_percent" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "shop_products"
  DROP CONSTRAINT IF EXISTS "shop_products_member_discount_percent_range";
ALTER TABLE "shop_products"
  ADD CONSTRAINT "shop_products_member_discount_percent_range"
  CHECK ("member_discount_percent" BETWEEN 0 AND 100);

ALTER TABLE "events"
  DROP CONSTRAINT IF EXISTS "events_member_discount_percent_range";
ALTER TABLE "events"
  ADD CONSTRAINT "events_member_discount_percent_range"
  CHECK ("member_discount_percent" BETWEEN 0 AND 100);
