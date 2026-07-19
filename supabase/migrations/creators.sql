-- Influencer/creator gifting tracker (§33 in _RUN_ALL_PENDING.sql) — the
-- missing half of the outreach CRM. Portal → Morning Review → Creators.
create table if not exists public.creators (
  id             uuid primary key default gen_random_uuid(),
  handle         text not null,
  platform       text not null default 'instagram',
  followers      int,
  niche          text,
  email          text,
  gifted_at      timestamptz,
  posted         boolean not null default false,
  post_url       text,
  content_rights boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists creators_gifted_idx on public.creators (posted, gifted_at);
alter table public.creators enable row level security;
drop policy if exists creators_service_all on public.creators;
create policy creators_service_all on public.creators for all to service_role using (true) with check (true);
