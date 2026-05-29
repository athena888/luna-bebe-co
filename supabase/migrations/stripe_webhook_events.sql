-- ============================================================
-- STRIPE WEBHOOK EVENT LOG
-- ============================================================
-- Logs every Stripe webhook event we receive. The event.id is the
-- primary key, which gives us idempotency for free — any duplicate
-- delivery from Stripe collides and is short-circuited.
--
-- processed=false rows are the "dead letter queue": retryable via
-- the portal or a future cron.
-- ============================================================

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed
  ON stripe_webhook_events (processed, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type
  ON stripe_webhook_events (type, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_failed
  ON stripe_webhook_events (received_at DESC) WHERE processed = FALSE AND last_error IS NOT NULL;

ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to stripe_webhook_events"
  ON stripe_webhook_events FOR ALL TO service_role USING (true) WITH CHECK (true);
