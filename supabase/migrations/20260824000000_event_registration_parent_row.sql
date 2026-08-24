-- Members can top up an existing registration with add-ons they missed the
-- first time round. Each top-up creates a "shadow" registration row that
-- carries the delta payment + the newly-picked add-ons, and references the
-- parent row via parent_registration_id. Shadow rows share divisionCode
-- with their parent so they merge cleanly on the participation card, so the
-- (event_id, user_id, division_code) uniqueness must exclude them.

alter table event_registrations
  add column if not exists parent_registration_id uuid
    references event_registrations(id) on delete cascade;

create index if not exists event_registrations_parent_id_idx
  on event_registrations (parent_registration_id);

drop index if exists one_registration_per_user_per_event;
create unique index one_registration_per_user_per_event
  on event_registrations (event_id, user_id, division_code)
  where user_id is not null and parent_registration_id is null;

drop index if exists one_guest_registration_per_event;
create unique index one_guest_registration_per_event
  on event_registrations (event_id, lower(guest_email), division_code)
  where user_id is null and guest_email is not null and parent_registration_id is null;
