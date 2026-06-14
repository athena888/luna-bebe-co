-- Customer-chosen message placement on the printed inside card. Stored as
-- {x,y,w,align} percentages (same shape as card_styles.meta.textZone). Null means
-- fall back to the card style's default placement. Also mirrored as item 22 in
-- _RUN_ALL_PENDING.sql.
alter table public.orders add column if not exists letter_zone jsonb;
