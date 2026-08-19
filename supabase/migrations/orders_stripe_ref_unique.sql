-- ═══════════════════════════════════════════════════════════════════════
-- NOT APPLIED — REVIEW BEFORE RUNNING (analytics repair, 2026-08-19).
-- Run manually in the Supabase SQL editor after review; nothing in the app
-- depends on it existing. Non-destructive: adds one index, changes no data.
-- ═══════════════════════════════════════════════════════════════════════
--
-- Database-level order idempotency, belt-and-braces on top of the app-level
-- guards (webhook event dedup in stripe_webhook_events + the pending→
-- processing transition gate in lib/stripe-webhook-handler.ts).
--
-- orders.stripe_payment_intent holds the Stripe Checkout Session id from
-- creation (app/api/checkout/session/route.ts) until the webhook overwrites
-- it with the payment-intent id; both are unique per order, so no existing
-- rows can conflict. The partial predicate skips NULL/'' so legacy rows and
-- rows created before the session-id backfill never block.
--
-- Replaces the plain lookup index (the unique index serves the same lookups).

DROP INDEX IF EXISTS idx_orders_stripe_payment_intent;

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_key
  ON orders (stripe_payment_intent)
  WHERE stripe_payment_intent IS NOT NULL AND stripe_payment_intent <> '';
