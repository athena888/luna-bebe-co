-- Scheduled outreach campaigns — send a whole enrolled list at a chosen time.
-- A frequent cron fires each campaign when scheduled_at arrives, honoring the
-- suppression / MX / merge-field / cap guards. Resumable across ticks (a campaign
-- stays 'sending' until no due recipients remain, then flips to 'sent'). Also
-- mirrored as item 24 in _RUN_ALL_PENDING.sql.
create table if not exists public.scheduled_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  scheduled_at  timestamptz not null,
  track_filter  text,
  template_key  text not null,
  per_run_cap   int,
  status        text not null default 'scheduled',
  sent_count    int not null default 0,
  skipped_count int not null default 0,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index if not exists scheduled_campaigns_due_idx on public.scheduled_campaigns (status, scheduled_at);
alter table public.scheduled_campaigns enable row level security;
drop policy if exists scheduled_campaigns_service on public.scheduled_campaigns;
create policy scheduled_campaigns_service on public.scheduled_campaigns for all to service_role using (true) with check (true);
