-- Estimated $ cost per marketing task (cents). 0 = organic/free (DM, post, SEO);
-- a number = ad spend or paid tooling. Lets the cockpit total the day's spend.
-- Also mirrored as item 23 in _RUN_ALL_PENDING.sql.
alter table public.tasks add column if not exists est_cost_cents int;
