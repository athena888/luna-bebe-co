-- 28) Corporate lookbook builder — brand image library (private bucket,
--     AI-tagged), editable catalog tiers, and versioned published PDFs. The
--     stable public route /corporate/lookbook.pdf 302s to a signed URL of the
--     current version, so links in old emails never rot. Idempotent.

-- Uploaded brand photos (Supabase Storage bucket 'brand-assets', PRIVATE —
-- everything is served through short-lived signed URLs).
create table if not exists public.brand_images (
  id           uuid primary key default gen_random_uuid(),
  storage_path text not null,
  kind         text,                    -- hero | tier | detail | lifestyle | logo
  tier         text,                    -- detected/assigned catalog tier name, if any
  tags         jsonb not null default '[]'::jsonb,
  off_palette  boolean not null default false,   -- soft warning only, never blocking
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
alter table public.brand_images enable row level security;
drop policy if exists brand_images_service on public.brand_images;
create policy brand_images_service on public.brand_images for all to service_role using (true) with check (true);

-- Catalog tiers, editable inline in the builder (prices in whole USD).
create table if not exists public.catalog_tiers (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  price              int not null,
  corporate_price_10 int,
  corporate_price_25 int,
  corporate_price_50 int,
  description        text,
  sort               int not null default 0
);
alter table public.catalog_tiers enable row level security;
drop policy if exists catalog_tiers_service on public.catalog_tiers;
create policy catalog_tiers_service on public.catalog_tiers for all to service_role using (true) with check (true);

-- Published lookbook versions. Publishing flips every other row is_current=false;
-- old versions stay downloadable in the portal forever.
create table if not exists public.lookbook_versions (
  id           uuid primary key default gen_random_uuid(),
  version      int not null unique,
  storage_path text not null,
  copy         jsonb not null default '{}'::jsonb,   -- all builder copy fields as published
  image_map    jsonb not null default '{}'::jsonb,   -- slot → brand_images.id
  is_current   boolean not null default false,
  published_at timestamptz not null default now()
);
create index if not exists lookbook_versions_current_idx on public.lookbook_versions (is_current);
alter table public.lookbook_versions enable row level security;
drop policy if exists lookbook_versions_service on public.lookbook_versions;
create policy lookbook_versions_service on public.lookbook_versions for all to service_role using (true) with check (true);

-- PRIVATE bucket (unlike home-images / marketing-assets / product-images):
-- lookbook PDFs + brand photos are only reachable via signed URLs.
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

-- Seed the six tiers (edit inline in Portal → Lookbook → Builder).
insert into public.catalog_tiers (name, price, sort) values
  ('Petit Nuage', 85, 1),
  ('Douce Maman', 95, 2),
  ('Signature Lavande', 125, 3),
  ('Mère et Bébé', 140, 4),
  ('Maison', 175, 5),
  ('L''Heure Dorée', 200, 6)
on conflict (name) do nothing;
