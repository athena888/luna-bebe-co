-- Lightweight, persistent rate limiting backed by Postgres.
-- One row per (key, window). check_rate_limit() atomically increments and
-- returns TRUE when the request is allowed, FALSE when the limit is exceeded.

create table if not exists rate_limit_buckets (
  bucket_key   text primary key,          -- e.g. "ai_letter:1.2.3.4"
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

-- Service role only (called from server routes via supabaseAdmin)
alter table rate_limit_buckets enable row level security;
drop policy if exists rate_limit_service on rate_limit_buckets;
create policy rate_limit_service on rate_limit_buckets
  for all to service_role using (true) with check (true);

create or replace function check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_count integer;
  v_start timestamptz;
begin
  insert into rate_limit_buckets (bucket_key, count, window_start)
    values (p_key, 1, now())
  on conflict (bucket_key) do update
    set
      -- reset the window if it has expired, otherwise increment
      count = case
        when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else rate_limit_buckets.count + 1
      end,
      window_start = case
        when rate_limit_buckets.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else rate_limit_buckets.window_start
      end
  returning count, window_start into v_count, v_start;

  return v_count <= p_limit;
end;
$$;
