-- Guest shop checkout — public /shop page allows non-authenticated users to
-- place orders using name / phone / address only. We keep the ShopOrder row
-- for guests (userId becomes NULL) and store their contact + shipping info
-- in dedicated columns so we do not create phantom User rows.

ALTER TABLE public.shop_orders
    ALTER COLUMN user_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS guest_name    TEXT,
    ADD COLUMN IF NOT EXISTS guest_email   TEXT,
    ADD COLUMN IF NOT EXISTS guest_phone   TEXT,
    ADD COLUMN IF NOT EXISTS guest_address TEXT,
    ADD COLUMN IF NOT EXISTS is_guest_order BOOLEAN NOT NULL DEFAULT FALSE;

-- Match the new Prisma relation: keep the order row when the linked user is
-- removed instead of cascading — guest orders never had a user to begin with,
-- and we want to preserve order history for former members too.
ALTER TABLE public.shop_orders
    DROP CONSTRAINT IF EXISTS shop_orders_user_id_fkey;

ALTER TABLE public.shop_orders
    ADD CONSTRAINT shop_orders_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id) ON DELETE SET NULL;

-- Product sizing — admins may enable sizes on a product and list allowed
-- labels; customers must pick one before adding to cart. `size` is captured
-- on each ordered line-item so packing knows which variant to ship.
ALTER TABLE public.shop_products
    ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sizes TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.shop_order_items
    ADD COLUMN IF NOT EXISTS size TEXT;
