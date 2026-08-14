-- 50) Lookbook tiers now source from the LIVE catalog (catalog_products ×
--     catalog_variants — one lookbook row per active visible variant/SKU).
--     This overlay stores only the corporate-specific fields per SKU; names,
--     retail prices, and order always mirror the storefront. Unset corporate
--     prices default in code to ~5/10/15% off retail. The legacy catalog_tiers
--     table stays as a read fallback until §46 (catalog restructure) is live.
--     Idempotent.
create table if not exists public.lookbook_tier_overlay (
  product_slug       text not null,
  variant_key        text not null,
  corporate_price_10 int,
  corporate_price_25 int,
  corporate_price_50 int,
  description        text,               -- one-liner fallback when AI copy is empty
  updated_at         timestamptz not null default now(),
  primary key (product_slug, variant_key)
);
alter table public.lookbook_tier_overlay enable row level security;
drop policy if exists lookbook_tier_overlay_service on public.lookbook_tier_overlay;
create policy lookbook_tier_overlay_service on public.lookbook_tier_overlay for all to service_role using (true) with check (true);
