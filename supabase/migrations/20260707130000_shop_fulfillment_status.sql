-- Shop order fulfillment status (delivery pipeline, separate from payment status)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShopFulfillmentStatus') THEN
    CREATE TYPE "ShopFulfillmentStatus" AS ENUM ('PREPARING', 'IN_TRANSIT', 'DELIVERED', 'RETURNED');
  END IF;
END $$;

ALTER TABLE "shop_orders"
  ADD COLUMN IF NOT EXISTS "fulfillment_status" "ShopFulfillmentStatus" NOT NULL DEFAULT 'PREPARING';
