-- Update belt_ranks to match the official JKA Bangladesh Belt Chart.
--
-- Changes from previous schema:
--   • Added "Stripe Yellow Belt" (9th Kyu)
--   • Split single "Brown Belt" into three: 3rd Kyu, 2nd Kyu, 1st Kyu
--   • Removed 2nd–5th Dan black belts (chart only shows 1st Dan)
--   • Renumbered kyu_dan values to match the 10-Kyu system
--
-- Strategy: park all existing rows at high offsets to avoid UNIQUE
-- constraint violations, then upsert the correct rows, and finally
-- clean up any ranks that no longer exist.

begin;

-- 1. Park existing rows out of the way (order_index is UNIQUE).
update belt_ranks set order_index = order_index + 1000;

-- 2. Upsert the authoritative 11-rank progression.
insert into belt_ranks (name, kyu_dan, color_hex, order_index, updated_at) values
  ('White Belt',          '10th Kyu', '#FFFFFF',  0, now()),
  ('Stripe Yellow Belt',  '9th Kyu',  '#FFD700',  1, now()),
  ('Yellow Belt',         '8th Kyu',  '#FFD700',  2, now()),
  ('Orange Belt',         '7th Kyu',  '#FF8C00',  3, now()),
  ('Green Belt',          '6th Kyu',  '#228B22',  4, now()),
  ('Blue Belt',           '5th Kyu',  '#0000CD',  5, now()),
  ('Purple Belt',         '4th Kyu',  '#7C3AED',  6, now()),
  ('Brown Belt 3rd Kyu',  '3rd Kyu',  '#8B4513',  7, now()),
  ('Brown Belt 2nd Kyu',  '2nd Kyu',  '#8B4513',  8, now()),
  ('Brown Belt 1st Kyu',  '1st Kyu',  '#8B4513',  9, now()),
  ('Black Belt 1st Dan',  '1st Dan',  '#1a1a1a', 10, now())
on conflict (name) do update set
  kyu_dan     = excluded.kyu_dan,
  color_hex   = excluded.color_hex,
  order_index = excluded.order_index,
  updated_at  = now();

-- 3. Migrate any students on the old "Brown Belt" to "Brown Belt 3rd Kyu".
update students
  set current_rank = 'Brown Belt 3rd Kyu'
  where current_rank = 'Brown Belt';

-- 4. Remove old Dan ranks that are no longer in the chart.
--    Only delete if there are no foreign-key references (gradings, events, etc.).
--    If references exist, this will fail safely and you'll need to reassign first.
delete from belt_ranks where name in (
  'Black Belt 2nd Dan',
  'Black Belt 3rd Dan',
  'Black Belt 4th Dan',
  'Black Belt 5th Dan'
);

-- 5. Remove the old single "Brown Belt" if it still exists.
delete from belt_ranks where name = 'Brown Belt';

commit;
