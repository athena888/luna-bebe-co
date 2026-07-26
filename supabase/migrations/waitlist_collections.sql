-- §42 in _RUN_ALL_PENDING.sql — Build 12 waitlist/preorder + collections.
-- 42) Waitlist/preorder (Build 12) + collections (Collections PDF).
--     (Also in supabase/migrations/waitlist_collections.sql)
create table if not exists public.waitlist (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  product_id       text not null,
  segment          text,
  created_at       timestamptz not null default now(),
  notified_at      timestamptz,
  converted_order  uuid,
  unique (email, product_id)
);
create index if not exists waitlist_product_idx on public.waitlist (product_id);
alter table public.waitlist enable row level security;
drop policy if exists waitlist_service_all on public.waitlist;
create policy waitlist_service_all on public.waitlist for all to service_role using (true) with check (true);

alter table products add column if not exists preorder boolean not null default false;
alter table products add column if not exists preorder_note text;

create table if not exists public.collections (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  h1               text,
  intro_copy       text,
  meta_title       text,
  meta_description text,
  hero_image       text,
  sort_order       int not null default 0,
  type             text not null check (type in ('recipient','occasion','format')),
  filter           jsonb,
  min_products     int not null default 3,
  active           boolean not null default false,
  segment_hint     text,
  created_at       timestamptz not null default now()
);
create table if not exists public.product_collections (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id    text not null,
  sort_order    int not null default 0,
  primary key (collection_id, product_id)
);
alter table public.collections enable row level security;
alter table public.product_collections enable row level security;
drop policy if exists collections_service_all on public.collections;
create policy collections_service_all on public.collections for all to service_role using (true) with check (true);
drop policy if exists product_collections_service_all on public.product_collections;
create policy product_collections_service_all on public.product_collections for all to service_role using (true) with check (true);

-- Restock notifications ride the email_events queue.
alter table email_events drop constraint if exists email_events_flow_check;
alter table email_events add constraint email_events_flow_check
  check (flow in ('welcome','postpurchase','winback','transactional','occasion','cart','campaign','restock'));

-- Seed collections (inactive until copy approval; filters use product category).
insert into public.collections (slug, title, h1, type, filter, segment_hint, sort_order) values
  ('for-mama',          'For Mama',           'Gifts for Mama',                    'recipient', '{"categories":["mom","bath"]}',                 'parent_to_be',    1),
  ('for-baby',          'For Baby',           'Gifts for Baby',                    'recipient', '{"categories":["swaddle","garment","keepsake"]}', null,            2),
  ('for-both',          'For Mama & Baby',    'Gifts for Mama & Baby',             'recipient', '{"categories":["mom","bath","swaddle","garment","keepsake"]}', null, 3),
  ('baby-shower',       'Baby Shower Gifts',  'Baby Shower Gifts',                 'occasion',  '{"categories":["swaddle","garment","keepsake","bath"]}', 'friend_coworker', 4),
  ('new-arrival',       'New Arrival Gifts',  'Gifts for the New Arrival',         'occasion',  '{"categories":["swaddle","garment","keepsake"]}', null,            5),
  ('corporate-gifting', 'Corporate Gifting',  'Corporate & Team Baby Gifts',       'occasion',  '{"categories":["swaddle","garment","keepsake","bath","mom"]}', 'corporate', 6)
on conflict (slug) do nothing;

