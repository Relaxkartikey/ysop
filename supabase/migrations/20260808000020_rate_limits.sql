-- Fixed-window rate limiter, atomic at the DB level so it's correct across every
-- serverless instance (an in-memory counter wouldn't be, on Vercel).
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count integer not null default 0
);

-- No RLS policies: only ever touched via the service-role client from rate_limit_check().
alter table public.rate_limits enable row level security;

create or replace function public.rate_limit_check(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count integer;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
  set count = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limits.count + 1
      end,
      window_start = case
        when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else public.rate_limits.window_start
      end
  returning window_start, count into v_window_start, v_count;

  return v_count <= p_limit;
end;
$$;
