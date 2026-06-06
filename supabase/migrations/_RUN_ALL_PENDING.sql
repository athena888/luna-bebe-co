-- ============================================================================
-- PENDING MIGRATIONS — paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once (everything uses IF NOT EXISTS / OR REPLACE).
-- Covers: managed site images, gallery hover pin, product SEO fields,
-- order special note, bestseller/organic flags, and rate limiting.
-- ============================================================================

-- 1) Managed standalone image slots (Story, Build banners, Guide, gift card, OG)
create table if not exists site_images (
  id          uuid primary key default gen_random_uuid(),
  slot_key    text not null,
  bucket      text not null default 'home-images',
  path        text not null,
  public_url  text not null,
  alt_text    text not null default '',
  sort_order  int  not null default 0,
  updated_at  timestamptz not null default now()
);
create unique index if not exists site_images_slot_key_uniq on site_images (slot_key) where sort_order = 0;
create index if not exists site_images_slot_idx on site_images (slot_key, sort_order);
alter table site_images enable row level security;
drop policy if exists site_images_public_read on site_images;
create policy site_images_public_read on site_images for select using (true);
drop policy if exists site_images_service_write on site_images;
create policy site_images_service_write on site_images for all to service_role using (true) with check (true);

-- 2) Gallery hover pin (which image shows on card hover)
alter table product_gallery add column if not exists is_hover boolean not null default false;

-- 3) Product SEO fields (title tag, meta description, FAQ Q&As for FAQPage)
alter table products add column if not exists seo_title text;
alter table products add column if not exists seo_description text;
alter table products add column if not exists faqs jsonb; -- [{ "q": "...", "a": "..." }]

-- 4) Customer special request / note on an order
alter table orders add column if not exists special_note text;

-- 5) Curated Bestsellers + explicit organic flag
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists organic  boolean not null default false;

-- 6) Postgres-backed rate limiting
create table if not exists rate_limit_buckets (
  bucket_key   text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);
alter table rate_limit_buckets enable row level security;
drop policy if exists rate_limit_service on rate_limit_buckets;
create policy rate_limit_service on rate_limit_buckets
  for all to service_role using (true) with check (true);

create or replace function check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  insert into rate_limit_buckets (bucket_key, count, window_start)
    values (p_key, 1, now())
  on conflict (bucket_key) do update
    set
      count = case
        when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else rate_limit_buckets.count + 1
      end,
      window_start = case
        when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else rate_limit_buckets.window_start
      end
  returning count, window_start into v_count, v_start;

  return v_count <= p_limit;
end;
$$;

-- 7) Multiple photos per pre-built box (gallery)
alter table prebuilt_boxes add column if not exists images jsonb not null default '[]'::jsonb;

-- 8) Customizable printed card styles + per-order chosen style
create table if not exists card_styles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text not null,
  alt_text    text not null default '',
  size_label  text not null default '',
  word_limit  int  not null default 100,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table card_styles enable row level security;
drop policy if exists card_styles_public_read on card_styles;
create policy card_styles_public_read on card_styles for select using (true);
drop policy if exists card_styles_service_write on card_styles;
create policy card_styles_service_write on card_styles for all to service_role using (true) with check (true);

alter table orders add column if not exists card_style text;

-- 9) FIX variant saving: remove stale RPC overloads, keep one canonical set.
alter table product_variants add column if not exists style text not null default '';
alter table product_variants drop constraint if exists product_variants_product_id_color_size_key;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_pcss_key') then
    alter table product_variants add constraint product_variants_pcss_key unique (product_id, color, size, style);
  end if;
end $$;
drop function if exists set_product_variant(text,text,text,integer,text,integer);
drop function if exists set_product_variant(text,text,text,integer,text,integer,text);
drop function if exists set_product_variant(text,text,text,integer,text,integer,text,text);
drop function if exists upsert_product_variant(text,text,text,integer);
drop function if exists upsert_product_variant(text,text,text,integer,text,integer);
drop function if exists upsert_product_variant(text,text,text,integer,text,integer,text);
drop function if exists upsert_product_variant(text,text,text,integer,text,integer,text,text);
drop function if exists decrement_variant(text,text,text);
drop function if exists decrement_variant(text,text,text,text);
create function upsert_product_variant(
  p_product_id text, p_color text, p_size text, p_quantity integer,
  p_color_hex text default null, p_unit_price integer default null,
  p_color_code text default null, p_style text default ''
) returns void as $$
begin
  insert into product_variants (product_id, color, size, style, quantity, color_hex, unit_price, color_code)
  values (p_product_id, p_color, p_size, coalesce(p_style,''), p_quantity, p_color_hex, p_unit_price, p_color_code)
  on conflict (product_id, color, size, style) do update set
    quantity = product_variants.quantity + excluded.quantity,
    color_hex = coalesce(excluded.color_hex, product_variants.color_hex),
    unit_price = coalesce(excluded.unit_price, product_variants.unit_price),
    color_code = coalesce(excluded.color_code, product_variants.color_code),
    updated_at = now();
end; $$ language plpgsql security definer;
create function set_product_variant(
  p_product_id text, p_color text, p_size text, p_quantity integer,
  p_color_hex text default null, p_unit_price integer default null,
  p_color_code text default null, p_style text default ''
) returns void as $$
begin
  insert into product_variants (product_id, color, size, style, quantity, color_hex, unit_price, color_code)
  values (p_product_id, p_color, p_size, coalesce(p_style,''), p_quantity, p_color_hex, p_unit_price, p_color_code)
  on conflict (product_id, color, size, style) do update set
    quantity = excluded.quantity,
    color_hex = coalesce(excluded.color_hex, product_variants.color_hex),
    unit_price = coalesce(excluded.unit_price, product_variants.unit_price),
    color_code = coalesce(excluded.color_code, product_variants.color_code),
    updated_at = now();
end; $$ language plpgsql security definer;
create function decrement_variant(
  p_product_id text, p_color text, p_size text, p_style text default ''
) returns void as $$
begin
  update product_variants set quantity = greatest(0, quantity - 1), updated_at = now()
  where product_id = p_product_id and color = p_color and size = p_size and style = coalesce(p_style,'');
end; $$ language plpgsql security definer;

-- 10) Ensure the single-product stock table exists (it only lived in the
-- initial schema.sql, so migration-only databases were missing it — which made
-- the "Stock" number on non-variant products silently fail to save).
create table if not exists inventory (
  product_id text primary key,
  quantity   integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table inventory enable row level security;
drop policy if exists inventory_service_all on inventory;
create policy inventory_service_all on inventory for all to service_role using (true) with check (true);

-- Done.
