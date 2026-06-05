-- Multiple photos per pre-built box (gallery on the box detail page).
-- The existing single `image` column stays as the cover (kept in sync with
-- images[0]); `images` holds the ordered gallery as a JSON array of URLs.
alter table prebuilt_boxes add column if not exists images jsonb not null default '[]'::jsonb;
