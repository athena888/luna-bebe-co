-- Editable homepage copy (perks bar, "What makes it special", reviews) so the
-- owner can change wording from the portal without code edits. One row per
-- content block, value is JSON. Writes go through admin-guarded service-role
-- routes, so RLS is public-read + service-role-write (same pattern as
-- site_images). Missing rows fall back to the in-code defaults.
create table if not exists site_content (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table site_content enable row level security;
drop policy if exists site_content_public_read on site_content;
create policy site_content_public_read on site_content for select using (true);
drop policy if exists site_content_service_write on site_content;
create policy site_content_service_write on site_content for all to service_role using (true) with check (true);
