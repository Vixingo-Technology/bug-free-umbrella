-- Group multiple tournament divisions under one payment session.
--
-- A participant entering both Kata and Kumite in a single premium-event
-- submission creates two event_registrations rows; both carry the same
-- payment_group_id and one gateway session pays for both. The webhook
-- receives the primary row's id via tran_id, and lib/events/ticket-payment
-- fans the PAID mark out to every sibling with the same group id.

alter table event_registrations
  add column if not exists payment_group_id uuid;

create index if not exists event_registrations_payment_group_idx
  on event_registrations (payment_group_id)
  where payment_group_id is not null;
