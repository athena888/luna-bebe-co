-- §43 in _RUN_ALL_PENDING.sql — post-launch quartet backends.
-- 43) Post-launch quartet backends (collision-probed 2026-07-26: all clear).
--     Build 17 recipient capture + Build 9 UGC rights + Build 10 repeat
--     occasions. (Also in supabase/migrations/quartet.sql)
alter table orders add column if not exists recipient_email text;
alter table orders add column if not exists gift_note_sent_at timestamptz;

create table if not exists public.ugc_assets (
  id                uuid primary key default gen_random_uuid(),
  contact_email     text not null,
  order_id          uuid,
  storage_path      text not null,
  media_type        text not null check (media_type in ('image','video')),
  consent_marketing boolean not null default false,
  consent_text      text not null,           -- verbatim text shown at capture, auditable
  tags              text[] not null default '{}',
  status            text not null default 'new' check (status in ('new','approved','rejected','featured')),
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);
alter table public.ugc_assets enable row level security;
drop policy if exists ugc_assets_service_all on public.ugc_assets;
create policy ugc_assets_service_all on public.ugc_assets for all to service_role using (true) with check (true);

create table if not exists public.gift_occasions (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  recipient_label text,
  occasion_type   text,
  occasion_date   date,
  source_order    uuid,
  created_at      timestamptz not null default now()
);
create index if not exists gift_occasions_email_idx on public.gift_occasions (email);
alter table public.gift_occasions enable row level security;
drop policy if exists gift_occasions_service_all on public.gift_occasions;
create policy gift_occasions_service_all on public.gift_occasions for all to service_role using (true) with check (true);

-- Private bucket for customer-supplied media (size caps enforced at upload).
insert into storage.buckets (id, name, public) values ('ugc', 'ugc', false)
on conflict (id) do nothing;

