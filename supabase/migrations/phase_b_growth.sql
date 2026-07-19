-- Phase B growth modules (§31 in _RUN_ALL_PENDING.sql):
-- add-on flags on products, per-SKU unit economics, customer email flow
-- scheduler, marketing opt-outs, and the weekly scorecard snapshot.
-- All access via service role.

-- "Complete the gift" add-ons shown in the bag drawer
alter table products add column if not exists is_addon boolean not null default false;
alter table products add column if not exists addon_rank int not null default 0;

-- Editable costs per SKU per channel; margins/breakeven computed client-side
create table if not exists public.sku_economics (
  sku_id           text not null references products(id) on delete cascade,
  channel          text not null default 'site' check (channel in ('site', 'etsy')),
  retail_price     int,                       -- cents; null = follow products.price
  landed_cost      int  not null default 0,   -- cents
  packaging_cost   int  not null default 0,
  fulfillment_cost int  not null default 0,
  updated_at       timestamptz not null default now(),
  primary key (sku_id, channel)
);
alter table public.sku_economics enable row level security;
drop policy if exists sku_economics_service_all on public.sku_economics;
create policy sku_economics_service_all on public.sku_economics for all to service_role using (true) with check (true);

-- Scheduled customer flow emails (welcome series, post-purchase review ask,
-- win-back). One row per email; the daily cron sends due rows.
create table if not exists public.email_events (
  id           uuid primary key default gen_random_uuid(),
  flow         text not null check (flow in ('welcome', 'postpurchase', 'winback')),
  step         int  not null default 1,
  recipient    text not null,
  order_id     uuid,
  template     text not null,
  scheduled_at timestamptz not null,
  sent_at      timestamptz,
  canceled_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists email_events_due_idx on public.email_events (scheduled_at) where sent_at is null and canceled_at is null;
create index if not exists email_events_recipient_idx on public.email_events (recipient, flow);
alter table public.email_events enable row level security;
drop policy if exists email_events_service_all on public.email_events;
create policy email_events_service_all on public.email_events for all to service_role using (true) with check (true);

-- Flow-email unsubscribes (CAN-SPAM). Checked before every flow send.
create table if not exists public.email_optouts (
  email      text primary key,
  source     text,
  created_at timestamptz not null default now()
);
alter table public.email_optouts enable row level security;
drop policy if exists email_optouts_service_all on public.email_optouts;
create policy email_optouts_service_all on public.email_optouts for all to service_role using (true) with check (true);

-- Friday snapshot of the weekly numbers + the one-sentence note
create table if not exists public.weekly_scorecard (
  week_of       date primary key,          -- Monday of the week
  revenue       int not null default 0,    -- cents, paid orders
  orders        int not null default 0,
  aov           int not null default 0,    -- cents
  sessions      int,                       -- GA4 (null when GA isn't configured)
  cvr           numeric,                   -- orders / sessions
  email_revenue int not null default 0,    -- cents, orders with utm_source=email
  repeat_rate   numeric,                   -- share of orders from returning customers
  weeks_on_hand numeric,                   -- stock units / weekly sales velocity
  note          text,
  created_at    timestamptz not null default now()
);
alter table public.weekly_scorecard enable row level security;
drop policy if exists weekly_scorecard_service_all on public.weekly_scorecard;
create policy weekly_scorecard_service_all on public.weekly_scorecard for all to service_role using (true) with check (true);
