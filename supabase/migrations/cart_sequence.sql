-- Cart sequence (Build 1 upgrade) + campaigns (Build 8) — §40 in
-- _RUN_ALL_PENDING.sql. Allows the 'cart' flow (second abandoned-cart touch,
-- D+3 via the email_events queue) and the 'campaign' flow (portal one-off
-- sends, logged per-recipient with campaign attribution).
alter table email_events drop constraint if exists email_events_flow_check;
alter table email_events add constraint email_events_flow_check
  check (flow in ('welcome','postpurchase','winback','transactional','occasion','cart','campaign'));
