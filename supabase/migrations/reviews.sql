-- Customer product reviews. Submitted from the product page (POST /api/reviews,
-- always approved=false); moderated in Portal → Reviews; storefront reads
-- approved rows only. All access via service role.
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references products(id) on delete cascade,
  customer_name text not null,
  rating        int  not null check (rating between 1 and 5),
  body          text not null,
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists reviews_product_approved_idx on public.reviews (product_id, approved, created_at desc);
create index if not exists reviews_pending_idx on public.reviews (approved, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists reviews_service_all on public.reviews;
create policy reviews_service_all on public.reviews for all to service_role using (true) with check (true);
