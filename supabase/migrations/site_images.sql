-- Manage every standalone image slot from the admin UI (hero, story, build
-- banners, box heros, etc.) without code edits. Adapted to this repo's auth:
-- writes happen through admin-guarded server routes using the service role
-- (not Supabase JWT roles), so RLS is public-read + service-role-write.
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

-- Singleton slots are unique by slot_key; galleries use multiple rows.
create unique index if not exists site_images_slot_key_uniq on site_images (slot_key) where sort_order = 0;
create index if not exists site_images_slot_idx on site_images (slot_key, sort_order);

alter table site_images enable row level security;
drop policy if exists site_images_public_read on site_images;
create policy site_images_public_read on site_images for select using (true);
drop policy if exists site_images_service_write on site_images;
create policy site_images_service_write on site_images for all to service_role using (true) with check (true);
