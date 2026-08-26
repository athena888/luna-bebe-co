-- Founding Families launch promotion — sale pricing on catalog variants.
--
-- Additive and nullable, so it is safe to run against the live catalog: every
-- existing read keeps working and a NULL sale_price simply means "no sale".
--
-- The RUNTIME does not depend on this migration. lib/promo.ts holds the tier
-- table (6500→4900, 9500→6800, 12500→8800, 16500→11500) and resolves prices
-- deterministically from the regular price, so the site, the feeds and Stripe
-- behave identically whether or not these columns exist. They exist so the
-- promotion becomes editable data later — a portal price editor, a second
-- promotion, per-variant exceptions — rather than a constant in a deploy.

alter table public.catalog_variants add column if not exists sale_price  integer;  -- cents; null = no sale
alter table public.catalog_variants add column if not exists sale_start  timestamptz;
alter table public.catalog_variants add column if not exists sale_end    timestamptz;

comment on column public.catalog_variants.sale_price is
  'Promo price in cents. NULL = not on sale. Must be strictly below price.';

-- Guard the invariant Merchant Center enforces anyway: a "sale" that is not
-- below list price is rejected by Google and is a lie to the customer.
alter table public.catalog_variants drop constraint if exists catalog_variants_sale_below_price;
alter table public.catalog_variants add constraint catalog_variants_sale_below_price
  check (sale_price is null or (sale_price > 0 and sale_price < price));

-- Populate the four Founding Families tiers. Boxes only: this touches
-- catalog_variants, so standalone items (blankets, dolls) are untouched by
-- construction rather than by an exclusion list someone has to maintain.
update public.catalog_variants set
  sale_price = case price
    when 6500  then 5500
    when 9500  then 8000
    when 12500 then 10500
    when 16500 then 14000
  end,
  sale_start = timestamptz '2026-08-25 00:00:00+00',
  sale_end   = timestamptz '2026-09-30 23:59:59+00'
where price in (6500, 9500, 12500, 16500);

-- Verify: expect one row per promo-tier variant, each sale_price below price.
-- select key, price, sale_price, sale_start, sale_end
--   from public.catalog_variants where sale_price is not null order by price;

-- Attribution for the IG/RedNote push. FOUNDING30 gives no extra discount —
-- sale pricing is already on every box — so this column exists purely to
-- answer "did the code drive the order?" after the fact.
alter table public.orders add column if not exists promo_code text;
create index if not exists orders_promo_code_idx on public.orders (promo_code) where promo_code is not null;
