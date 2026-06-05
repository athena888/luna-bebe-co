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

-- Done.
