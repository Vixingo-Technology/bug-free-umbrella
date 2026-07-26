-- Seed belt_ranks with the 11-step JKA Bangladesh progression.
-- Names must match lib/constants.ts BELT_RANKS_ORDERED exactly — the
-- belt-test request flow looks up the member's current_rank by exact
-- name match (see lib/belt-rank.ts).

-- updated_at is managed by Prisma's @updatedAt at runtime, so the column has
-- no DB default. We provide it explicitly here so raw-SQL inserts succeed.
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

