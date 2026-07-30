-- Seed the "Double Promotion" achievement.
--
-- Split from 20260731000000_double_promotion.sql because Postgres forbids
-- using an enum value in the same transaction that adds it.
-- Kept in sync with lib/achievements/catalog.ts by slug.
INSERT INTO public.achievements
  (slug, name, name_bn, description, description_bn, icon, tier, rule, threshold, order_index, updated_at)
VALUES
  ('double-promotion',
   'Double Promotion',
   'ডাবল প্রমোশন',
   'Score 80 or above in a belt test and skip a rank.',
   'বেল্ট পরীক্ষায় ৮০+ নম্বর পেয়ে একটি র‍্যাঙ্ক এড়িয়ে যান।',
   'ChevronsUp',
   'EPIC',
   'HIGH_MARK_GRADINGS',
   1,
   155,
   now())
ON CONFLICT (slug) DO UPDATE SET
  name           = excluded.name,
  name_bn        = excluded.name_bn,
  description    = excluded.description,
  description_bn = excluded.description_bn,
  icon           = excluded.icon,
  tier           = excluded.tier,
  rule           = excluded.rule,
  threshold      = excluded.threshold,
  order_index    = excluded.order_index,
  updated_at     = now();
