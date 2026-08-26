-- Two-mailbox cold sending: per-mailbox attribution and daily usage.
--
-- The `sends` table already records gmail_message_id, gmail_thread_id,
-- recipient_email, delivery_state, bounced_at, bounce_reason and replied_at.
-- The one thing it could not answer was WHICH MAILBOX sent a message, which is
-- exactly what a per-mailbox daily cap has to count. Everything below is
-- additive; no existing column changes type or meaning.
--
-- Run ONLY these statements. Do not re-run the migrations directory.

-- 1. Which mailbox sent this message. NULL on historical rows (single-sender
--    era) and on rows that never left the queue.
ALTER TABLE sends ADD COLUMN IF NOT EXISTS sender_email text;

-- 2. The Pacific calendar day the send belongs to, stamped at send time.
--    Derived rather than computed at read time on purpose: the daily counter
--    must not depend on the reader's timezone, and a stored key keeps the
--    counting query a plain equality test against an index.
ALTER TABLE sends ADD COLUMN IF NOT EXISTS sent_day_pt date;

-- 3. The counter query: sends for one mailbox on one PT day.
CREATE INDEX IF NOT EXISTS sends_mailbox_day_idx
  ON sends (sender_email, sent_day_pt)
  WHERE status = 'sent';

-- 4. Person-level idempotency, enforced by the database rather than by hope.
--    One SENT row per recipient address per campaign day: a cron double-fire,
--    a Vercel retry or two concurrent workers cannot produce a second send.
--    Partial (status='sent') so queued/failed retries are still allowed.
CREATE UNIQUE INDEX IF NOT EXISTS sends_recipient_day_uidx
  ON sends (lower(recipient_email), sent_day_pt)
  WHERE status = 'sent' AND recipient_email IS NOT NULL;

-- 5. Company-level state. Which companies have been approached, and which have
--    replied or opted out — the questions the sender must answer BEFORE
--    emailing a second contact at the same employer.
CREATE TABLE IF NOT EXISTS company_outreach_state (
  company_key   text PRIMARY KEY,               -- domain, else normalised name
  first_contact_email text,
  first_sent_at timestamptz,
  replied_at    timestamptz,
  opted_out_at  timestamptz,
  opt_out_reason text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_outreach_replied_idx
  ON company_outreach_state (replied_at) WHERE replied_at IS NOT NULL;

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'sends' AND column_name IN ('sender_email','sent_day_pt');
--   SELECT indexname FROM pg_indexes WHERE tablename IN ('sends','company_outreach_state');
--
-- Rollback:
--   DROP INDEX IF EXISTS sends_recipient_day_uidx;
--   DROP INDEX IF EXISTS sends_mailbox_day_idx;
--   DROP TABLE IF EXISTS company_outreach_state;
--   ALTER TABLE sends DROP COLUMN IF EXISTS sent_day_pt;
--   ALTER TABLE sends DROP COLUMN IF EXISTS sender_email;
