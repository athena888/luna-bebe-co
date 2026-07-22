-- Refund handling: widen the orders.status CHECK to allow 'cancelled' and
-- 'refunded' (the base schema only permitted through 'delivered'), and add the
-- increment RPCs the refund webhook uses to restock inventory — mirrors of the
-- decrement_inventory / decrement_variant functions used when an order is paid.

-- 1) Allow refunded/cancelled order states.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending','processing','shipped','delivered','cancelled','refunded'));

-- 2) Restock a single-product line (floor already at 0; only touches existing rows).
create or replace function increment_inventory(p_product_id text)
returns void as $$
begin
  update inventory set quantity = quantity + 1, updated_at = now()
  where product_id = p_product_id;
end; $$ language plpgsql security definer;

-- 3) Restock a specific variant.
create or replace function increment_variant(
  p_product_id text, p_color text, p_size text, p_style text default ''
) returns void as $$
begin
  update product_variants set quantity = quantity + 1, updated_at = now()
  where product_id = p_product_id and color = p_color and size = p_size and style = coalesce(p_style,'');
end; $$ language plpgsql security definer;

-- 4) The confirmation-email retry queues flow='transactional' rows, but §31
--    created email_events with check (flow in ('welcome','postpurchase','winback'))
--    — widen it or every retry insert fails the constraint.
alter table email_events drop constraint if exists email_events_flow_check;
alter table email_events add constraint email_events_flow_check
  check (flow in ('welcome','postpurchase','winback','transactional'));
