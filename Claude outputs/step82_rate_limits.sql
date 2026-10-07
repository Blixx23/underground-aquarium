-- Step 82: limits on repeated attempts (rate limits).
-- Counts how often one member (or one network address, when signed out) uses a
-- form or tool in a short window, so password-style guessing, spam and runaway
-- scripts get a polite "slow down" instead of hammering the site.
-- Only the site's server can use it. Safe to run more than once.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

comment on table public.rate_limits is
  'Short-lived counters for rate limits: key is "<action>:<user id or ip>", one row per time window. Rows older than a day are cleared automatically.';

-- Nobody reads or writes this table from the browser.
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Count one use and say whether it's still within the limit.
create or replace function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into n;

  -- Now and then, clear out old windows so the table stays tiny.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return n <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- Check: should return true, then the table has one row for the test key.
select public.hit_rate_limit('test:step82', 5, 60) as allowed;
delete from public.rate_limits where key = 'test:step82';
