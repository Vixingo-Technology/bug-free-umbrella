-- Tournament support built on the existing Event / EventRegistration flow.
--
-- Adds:
--   • Gender enum + gender column on profiles (used for auto-fill + division
--     matching on tournament entries).
--   • tournament_event_type enum (KATA | KUMITE).
--   • tournament_details — 1:1 with events when category = 'TOURNAMENT'.
--     Holds the competition type, the admin-selected subset of WKF divisions
--     (Appendix 2/3 codes), registration deadline and (for kumite) weigh-in
--     date. Division codes are stable strings defined in
--     lib/tournaments/divisions.ts; not a FK, so admins can enable/disable
--     divisions per tournament without table churn.
--   • event_registrations gains tournament-only columns: division_code,
--     entrant_gender, entrant_weight_kg, entrant_belt_rank, entrant_dojo_name,
--     coach_name, team_name, teammates (jsonb), minor-guardian block, and a
--     per-registration emergency-contact copy for guests. All nullable — they
--     stay NULL on non-tournament events.

do $$ begin
  create type "Gender" as enum ('MALE', 'FEMALE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type tournament_event_type as enum ('KATA', 'KUMITE');
exception
  when duplicate_object then null;
end $$;

alter table profiles
  add column if not exists gender "Gender";

create table if not exists tournament_details (
  event_id              uuid primary key references events(id) on delete cascade,
  event_type            tournament_event_type not null,
  enabled_divisions     text[] not null default '{}',
  registration_deadline timestamp(3),
  weigh_in_date         timestamp(3),
  rules_url             text,
  created_at            timestamp(3) not null default now(),
  updated_at            timestamp(3) not null default now()
);

alter table event_registrations
  add column if not exists division_code           text,
  add column if not exists entrant_gender          "Gender",
  add column if not exists entrant_weight_kg       numeric(5, 2),
  add column if not exists entrant_belt_rank       text,
  add column if not exists entrant_dojo_name       text,
  add column if not exists coach_name              text,
  add column if not exists team_name               text,
  add column if not exists teammates               jsonb,
  add column if not exists guardian_name           text,
  add column if not exists guardian_phone          text,
  add column if not exists guardian_consent        boolean,
  add column if not exists emergency_contact_name  text,
  add column if not exists emergency_contact_phone text;

create index if not exists event_registrations_event_division_idx
  on event_registrations (event_id, division_code);
