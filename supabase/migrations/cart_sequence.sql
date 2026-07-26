-- Cart sequence (Build 1 upgrade) — §40 in _RUN_ALL_PENDING.sql.
-- Allow the 'cart' flow so the second abandoned-cart touch (D+3 after the
-- first) can ride the email_events queue with its opt-out/hold machinery.
alter table email_events drop constraint if exists email_events_flow_check;
alter table email_events add constraint email_events_flow_check
  check (flow in ('welcome','postpurchase','winback','transactional','occasion','cart'));
