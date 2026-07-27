-- §44 in _RUN_ALL_PENDING.sql — Spanish locale infrastructure.
-- 44) Spanish locale (es-US) infrastructure — collision-probed 2026-07-26.
--     Translations layer + locale on contacts/orders (drives email routing).
--     (Also in supabase/migrations/spanish_locale.sql)
create table if not exists public.translations (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,        -- 'product' | 'collection' | 'site' | 'ui'
  entity_id   text not null,        -- product id, collection slug, content key
  locale      text not null default 'es',
  field       text not null,        -- 'name' | 'description' | 'intro_copy' | ...
  value       text not null,
  approved    boolean not null default false,   -- friend's review pass
  updated_at  timestamptz not null default now(),
  unique (entity_type, entity_id, locale, field)
);
alter table public.translations enable row level security;
drop policy if exists translations_service_all on public.translations;
create policy translations_service_all on public.translations for all to service_role using (true) with check (true);

alter table marketing_contacts add column if not exists locale text not null default 'en';
alter table orders add column if not exists locale text not null default 'en';

