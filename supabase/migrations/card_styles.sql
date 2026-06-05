-- Customizable printed greeting cards. The owner uploads a few card styles
-- (artwork + physical size + a word limit); the customer picks one, writes a
-- message within the limit, and we print it. Replaces the "handwritten letter".
create table if not exists card_styles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image_url   text not null,
  alt_text    text not null default '',
  size_label  text not null default '',   -- e.g. 'A6 — 4.1 × 5.8 in (folded)'
  word_limit  int  not null default 100,
  sort_order  int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table card_styles enable row level security;
drop policy if exists card_styles_public_read on card_styles;
create policy card_styles_public_read on card_styles for select using (true);
drop policy if exists card_styles_service_write on card_styles;
create policy card_styles_service_write on card_styles for all to service_role using (true) with check (true);

-- Which card style the customer chose for an order (free-text label snapshot).
alter table orders add column if not exists card_style text;
