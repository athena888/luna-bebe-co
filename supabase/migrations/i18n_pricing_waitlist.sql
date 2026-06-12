-- Internationalization data: explicit per-currency prices (no runtime FX) and a
-- market waitlist for not-yet-launched regions.

-- Per-currency product prices. A product is purchasable in a market only if a
-- row exists for that currency (no silent USD fallback).
create table if not exists public.product_prices (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null,                       -- matches products.id (text)
  currency    text not null check (currency in ('USD','GBP','EUR')),
  unit_amount int  not null,                        -- minor units (cents/pence)
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (product_id, currency)
);
create index if not exists product_prices_lookup_idx on public.product_prices (product_id, currency, active);
alter table public.product_prices enable row level security;
drop policy if exists product_prices_public_read on public.product_prices;
create policy product_prices_public_read on public.product_prices for select using (active = true);
drop policy if exists product_prices_service_write on public.product_prices;
create policy product_prices_service_write on public.product_prices for all to service_role using (true) with check (true);

-- Market waitlist — emails captured from disabled-market visitors. Doubles as a
-- demand counter per region.
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  region     text,                                  -- locale they want, e.g. 'en-GB'
  created_at timestamptz not null default now(),
  unique (email, region)
);
alter table public.waitlist enable row level security;
drop policy if exists waitlist_service_write on public.waitlist;
create policy waitlist_service_write on public.waitlist for all to service_role using (true) with check (true);
