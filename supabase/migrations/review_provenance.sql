-- §53 — Review provenance (Google review feed 2.4). See _RUN_ALL_PENDING.sql.
-- order_id ties a review to the purchase it came from (recovered from the
-- signed review-ask token, never user-typed). collection_method records HOW
-- the review arrived:
--   'post_fulfillment' — via the review-ask email link (token present)
--   'unsolicited'      — public product-page form, no token
--   'manual'           — entered by Emily in Portal → Reviews (genuine
--                        customer feedback received off-site; exported to
--                        Google as 'unsolicited')
-- NULL collection_method is treated as 'unsolicited' everywhere. Idempotent.

alter table reviews add column if not exists order_id text;
alter table reviews add column if not exists collection_method text
  check (collection_method in ('post_fulfillment', 'unsolicited', 'manual'));
