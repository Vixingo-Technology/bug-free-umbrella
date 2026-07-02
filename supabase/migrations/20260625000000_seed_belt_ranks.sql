-- Seed belt_ranks with the 12-step JKA Bangladesh progression.
-- Names must match lib/constants.ts BELT_RANKS_ORDERED exactly — the
-- belt-test request flow looks up the member's current_rank by exact
-- name match (see lib/belt-rank.ts).

-- updated_at is managed by Prisma's @updatedAt at runtime, so the column has
-- no DB default. We provide it explicitly here so raw-SQL inserts succeed.
insert into belt_ranks (name, kyu_dan, color_hex, order_index, updated_at) values
  ('White Belt',         '9th Kyu', '#FFFFFF',  0, now()),
  ('Yellow Belt',        '8th Kyu', '#FFD700',  1, now()),
  ('Orange Belt',        '7th Kyu', '#FF8C00',  2, now()),
  ('Green Belt',         '6th Kyu', '#228B22',  3, now()),
  ('Blue Belt',          '5th Kyu', '#0000CD',  4, now()),
  ('Purple Belt',        '4th Kyu', '#7C3AED',  5, now()),
  ('Brown Belt',         '1st Kyu', '#8B4513',  6, now()),
  ('Black Belt 1st Dan', '1st Dan', '#1a1a1a',  7, now()),
  ('Black Belt 2nd Dan', '2nd Dan', '#1a1a1a',  8, now()),
  ('Black Belt 3rd Dan', '3rd Dan', '#1a1a1a',  9, now()),
  ('Black Belt 4th Dan', '4th Dan', '#1a1a1a', 10, now()),
  ('Black Belt 5th Dan', '5th Dan', '#1a1a1a', 11, now())
on conflict (name) do update set
  kyu_dan     = excluded.kyu_dan,
  color_hex   = excluded.color_hex,
  order_index = excluded.order_index,
  updated_at  = now();
