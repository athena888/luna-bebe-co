-- "The First Year" product catalog — individual items in this line, kept SEPARATE
-- from the main store's products table. Each carries photos, an optional short
-- video, price, sizes, and an optional shipment assignment.
create table if not exists public.first_year_products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null default '',
  description    text not null default '',
  price_cents    int,
  sizes          text,                          -- free text, e.g. "NB, 3mo, 6mo"
  shipment_index int,                            -- 1/2/3 (Welcome/Growing/One) or null
  images         text[] not null default '{}',  -- public URLs; first = primary
  video_url      text,
  sort_order     int not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists first_year_products_order_idx on public.first_year_products (sort_order, created_at);
alter table public.first_year_products enable row level security;
drop policy if exists first_year_products_service on public.first_year_products;
create policy first_year_products_service on public.first_year_products for all to service_role using (true) with check (true);
