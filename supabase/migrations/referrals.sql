-- Referral loop (Build 6) — §38 in _RUN_ALL_PENDING.sql.
-- One give-15/get-15 referral code per paid order. Minted at checkout
-- completion (flag-gated by REFERRALS_ACTIVE); redemption recorded when a
-- later order pays with the code; referrer's $15 thank-you code tracked here.
create table if not exists public.referrals (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null unique references orders(id) on delete cascade,
  referrer_email      text not null,
  code                text not null unique,          -- human code on the insert/QR (e.g. PL-4KX9TQ)
  promo_id            text not null,                 -- Stripe promotion code id (friend's $15 off)
  redeemed_by_order   uuid references orders(id),
  redeemed_at         timestamptz,
  reward_promo_id     text,                          -- referrer's $15 thank-you code, minted on redemption
  reward_code         text,
  reward_sent_at      timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists referrals_promo_idx on public.referrals (promo_id);
create index if not exists referrals_referrer_idx on public.referrals (referrer_email);
alter table public.referrals enable row level security;
drop policy if exists referrals_service_all on public.referrals;
create policy referrals_service_all on public.referrals for all to service_role using (true) with check (true);
