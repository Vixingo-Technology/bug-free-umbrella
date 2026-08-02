-- Tournament events can now enable both KATA and KUMITE at once, and admins
-- can add custom categories that are not in the WKF preset.
--
-- Adds to tournament_details:
--   • enabled_types      tournament_event_type[]  — 1 or 2 values. Backfilled
--     from the existing single `event_type` column so old rows keep working.
--   • custom_divisions   jsonb — array of { code, label, eventType, isTeam }
--     entries the admin defined for this specific event. Merged with the
--     preset list from lib/tournaments/divisions.ts at read time.

alter table tournament_details
  add column if not exists enabled_types    tournament_event_type[] not null default '{}',
  add column if not exists custom_divisions jsonb;

update tournament_details
   set enabled_types = array[event_type]
 where cardinality(enabled_types) = 0;
