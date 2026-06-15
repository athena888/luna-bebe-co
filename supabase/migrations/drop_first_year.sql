-- Remove "The First Year" sub-line entirely. Paste into Supabase → SQL Editor → Run.
-- Safe to run once; irreversible (drops the tables and their data, incl. any
-- uploaded First Year products + scheduled shipments).
drop table if exists public.first_year_products cascade;
drop table if exists public.scheduled_shipments cascade;

-- product_type was added on public.products only for First Year; remove it too.
alter table public.products drop column if exists product_type;

-- Note: uploaded First Year photos/videos live in the storage bucket
-- "product-images" under the "first-year/" prefix. Delete that folder in
-- Supabase → Storage if you want the files gone as well.
