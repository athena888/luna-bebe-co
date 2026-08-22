-- prospect_signals: the UNIQUE constraint the enrichment writer has always
-- assumed but the table never had.
--
-- lib/outreach/enrich.ts writes every gathered buying-intent signal with
--   .upsert(signals, { onConflict: 'domain,signal_type,source_url' })
-- and Postgres answers
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--    specification"
-- so the whole batch throws and NOTHING is saved. Verified 2026-08-22:
-- prospect_signals held exactly 971 rows before and after a run that
-- discovered 100 companies and enriched 6 — not one signal persisted.
--
-- The cost of that is the outreach machine's single largest blocker: 218
-- prospects disqualified for "No meaningful buying-intent signal found",
-- because the evidence is researched, thrown away, and then scored as absent.
--
-- Safe to apply as-is (checked 2026-08-22 against production):
--   * 971 rows, 0 duplicates on (domain, signal_type, source_url)
--   * 0 rows with a NULL source_url, so NULL-vs-NULL non-collision is moot
--     today. A plain UNIQUE index does not constrain NULLs, so if source_url
--     ever becomes nullable in practice, revisit with NULLS NOT DISTINCT
--     (Postgres 15+).
--
-- Run ONLY this statement. Do not re-run the whole migrations directory.

CREATE UNIQUE INDEX IF NOT EXISTS prospect_signals_domain_type_source_uidx
  ON prospect_signals (domain, signal_type, source_url);

-- Verify (expect one row, indexdef matching the above):
--   SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename = 'prospect_signals'
--      AND indexname = 'prospect_signals_domain_type_source_uidx';
--
-- Rollback if ever needed:
--   DROP INDEX IF EXISTS prospect_signals_domain_type_source_uidx;
