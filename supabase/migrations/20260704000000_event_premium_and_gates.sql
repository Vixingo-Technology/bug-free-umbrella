-- Premium ticketing + participation gates for events.
--
-- events gains:
--   is_premium / ticket_price  — paid events with a BDT ticket price
--   min_age                    — minimum participant age at event date
--   min_rank_id                — minimum belt rank (FK to belt_ranks)
--   participant_type           — who may register
--
-- event_registrations gains ticket-payment tracking (reuses the existing
-- "PaymentStatus" enum; NULL means the event was free) plus the gate answers
-- collected on the registration form.

do $$ begin
  create type event_participant_type as enum
    ('PUBLIC', 'STUDENTS', 'INSTRUCTORS', 'PARENTS', 'DOJO_MEMBERS');
exception
  when duplicate_object then null;
end $$;

alter table events
  add column if not exists is_premium boolean not null default false,
  add column if not exists ticket_price numeric(10, 2),
  add column if not exists min_age integer,
  add column if not exists min_rank_id uuid references belt_ranks(id) on delete set null,
  add column if not exists participant_type event_participant_type not null default 'PUBLIC';

alter table event_registrations
  add column if not exists payment_status "PaymentStatus",
  add column if not exists amount_due numeric(10, 2),
  add column if not exists paid_at timestamp(3),
  add column if not exists transaction_id text,
  add column if not exists guest_date_of_birth date,
  add column if not exists parent_of_member_number text;
