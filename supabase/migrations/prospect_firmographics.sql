-- §55 — Firmographics for ICP scoring (Emily 2026-08-17).
-- The outreach list could not be scored because the two fields that decide
-- the score were never stored:
--   • company size — no column existed at all
--   • industry     — `prospects.industry_key` EXISTS but is null on all 389
--                    rows, so it is reused here rather than duplicated.
-- employee_count is a plain integer (nulls mean "unknown" → the enrichment
-- bucket). Idempotent.

alter table prospects add column if not exists employee_count int;

-- Where the number came from, so a guess is never mistaken for a fact:
--   'website' | 'linkedin' | 'manual' | 'inferred'
alter table prospects add column if not exists employee_count_source text
  check (employee_count_source in ('website','linkedin','manual','inferred'));

create index if not exists prospects_employee_count_idx on prospects (employee_count)
  where employee_count is not null;
create index if not exists prospects_industry_key_idx on prospects (industry_key)
  where industry_key is not null;
