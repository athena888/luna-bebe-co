-- Occasion dates (Build 3) — §39 in _RUN_ALL_PENDING.sql.
-- Remembered due dates / baby birthdays for perfectly-timed sends. Sends only
-- go to opted-in marketing contacts; whole flow OFF until OCCASIONS_ACTIVE=true.
create table if not exists public.contact_occasions (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  kind           text not null check (kind in ('due_date','baby_birthday')),
  occasion_date  date not null,
  label          text,                              -- optional, e.g. baby's name
  source         text not null default 'unknown',
  created_at     timestamptz not null default now(),
  unique (email, kind, occasion_date)
);
create index if not exists contact_occasions_email_idx on public.contact_occasions (email);
alter table public.contact_occasions enable row level security;
drop policy if exists contact_occasions_service_all on public.contact_occasions;
create policy contact_occasions_service_all on public.contact_occasions for all to service_role using (true) with check (true);

-- Widen the email_events flow CHECK to allow occasion sends.
alter table email_events drop constraint if exists email_events_flow_check;
alter table email_events add constraint email_events_flow_check
  check (flow in ('welcome','postpurchase','winback','transactional','occasion'));
