-- §54 — Outreach Quality v3: qualification-first targeting.
--
-- The v1/v2 pipeline optimized for "can I find a deliverable email?". This
-- migration adds the storage the new qualification layer needs to answer the
-- real question: "is this company likely to become a RECURRING buyer of
-- new-parent gifts, and am I reaching the person who owns that decision?"
--
-- Everything here is additive and idempotent. No existing row is deleted or
-- rewritten; historical prospects, sends and suppression are preserved intact.
-- Reversal instructions are at the bottom of this file.
--
-- Design notes:
--  * Prospect discovery capacity and live send volume are deliberately
--    DECOUPLED (§45/§51). Nothing here caps how many prospects may exist.
--    Send safety is enforced by the daily cap in code, not by pool size.
--  * Firmographics and signals are keyed by DOMAIN, not prospect id, so the
--    research survives prospect churn and is reused across re-discovery (§50).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Firmographics, cached per company domain.
-- ─────────────────────────────────────────────────────────────────────────────
-- Ranges, never invented exact headcounts. employee_min/max may both be null
-- when research found nothing — that is an honest "unknown", and the scorer
-- penalizes it rather than guessing.
create table if not exists public.prospect_firmographics (
  domain            text primary key,
  company_name      text,
  employee_min      int,
  employee_max      int,
  size_band         text,          -- 1-10 | 11-25 | 26-50 | 51-100 | 101-200 | 201-500 | 501-1000 | 1001-5000 | 5000+
  size_confidence   text not null default 'LOW',   -- HIGH | MEDIUM | LOW
  industry          text,
  subindustry       text,
  company_type      text,          -- private | public | nonprofit | partnership | agency | fund
  hq_city           text,
  hq_state          text,
  country           text default 'US',
  source_urls       jsonb not null default '[]'::jsonb,
  research_summary  text,
  confidence        text not null default 'LOW',   -- overall research confidence
  research_version  int  not null default 3,
  researched_at     timestamptz not null default now()
);
create index if not exists prospect_firmographics_band on public.prospect_firmographics (size_band);
create index if not exists prospect_firmographics_researched on public.prospect_firmographics (researched_at);
alter table public.prospect_firmographics enable row level security;
drop policy if exists prospect_firmographics_service on public.prospect_firmographics;
create policy prospect_firmographics_service on public.prospect_firmographics
  for all to service_role using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Structured buying signals — the evidence behind every qualification.
-- ─────────────────────────────────────────────────────────────────────────────
-- One row per observed signal. Every signal carries its source so a human can
-- verify it; "no evidence found" is represented by the ABSENCE of rows, never
-- by a fabricated signal.
create table if not exists public.prospect_signals (
  id           uuid primary key default gen_random_uuid(),
  domain       text not null,
  prospect_id  uuid references public.prospects(id) on delete set null,
  signal_type  text not null,   -- see lib/outreach/icp.ts SIGNAL_TYPES
  signal_value text,
  confidence   text not null default 'MEDIUM',   -- HIGH | MEDIUM | LOW
  source_url   text,
  source_title text,
  observed_at  timestamptz not null default now()
);
create index if not exists prospect_signals_domain on public.prospect_signals (domain);
create index if not exists prospect_signals_type on public.prospect_signals (signal_type);
-- One signal of a given type per domain per source; re-observation updates.
create unique index if not exists prospect_signals_uidx
  on public.prospect_signals (domain, signal_type, coalesce(source_url, ''));
alter table public.prospect_signals enable row level security;
drop policy if exists prospect_signals_service on public.prospect_signals;
create policy prospect_signals_service on public.prospect_signals
  for all to service_role using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Prospect qualification columns.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.prospects add column if not exists segment                text;
alter table public.prospects add column if not exists qualification_score    int;
alter table public.prospects add column if not exists qualification_tier     text;   -- EXCELLENT | GOOD | WEAK | BAD
alter table public.prospects add column if not exists qualification_status   text;   -- see §49 taxonomy
alter table public.prospects add column if not exists company_fit_score      int;
alter table public.prospects add column if not exists contact_fit_score      int;
alter table public.prospects add column if not exists intent_score           int;
alter table public.prospects add column if not exists data_quality_score     int;
alter table public.prospects add column if not exists recurring_potential    text;   -- HIGH | MEDIUM | LOW
alter table public.prospects add column if not exists contact_confidence     text;   -- HIGH | MEDIUM | LOW
alter table public.prospects add column if not exists company_size_band      text;
alter table public.prospects add column if not exists company_size_confidence text;
alter table public.prospects add column if not exists email_is_generic       boolean;
alter table public.prospects add column if not exists generic_email_reason   text;
alter table public.prospects add column if not exists generic_override_required boolean not null default false;
alter table public.prospects add column if not exists generic_override_approved boolean not null default false;
alter table public.prospects add column if not exists qualification_summary  text;
alter table public.prospects add column if not exists qualification_reasons  jsonb not null default '[]'::jsonb;
alter table public.prospects add column if not exists disqualification_reasons jsonb not null default '[]'::jsonb;
alter table public.prospects add column if not exists title_raw              text;   -- verbatim public title
alter table public.prospects add column if not exists title_interpretation   text;   -- AI commentary, kept OUT of title
alter table public.prospects add column if not exists role_family            text;
alter table public.prospects add column if not exists qualified_at           timestamptz;
alter table public.prospects add column if not exists research_version       int not null default 1;

create index if not exists prospects_qual_tier on public.prospects (qualification_tier);
create index if not exists prospects_qual_status on public.prospects (qualification_status);
create index if not exists prospects_segment on public.prospects (segment);
-- The selection query: eligible, ranked by score desc. Partial index keeps it
-- small as the pool grows without bound (§45).
create index if not exists prospects_selection
  on public.prospects (qualification_score desc)
  where qualification_status = 'QUALIFIED' and status = 'discovered';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Send ledger: thread identity + delivery state + idempotency.
