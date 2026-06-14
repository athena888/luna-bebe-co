-- Cold-outreach sender (Gmail domain-wide delegation). Suppression list + an
-- explicit outreach-eligibility flag so the sender only ever emails contacts you
-- deliberately enrolled — never customers or inbound leads. Also mirrored as
-- item 21 in _RUN_ALL_PENDING.sql.

create table if not exists public.suppression (
  email      text primary key,
  reason     text,                 -- stop | bounce | manual | complaint
  created_at timestamptz not null default now()
);
alter table public.suppression enable row level security;
drop policy if exists suppression_service on public.suppression;
create policy suppression_service on public.suppression for all to service_role using (true) with check (true);

alter table public.contacts add column if not exists outreach_enrolled boolean not null default false;
alter table public.contacts add column if not exists first_name text;
