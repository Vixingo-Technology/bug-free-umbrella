-- Certificate request system.
-- Dojos select passed gradings, pay a per-rank fee, and the system renders
-- a PDF certificate that is stored on the student profile. Mirrors the
-- existing dojo-renewal flow: a ShopOrder is the payment object, the
-- SSLCommerz webhook flips it to PAID, and CertificateRequest rows transition
-- through the PDF generation lifecycle.

-- 1. Per-rank certificate price ─────────────────────────────────────────────
alter table public.belt_ranks
  add column if not exists certificate_price numeric(10, 2);

-- 2. Parent names on members (collected at onboarding) ─────────────────────
alter table public.members
  add column if not exists father_name text,
  add column if not exists mother_name text;

-- 3. Dojo owner signature URL ──────────────────────────────────────────────
alter table public.dojos
  add column if not exists owner_signature_url text;

-- 4. ShopOrder: certificate-order flags ────────────────────────────────────
alter table public.shop_orders
  add column if not exists includes_certificates boolean not null default false,
  add column if not exists cert_dojo_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_cert_dojo_id_fkey'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_cert_dojo_id_fkey
      foreign key (cert_dojo_id) references public.dojos(id) on delete set null;
  end if;
end$$;

create index if not exists shop_orders_cert_dojo_id_idx
  on public.shop_orders (cert_dojo_id)
  where cert_dojo_id is not null;

-- 5. Notification type: CERTIFICATE ────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'CERTIFICATE'
      and enumtypid = 'public."NotificationType"'::regtype
  ) then
    alter type public."NotificationType" add value 'CERTIFICATE';
  end if;
end$$;

-- 6. CertificateRequestStatus enum ─────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'CertificateRequestStatus') then
    create type public."CertificateRequestStatus" as enum (
      'PENDING_PAYMENT',
      'PAID',
      'GENERATING',
      'ISSUED',
      'FAILED'
    );
  end if;
end$$;

-- 7. certificate_requests table ────────────────────────────────────────────
create table if not exists public.certificate_requests (
  id              uuid primary key default gen_random_uuid(),
  grading_id      uuid not null references public.gradings(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete cascade,
  dojo_id         uuid not null references public.dojos(id),
  order_id        uuid references public.shop_orders(id) on delete set null,
  status          public."CertificateRequestStatus" not null default 'PENDING_PAYMENT',
  price           numeric(10, 2) not null,
  certificate_url text,
  failure_reason  text,
  member_name     text not null,
  father_name     text,
  mother_name     text,
  rank_name       text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists certificate_requests_grading_id_idx
  on public.certificate_requests (grading_id);
create index if not exists certificate_requests_dojo_id_idx
  on public.certificate_requests (dojo_id);
create index if not exists certificate_requests_order_id_idx
  on public.certificate_requests (order_id);
create index if not exists certificate_requests_status_idx
  on public.certificate_requests (status);

-- One outstanding (not-yet-ISSUED) request per grading. Prevents a dojo from
-- queuing two payments for the same grading. Already-ISSUED certificates
-- can have additional historical rows if needed (re-issue), so the
-- constraint excludes ISSUED.
create unique index if not exists certificate_requests_one_open_per_grading
  on public.certificate_requests (grading_id)
  where status in ('PENDING_PAYMENT', 'PAID', 'GENERATING');

-- 8. system_settings — singleton table ─────────────────────────────────────
create table if not exists public.system_settings (
  id                   text primary key default 'default',
  admin_signature_url  text,
  admin_signer_name    text,
  admin_signer_title   text,
  certificate_logo_url text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

insert into public.system_settings (id) values ('default')
  on conflict (id) do nothing;

-- 9. RLS ───────────────────────────────────────────────────────────────────
alter table public.certificate_requests enable row level security;
alter table public.system_settings      enable row level security;

-- Members see their own certificate requests (so they can show the cert in
-- the portal once issued).
drop policy if exists "members read own cert requests" on public.certificate_requests;
create policy "members read own cert requests"
  on public.certificate_requests
  for select
  using (member_id = auth.uid());

-- Dojo staff see requests belonging to their dojo. We use the same pattern
-- as other dojo-scoped policies: a sub-select on members to find the
-- viewer's dojo_id and role.
drop policy if exists "dojo staff read dojo cert requests" on public.certificate_requests;
create policy "dojo staff read dojo cert requests"
  on public.certificate_requests
  for select
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = certificate_requests.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  );

-- Admins read everything.
drop policy if exists "admins read all cert requests" on public.certificate_requests;
create policy "admins read all cert requests"
  on public.certificate_requests
  for all
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.role = 'ADMIN'
    )
  );

-- system_settings — anyone authenticated can read (cert UI references the
-- logo + signer name on the public student card), only admins can write.
drop policy if exists "auth read system settings" on public.system_settings;
create policy "auth read system settings"
  on public.system_settings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "admins write system settings" on public.system_settings;
create policy "admins write system settings"
  on public.system_settings
  for all
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.role = 'ADMIN'
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid() and m.role = 'ADMIN'
    )
  );
