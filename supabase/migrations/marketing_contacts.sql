-- §37 in _RUN_ALL_PENDING.sql — marketing machine shared infrastructure.

-- Customer marketing contacts: OUR source of truth (Resend audience becomes
-- secondary). Captured only via checkout, newsletter signup, or landing pages
-- — never imported lists. marketing_opt_in gates every marketing send.
-- Named marketing_contacts because the plain `contacts` table already exists
-- and belongs to the B2B outreach pipeline (lib/outreach.ts, lib/pipeline/*).
create table if not exists public.marketing_contacts (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  name               text,
  segment            text not null default 'unknown'
                     check (segment in ('parent_to_be','grandparent','friend_coworker','corporate','unknown')),
  zip                text,
  source             text not null default 'unknown',   -- checkout | newsletter | post_purchase_click | landing_page:<slug>
  marketing_opt_in   boolean not null default false,
  opt_in_at          timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists marketing_contacts_segment_idx on public.marketing_contacts (segment);
alter table public.marketing_contacts enable row level security;
drop policy if exists marketing_contacts_service_all on public.marketing_contacts;
create policy marketing_contacts_service_all on public.marketing_contacts for all to service_role using (true) with check (true);

-- Campaign attribution on the email log (future one-off/campaign sends).
alter table email_events add column if not exists campaign text;
