-- Flag added when a Dojo Head creates an account for an existing student
-- with a temporary password. The portal layout redirects such users to
-- /set-password until the flag clears (see setPasswordAction).
alter table public.users
  add column if not exists must_change_password boolean not null default false;
