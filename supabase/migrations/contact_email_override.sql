-- Per-recipient cold-email override ({subject, body}). When set, this exact email
-- is used for that contact instead of the track template (merge fields + the
-- unique {{code}} still resolve at send). Editable templates themselves live in
-- site_content under key 'outreach.templates'. Mirrored as item 25 in
-- _RUN_ALL_PENDING.sql.
alter table public.contacts add column if not exists email_override jsonb;
