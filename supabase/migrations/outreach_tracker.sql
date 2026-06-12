-- Outreach tracker (lightweight CRM): contacts + interaction history (touches)
-- + needs-attention flags, plus an inbound-email quarantine for unknown senders.
-- Backs the Portal → Outreach "Needs Attention" list and corporate-lead flagging.
-- All access is via the service role (admin server actions / guarded API routes).

create table if not exists public.contacts (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,                -- dedupe key
  name           text,
  company        text,
  track          text not null default 'A',           -- 'A' general | 'C' corporate
  status         text not null default 'new',         -- new | replied | contacted | closed
  source         text,                                -- corporate_form | inbound_email | ...
  is_corporate   boolean not null default false,
  company_size   text,                                -- '<50' | '50-200' | '200-1000' | '1000+'
  needs          text,                                -- free-text "what they need"
  gifts_per_year text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists contacts_corporate_idx on public.contacts (is_corporate, updated_at desc);

create table if not exists public.touches (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  direction  text not null,                           -- inbound | outbound
  channel    text not null default 'email',           -- email | form
  snippet    text,
  created_at timestamptz not null default now()
);
create index if not exists touches_contact_idx on public.touches (contact_id, created_at desc);

create table if not exists public.flags (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  priority    text not null default 'warm',           -- hot | warm
  reason      text not null,
  status      text not null default 'open',           -- open | resolved
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists flags_open_idx on public.flags (status, priority, created_at desc);

-- Inbound emails from senders we can't match to a contact, held for review.
create table if not exists public.inbound_quarantine (
  id               uuid primary key default gen_random_uuid(),
  from_email       text not null,
  from_domain      text,
  subject          text,
  snippet          text,
  likely_corporate boolean not null default false,
  status           text not null default 'pending',   -- pending | reviewed
  created_at       timestamptz not null default now()
);
create index if not exists quarantine_pending_idx on public.inbound_quarantine (status, likely_corporate desc, created_at desc);

-- RLS: service-role only. No public/anon access to any CRM table.
alter table public.contacts           enable row level security;
alter table public.touches            enable row level security;
alter table public.flags              enable row level security;
alter table public.inbound_quarantine enable row level security;
drop policy if exists contacts_service   on public.contacts;
create policy contacts_service   on public.contacts           for all to service_role using (true) with check (true);
drop policy if exists touches_service    on public.touches;
create policy touches_service    on public.touches            for all to service_role using (true) with check (true);
drop policy if exists flags_service      on public.flags;
create policy flags_service      on public.flags              for all to service_role using (true) with check (true);
drop policy if exists quarantine_service on public.inbound_quarantine;
create policy quarantine_service on public.inbound_quarantine for all to service_role using (true) with check (true);
