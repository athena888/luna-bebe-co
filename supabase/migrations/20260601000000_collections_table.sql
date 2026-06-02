-- Collections table for "Shop by Occasion" categories
create table if not exists collections (
  id text primary key,
  label text not null,
  sub text not null,
  home_image_slot text not null,
  product_ids text[] not null default '{}',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

alter table collections enable row level security;

create policy "Public can read active collections"
  on collections for select
  using (active);

create policy "Admins can manage collections"
  on collections for all
  using (auth.jwt() ->> 'sub' is not null);

-- Seed with defaults
insert into collections (id, label, sub, home_image_slot, product_ids, sort_order, active) values
  ('newborn', 'Newborn Gifts', 'Swaddles, garments & keepsakes', 'newborn', array['swaddle-muslin', 'swaddle-bamboo', 'garment-kimono', 'garment-gown', 'bath-botanical', 'keepsake-bunny', 'keepsake-rattle'], 0, true),
  ('mama', 'For Mama', 'Because she deserves to be celebrated', 'mama', array['mom-lavender', 'mom-silk', 'mom-tea', 'mom-journal', 'mom-herbal'], 1, true),
  ('bundle', 'Mama & Baby Bundle', 'A gift for two hearts at once', 'bundle', array['swaddle-bamboo', 'garment-kimono', 'bath-botanical', 'mom-lavender', 'keepsake-bunny'], 2, true),
  ('custom', 'Custom Box', 'Build it your way, item by item', 'custom', array[]::text[], 3, true)
on conflict (id) do nothing;
