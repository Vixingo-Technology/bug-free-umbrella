-- Dojo inventory + member-receipt sales.
--
-- A dojo "stocks" a JKA admin-uploaded product (public.shop_products) by
-- creating / topping up a row in public.dojo_inventory_items. When the dojo
-- gives items to a student, a public.dojo_sales row is created together with
-- public.dojo_sale_items rows that snapshot the line totals; the matching
-- inventory rows are decremented in the same transaction.
--
-- Receipt numbering: receipt_no is a per-dojo printable counter
-- (`R-000001`, `R-000002`, ...) — uniqueness is enforced at the DB level.

-- 1. dojo_inventory_items ───────────────────────────────────────────────────
create table if not exists public.dojo_inventory_items (
  id                uuid primary key default gen_random_uuid(),
  dojo_id           uuid not null references public.dojos(id) on delete cascade,
  product_id        uuid not null references public.shop_products(id) on delete cascade,
  quantity_on_hand  integer not null default 0,
  unit_price        numeric(10, 2) not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (dojo_id, product_id)
);

create index if not exists dojo_inventory_items_dojo_id_idx
  on public.dojo_inventory_items (dojo_id);

-- 2. dojo_sales (member receipts) ───────────────────────────────────────────
create table if not exists public.dojo_sales (
  id              uuid primary key default gen_random_uuid(),
  dojo_id         uuid not null references public.dojos(id) on delete cascade,
  receipt_no      text not null,
  member_id       uuid references public.members(id) on delete set null,
  buyer_name      text not null,
  sold_by_user_id uuid references public.members(id) on delete set null,
  sold_by_name    text,
  subtotal        numeric(10, 2) not null,
  discount        numeric(10, 2) not null default 0,
  total           numeric(10, 2) not null,
  payment_method  text,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (dojo_id, receipt_no)
);

create index if not exists dojo_sales_dojo_id_created_at_idx
  on public.dojo_sales (dojo_id, created_at desc);

create index if not exists dojo_sales_member_id_idx
  on public.dojo_sales (member_id)
  where member_id is not null;

-- 3. dojo_sale_items ────────────────────────────────────────────────────────
create table if not exists public.dojo_sale_items (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.dojo_sales(id) on delete cascade,
  product_id   uuid not null references public.shop_products(id),
  product_name text not null,
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10, 2) not null,
  line_total   numeric(10, 2) not null
);

create index if not exists dojo_sale_items_sale_id_idx
  on public.dojo_sale_items (sale_id);

-- 4. updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dojo_inventory_items_set_updated_at on public.dojo_inventory_items;
create trigger dojo_inventory_items_set_updated_at
  before update on public.dojo_inventory_items
  for each row execute procedure public.set_updated_at();

-- 5. RLS ────────────────────────────────────────────────────────────────────
alter table public.dojo_inventory_items enable row level security;
alter table public.dojo_sales           enable row level security;
alter table public.dojo_sale_items      enable row level security;

-- dojo_inventory_items: dojo staff manage their dojo's stock.
drop policy if exists "dojo staff read dojo inventory" on public.dojo_inventory_items;
create policy "dojo staff read dojo inventory"
  on public.dojo_inventory_items
  for select
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = dojo_inventory_items.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  );

drop policy if exists "dojo staff write dojo inventory" on public.dojo_inventory_items;
create policy "dojo staff write dojo inventory"
  on public.dojo_inventory_items
  for all
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = dojo_inventory_items.dojo_id
        and m.role in ('DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = dojo_inventory_items.dojo_id
        and m.role in ('DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  );

-- dojo_sales: dojo staff read their dojo's sales; members read their own.
drop policy if exists "dojo staff read dojo sales" on public.dojo_sales;
create policy "dojo staff read dojo sales"
  on public.dojo_sales
  for select
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = dojo_sales.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  );

drop policy if exists "members read own dojo sales" on public.dojo_sales;
create policy "members read own dojo sales"
  on public.dojo_sales
  for select
  using (member_id = auth.uid());

drop policy if exists "dojo staff write dojo sales" on public.dojo_sales;
create policy "dojo staff write dojo sales"
  on public.dojo_sales
  for all
  using (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = dojo_sales.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  )
  with check (
    exists (
      select 1 from public.members m
      where m.id = auth.uid()
        and m.dojo_id = dojo_sales.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  );

-- dojo_sale_items: piggyback on parent sale's policies.
drop policy if exists "dojo staff read dojo sale items" on public.dojo_sale_items;
create policy "dojo staff read dojo sale items"
  on public.dojo_sale_items
  for select
  using (
    exists (
      select 1
      from public.dojo_sales s
      join public.members m on m.id = auth.uid()
      where s.id = dojo_sale_items.sale_id
        and (
          m.dojo_id = s.dojo_id and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
          or s.member_id = m.id
        )
    )
  );

drop policy if exists "dojo staff write dojo sale items" on public.dojo_sale_items;
create policy "dojo staff write dojo sale items"
  on public.dojo_sale_items
  for all
  using (
    exists (
      select 1
      from public.dojo_sales s
      join public.members m on m.id = auth.uid()
      where s.id = dojo_sale_items.sale_id
        and m.dojo_id = s.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  )
  with check (
    exists (
      select 1
      from public.dojo_sales s
      join public.members m on m.id = auth.uid()
      where s.id = dojo_sale_items.sale_id
        and m.dojo_id = s.dojo_id
        and m.role in ('INSTRUCTOR', 'DOJO_MANAGER', 'DOJO_OWNER', 'ADMIN')
    )
  );
