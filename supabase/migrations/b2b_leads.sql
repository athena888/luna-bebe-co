-- Corporate & Team Gifting leads (Task 5). Inserts via the service-role server
-- action only; duplicate emails allowed (no unique constraint).
create table if not exists public.b2b_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  company text,
  team_size text,          -- '<50' | '50-200' | '200-1000' | '1000+'
  message text,
  created_at timestamptz not null default now()
);
alter table public.b2b_leads enable row level security;
-- inserts via service-role server action only (service role bypasses RLS)
drop policy if exists b2b_leads_service_write on public.b2b_leads;
create policy b2b_leads_service_write on public.b2b_leads for all to service_role using (true) with check (true);
