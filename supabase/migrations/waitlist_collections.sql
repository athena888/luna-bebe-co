-- §42 in _RUN_ALL_PENDING.sql — Build 12 waitlist/preorder + collections.
-- 42) Waitlist/preorder (Build 12) + shop collections (Collections PDF).
--     NOTE: named product_waitlist / shop_collections because plain waitlist
--     (launch email list) and collections (seasonal boxes) already exist.
--     (Also in supabase/migrations/waitlist_collections.sql)
create table if not exists public.product_waitlist (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  product_id       text not null,
  segment          text,
  created_at       timestamptz not null default now(),
  notified_at      timestamptz,
  converted_order  uuid,
  unique (email, product_id)
);
create index if not exists product_waitlist_product_idx on public.product_waitlist (product_id);
alter table public.product_waitlist enable row level security;
drop policy if exists product_waitlist_service_all on public.product_waitlist;
create policy product_waitlist_service_all on public.product_waitlist for all to service_role using (true) with check (true);

alter table products add column if not exists preorder boolean not null default false;
alter table products add column if not exists preorder_note text;

create table if not exists public.shop_collections (
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
create table if not exists public.shop_collection_products (
  collection_id uuid not null references shop_collections(id) on delete cascade,
  product_id    text not null,
  sort_order    int not null default 0,
  primary key (collection_id, product_id)
);
alter table public.shop_collections enable row level security;
alter table public.shop_collection_products enable row level security;
drop policy if exists shop_collections_service_all on public.shop_collections;
create policy shop_collections_service_all on public.shop_collections for all to service_role using (true) with check (true);
drop policy if exists shop_collection_products_service_all on public.shop_collection_products;
create policy shop_collection_products_service_all on public.shop_collection_products for all to service_role using (true) with check (true);

-- Restock notifications ride the email_events queue.
alter table email_events drop constraint if exists email_events_flow_check;
alter table email_events add constraint email_events_flow_check
  check (flow in ('welcome','postpurchase','winback','transactional','occasion','cart','campaign','restock'));

-- Seed collections (inactive until copy approval; filters use product category).
insert into public.shop_collections (slug, title, h1, type, filter, segment_hint, sort_order) values
  ('for-mama',          'For Mama',           'Gifts for Mama',                    'recipient', '{"categories":["mom","bath"]}',                 'parent_to_be',    1),
  ('for-baby',          'For Baby',           'Gifts for Baby',                    'recipient', '{"categories":["swaddle","garment","keepsake"]}', null,            2),
  ('for-both',          'For Mama & Baby',    'Gifts for Mama & Baby',             'recipient', '{"categories":["mom","bath","swaddle","garment","keepsake"]}', null, 3),
  ('baby-shower',       'Baby Shower Gifts',  'Baby Shower Gifts',                 'occasion',  '{"categories":["swaddle","garment","keepsake","bath"]}', 'friend_coworker', 4),
  ('new-arrival',       'New Arrival Gifts',  'Gifts for the New Arrival',         'occasion',  '{"categories":["swaddle","garment","keepsake"]}', null,            5),
  ('corporate-gifting', 'Corporate Gifting',  'Corporate & Team Baby Gifts',       'occasion',  '{"categories":["swaddle","garment","keepsake","bath","mom"]}', 'corporate', 6)
on conflict (slug) do nothing;

