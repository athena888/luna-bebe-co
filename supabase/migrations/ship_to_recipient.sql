-- §32 in _RUN_ALL_PENDING.sql: gift shipping + reorder-point knobs.

-- Gift orders shipped directly to the recipient. When true:
-- shipping_address/recipient_name belong to the giftee, the buyer stays in
-- customer_*, and the packing slip hides prices.
alter table orders add column if not exists ship_to_recipient boolean not null default false;

-- Per-product reorder knobs (inventory row doubles as the knob store even for
-- variant products, whose stock lives in product_variants).
-- reorder_point = daily_rate (last 30d) × lead_time_days + safety_stock.
alter table inventory add column if not exists lead_time_days int not null default 14;
alter table inventory add column if not exists safety_stock int not null default 3;