-- ─────────────────────────────────────────────────────────────────────────────
-- gmail_thread_id is what makes reply detection possible — sendEmail() already
-- returns it, the old sender simply discarded it.
alter table public.sends add column if not exists gmail_thread_id text;
alter table public.sends add column if not exists rfc_message_id  text;
alter table public.sends add column if not exists recipient_email text;
alter table public.sends add column if not exists sequence_step   int not null default 0;  -- 0=initial,1=fu1,2=fu2
alter table public.sends add column if not exists delivery_state  text;   -- delivered | hard_bounce | soft_bounce
alter table public.sends add column if not exists bounced_at      timestamptz;
alter table public.sends add column if not exists bounce_reason   text;
alter table public.sends add column if not exists replied_at      timestamptz;

create index if not exists sends_thread on public.sends (gmail_thread_id) where gmail_thread_id is not null;
create index if not exists sends_delivery on public.sends (delivery_state);
-- IDEMPOTENCY: one send row per (draft, sequence step). Prevents the same draft
-- being queued twice and, with the touch guard below, stops double bookkeeping.
create unique index if not exists sends_draft_step_uidx on public.sends (draft_id, sequence_step);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Touches ledger idempotency — root fix for the 94-vs-75 metric inflation.
-- ─────────────────────────────────────────────────────────────────────────────
-- A Gmail message id identifies exactly one delivered message. Two touch rows
-- carrying the same message_id are duplicate bookkeeping, never two sends.
-- NOTE: this index is created only after duplicates are cleaned. The repair
-- script (scripts/repair-touch-duplicates.mjs) reports and removes them; run it
-- BEFORE this migration if the index creation fails.
create unique index if not exists touches_message_id_uidx
  on public.touches (message_id)
  where message_id is not null and direction = 'outbound';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Reply classification + account funnel.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.prospects add column if not exists replied_at        timestamptz;
alter table public.prospects add column if not exists reply_category    text;
  -- POSITIVE | QUESTION | REFERRAL | NOT_NOW | NOT_INTERESTED | WRONG_PERSON
  -- | UNSUBSCRIBE | AUTO_REPLY | BOUNCE | UNKNOWN
alter table public.prospects add column if not exists reply_snippet     text;
alter table public.prospects add column if not exists referred_contact  text;
alter table public.prospects add column if not exists followup_paused_reason text;
alter table public.prospects add column if not exists next_followup_at  timestamptz;
alter table public.prospects add column if not exists sequence_step     int not null default 0;
alter table public.prospects add column if not exists account_stage     text;
  -- DISCOVERED | QUALIFIED | CONTACT_FOUND | DRAFTED | APPROVED | SENT
  -- | DELIVERED | REPLIED | POSITIVE_REPLY | LOOKBOOK_REQUESTED
  -- | SAMPLE_REQUESTED | QUOTE_REQUESTED | FIRST_ORDER | REPEAT_ORDER
  -- | LOST | SUPPRESSED
create index if not exists prospects_account_stage on public.prospects (account_stage);
create index if not exists prospects_next_followup on public.prospects (next_followup_at)
  where next_followup_at is not null;

-- Gmail sync bookkeeping — so a sync run is resumable and auditable.
create table if not exists public.gmail_sync_log (
  id            uuid primary key default gen_random_uuid(),
  ran_at        timestamptz not null default now(),
  threads_checked int not null default 0,
  replies_found int not null default 0,
  bounces_found int not null default 0,
  manual_replies_found int not null default 0,
  errors        text,
  dry           boolean not null default false
);
alter table public.gmail_sync_log enable row level security;
drop policy if exists gmail_sync_log_service on public.gmail_sync_log;
create policy gmail_sync_log_service on public.gmail_sync_log
  for all to service_role using (true) with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Feature flags — explicit, no hidden defaults (§41).
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.outreach_config (key, value)
values ('quality_v3', jsonb_build_object(
  'qualification_enabled', true,    -- new scorer active
  'selection_enabled',     true,    -- ranked selection replaces FIFO
  'reply_sync_enabled',    false,   -- needs gmail.readonly scope — see manual actions
  'drafting_enabled',      true,    -- drafts qualified prospects only
  'live_sends_enabled',    false,   -- OFF during implementation
  'followup_1_enabled',    false,   -- OFF until reply sync verified
  'followup_2_enabled',    false,   -- OFF until reply sync verified
  'discovery_enabled',     true     -- discovery continues regardless of send state
))
on conflict (key) do nothing;

-- Segment quota weights (§24). Geography is secondary to ICP quality (§25).
insert into public.outreach_config (key, value)
values ('segment_quota', jsonb_build_object(
  'EMPLOYEE_GIFTING', 45,
  'WEALTH_CLIENT',    25,
  'VC_PLATFORM',      15,
  'LAW_PROFESSIONAL', 15,
  'PARTNERSHIP',       0,
  'LOW_PRIORITY',      0
))
on conflict (key) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- REVERSAL (run manually if this migration must be undone)
-- ─────────────────────────────────────────────────────────────────────────────
-- drop index if exists public.touches_message_id_uidx;
-- drop index if exists public.sends_draft_step_uidx;
-- drop table if exists public.gmail_sync_log;
-- drop table if exists public.prospect_signals;
-- drop table if exists public.prospect_firmographics;
-- delete from public.outreach_config where key in ('quality_v3','segment_quota');
-- Added prospect/send columns are intentionally NOT dropped on reversal — they
-- are nullable and additive, and dropping them would destroy qualification
-- history. Remove them by hand only if you are certain.

-- Done.
