-- §51 — Targeting v2: weekly city×industry rotation, frozen templates,
-- batched Haiku qualification with 180-day domain cache, Anthropic call
-- ledger, per-combo metric tags, optional reply triage.
-- The rotation/templates themselves live in code (lib/outreach/targeting.ts,
-- lib/outreach/templates.ts) — frozen, git-reviewed, never AI-modified.

-- Every Anthropic API call the outreach machine makes (hard cap 3/day is
-- enforced in code by counting today's rows — failed calls count too).
create table if not exists public.ai_call_log (
  id            uuid primary key default gen_random_uuid(),
  called_at     timestamptz not null default now(),
  purpose       text not null,             -- prospect_search | qualification | reply_triage
  model         text not null,
  batch_size    int  not null default 0,
  input_tokens  int  not null default 0,
  output_tokens int  not null default 0,
  est_cost_usd  numeric(10,6) not null default 0,
  ok            boolean not null default true,
  error         text
);
create index if not exists ai_call_log_called_at on public.ai_call_log (called_at);
alter table public.ai_call_log enable row level security;
drop policy if exists ai_call_log_service on public.ai_call_log;
create policy ai_call_log_service on public.ai_call_log for all to service_role using (true) with check (true);

-- Qualification cache by company domain — valid 180 days; a cached domain is
-- never re-classified inside the window (enforced in lib/outreach/qualify.ts).
create table if not exists public.qualification_cache (
  domain        text primary key,
  qualified     boolean not null,
  industry_key  text not null,             -- key from INDUSTRIES, or 'none'
  persona_match boolean not null default false,
  reason        text not null default '',
  classified_at timestamptz not null default now()
);
alter table public.qualification_cache enable row level security;
drop policy if exists qualification_cache_service on public.qualification_cache;
create policy qualification_cache_service on public.qualification_cache for all to service_role using (true) with check (true);

-- Prospect qualification + triage fields.
alter table prospects add column if not exists source_url            text;
alter table prospects add column if not exists industry_key          text;
alter table prospects add column if not exists persona_match         boolean;
alter table prospects add column if not exists qualification_reason  text;
alter table prospects add column if not exists qualification_via     text;   -- cache | source | api
alter table prospects add column if not exists reply_triage          text;   -- sample_request | question | not_interested | unsubscribe | other

-- Per-combo metric tags on drafts (combo_key = '{city}x{industry}').
alter table email_drafts add column if not exists combo_key       text;
alter table email_drafts add column if not exists track_used      text;   -- EMPLOYEE_GIFTING | CLIENT_GIFTING | PARTNER | REFERRAL_PARTNER
alter table email_drafts add column if not exists subject_variant text;   -- A | B
create index if not exists email_drafts_combo_key on email_drafts (combo_key) where combo_key is not null;

-- Feature flag: v2 rotation OFF until the dry run is approved; reply triage
-- OFF by default per spec.
insert into outreach_config (key, value)
values ('targeting_v2', '{"enabled": false, "reply_triage_enabled": false}'::jsonb)
on conflict (key) do nothing;

-- Done.
