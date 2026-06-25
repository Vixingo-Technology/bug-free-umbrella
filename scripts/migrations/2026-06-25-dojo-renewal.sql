-- Dojo renewal — keep it as simple as the student membership renewal.
-- Drops the complex "renewal policy" columns that were never wired up and
-- replaces them with an expiry date plus a ShopOrder.dojo_id pointer so the
-- existing SSLCommerz payment + webhook flow can extend dojo membership the
-- same way it already extends member membership.

-- Drop unused policy columns (added but never surfaced beyond the settings form).
alter table public.dojos
  drop column if exists renewal_period_months,
  drop column if exists grace_period_days,
  drop column if exists late_fee,
  drop column if exists reminder_days_before,
  drop column if exists auto_reminders_enabled;

-- Keep annual_fee (already present) and add expiry_date.
alter table public.dojos
  add column if not exists annual_fee numeric(10, 2),
  add column if not exists expiry_date timestamptz;

-- Tag shop_orders that pay for a dojo renewal so the webhook knows to
-- extend dojos.expiry_date rather than members.expiry_date.
alter table public.shop_orders
  add column if not exists dojo_id uuid,
  add column if not exists includes_dojo_renewal boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'shop_orders_dojo_id_fkey'
  ) then
    alter table public.shop_orders
      add constraint shop_orders_dojo_id_fkey
      foreign key (dojo_id) references public.dojos(id) on delete set null;
  end if;
end$$;

create index if not exists shop_orders_dojo_id_idx
  on public.shop_orders (dojo_id)
  where dojo_id is not null;
