-- Extend belt_ranks with 2nd Dan through 10th Dan so admins can gate events
-- (and participants can self-declare) up to the full Dan progression.
--
-- Names must stay in sync with lib/constants.ts BELT_RANKS_ORDERED — the
-- belt-test request flow looks up a member's current_rank by exact name match
-- (see lib/belt-rank.ts).

insert into belt_ranks (name, kyu_dan, color_hex, order_index, updated_at) values
  ('Black Belt 2nd Dan',  '2nd Dan',  '#1a1a1a', 11, now()),
  ('Black Belt 3rd Dan',  '3rd Dan',  '#1a1a1a', 12, now()),
  ('Black Belt 4th Dan',  '4th Dan',  '#1a1a1a', 13, now()),
  ('Black Belt 5th Dan',  '5th Dan',  '#1a1a1a', 14, now()),
  ('Black Belt 6th Dan',  '6th Dan',  '#1a1a1a', 15, now()),
  ('Black Belt 7th Dan',  '7th Dan',  '#1a1a1a', 16, now()),
  ('Black Belt 8th Dan',  '8th Dan',  '#1a1a1a', 17, now()),
  ('Black Belt 9th Dan',  '9th Dan',  '#1a1a1a', 18, now()),
  ('Black Belt 10th Dan', '10th Dan', '#1a1a1a', 19, now())
on conflict (name) do update set
  kyu_dan     = excluded.kyu_dan,
  color_hex   = excluded.color_hex,
  order_index = excluded.order_index,
  updated_at  = now();
