-- ════════════════════════════════════════════════════════════════════════════
-- MARKETING COCKPIT (Phase 1) — merged with the existing outreach CRM.
--
-- Reuses contacts / touches / flags / inbound_quarantine (already live). The
-- brief's outreach_log + outreach_events FOLD INTO the existing `touches`
-- ledger (extended below) instead of becoming parallel tables:
--   • touches.direction='outbound'  = a cold email YOU sent      (outreach_log)
--   • touches.direction='inbound'   = a classified reply/inbound (outreach_events)
-- Only the plan / task / content tables are genuinely new.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Extend touches into the unified outreach ledger ──────────────────────────
alter table public.touches add column if not exists subject text;
alter table public.touches add column if not exists message_id text;
alter table public.touches add column if not exists in_reply_to text;
alter table public.touches add column if not exists category text;     -- classifier enum (§7.1)
alter table public.touches add column if not exists intent text;
alter table public.touches add column if not exists sentiment text;    -- positive | neutral | negative
alter table public.touches add column if not exists requires_followup boolean not null default false;
alter table public.touches add column if not exists followup_due date;
alter table public.touches add column if not exists status text;       -- outbound: sent | replied | followup_due | closed
alter table public.touches add column if not exists track text;        -- outreach track label (free text)
create index if not exists touches_followup_idx on public.touches (followup_due) where followup_due is not null;
create index if not exists touches_message_idx on public.touches (message_id);
create index if not exists touches_status_idx on public.touches (status);

-- ── Daily plan (one row per day; written by the 06:00 PT cron) ───────────────
create table if not exists public.daily_plans (
  id            uuid primary key default gen_random_uuid(),
  plan_date     date unique not null,
  recap         text,                 -- yesterday in 2-3 sentences
  strategy_note text,                 -- <= 4 sentences: the 'why' for today
  exec_rate     numeric,              -- yesterday's completion 0..1
  flags         jsonb,                -- string[] — overdue/stalled/notable
  created_at    timestamptz not null default now()
);
alter table public.daily_plans enable row level security;
drop policy if exists daily_plans_service on public.daily_plans;
create policy daily_plans_service on public.daily_plans for all to service_role using (true) with check (true);

-- ── Tasks (the daily checklist) ──────────────────────────────────────────────
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  plan_date     date not null,
  title         text not null,
  channel       text,                 -- ig | pinterest | email | b2b | ops | site
  task_type     text,                 -- sell | market | ops
  why           text,                 -- one line: why this matters today
  est_minutes   int,
  priority      int not null default 3,   -- 1 high .. 5 low
  status        text not null default 'open',  -- open | done | skipped
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists tasks_plan_idx on public.tasks (plan_date);
alter table public.tasks enable row level security;
drop policy if exists tasks_service on public.tasks;
create policy tasks_service on public.tasks for all to service_role using (true) with check (true);

-- ── Scored marketing images (one row per uploaded image) ─────────────────────
create table if not exists public.content_assets (
  id              uuid primary key default gen_random_uuid(),
  storage_path    text not null,      -- marketing-assets/...
  public_url      text,
  product         text,               -- 'Sauge box', 'sitz bath', ...
  platform        text,
  brand_fit       int,                -- 0..100
  craft           int,                -- 0..100
  composite       int,                -- 0..100
  color_on_brand  boolean,
  verdict         text,               -- one-line summary
  recommended_use text,               -- hero | secondary | reshoot
  strengths       jsonb,              -- string[]
  fixes           jsonb,              -- string[]
  created_at      timestamptz not null default now()
);
alter table public.content_assets enable row level security;
drop policy if exists content_assets_service on public.content_assets;
create policy content_assets_service on public.content_assets for all to service_role using (true) with check (true);

-- ── Suggested content posts (caption + image brief per planned post) ─────────
create table if not exists public.content_queue (
  id             uuid primary key default gen_random_uuid(),
  plan_date      date not null,
  platform       text not null,       -- instagram | pinterest | ...
  suggested_time text,                -- heuristic window, e.g. '11:00-13:00'
  caption_draft  text,
  image_brief    text,                -- concept to shoot/generate
  asset_id       uuid references public.content_assets(id) on delete set null,
  status         text not null default 'suggested',  -- suggested | posted | skipped
  posted_at      timestamptz,
  post_url       text,
  created_at     timestamptz not null default now()
);
create index if not exists content_queue_plan_idx on public.content_queue (plan_date);
alter table public.content_queue enable row level security;
drop policy if exists content_queue_service on public.content_queue;
create policy content_queue_service on public.content_queue for all to service_role using (true) with check (true);

-- ── Storage bucket for uploaded marketing images ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('marketing-assets', 'marketing-assets', true)
on conflict (id) do nothing;
