-- "The First Year" sub-line — additive only. Existing products default to
-- product_type='standard' (no behavior change). scheduled_shipments records the
-- 3 future-dated obligations created when someone buys the first_year_set.
-- Mirrored as item 26 in _RUN_ALL_PENDING.sql.

alter table public.products add column if not exists product_type text not null default 'standard';

create table if not exists public.scheduled_shipments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references public.orders(id),
  set_product_id      text,
  shipment_index      int,
  label               text,
  target_month_offset int,
  status              text not null default 'pending',
  planned_size        text,
  ship_by_date        date,
  notice_sent_at      timestamptz,
  confirm_token       text,
  recipient_email     text,
  created_at          timestamptz not null default now()
);
create index if not exists scheduled_shipments_due_idx on public.scheduled_shipments (status, ship_by_date);
alter table public.scheduled_shipments enable row level security;
drop policy if exists scheduled_shipments_service on public.scheduled_shipments;
create policy scheduled_shipments_service on public.scheduled_shipments for all to service_role using (true) with check (true);
