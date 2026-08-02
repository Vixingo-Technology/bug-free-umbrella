-- Tournament participants can enter multiple divisions in one event, so the
-- "one row per member per event" and "one row per guest per event" unique
-- indexes need to include division_code. Non-tournament rows keep the same
-- behaviour: division_code is NULL there, so (event_id, user_id, NULL) still
-- collides with a second attempt from the same user.

drop index if exists one_registration_per_user_per_event;
drop index if exists one_guest_registration_per_event;

create unique index one_registration_per_user_per_event
  on event_registrations (event_id, user_id, division_code)
  where user_id is not null;

create unique index one_guest_registration_per_event
  on event_registrations (event_id, lower(guest_email), division_code)
  where user_id is null and guest_email is not null;
