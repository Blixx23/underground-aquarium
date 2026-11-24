-- Launch badges: a provisional set of awards issued mid-quarter so shops
-- wear their badge right away. When the quarter's real lock-in runs, any
-- provisional rows for that quarter are replaced by the final results.
alter table public.top_shop_awards add column if not exists provisional boolean not null default false;

create or replace function public.award_top_shops(p_quarter text, p_provisional boolean default false)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  y int := split_part(p_quarter, '-Q', 1)::int;
  q int := split_part(p_quarter, '-Q', 2)::int;
  d_from date := make_date(y, (q - 1) * 3 + 1, 1);
  d_to date := (make_date(y, (q - 1) * 3 + 1, 1) + interval '3 months')::date;
  n int;
begin
  if q < 1 or q > 4 then raise exception 'Quarter must look like 2026-Q4'; end if;
  -- Final results already locked: never touch them.
  if exists (select 1 from top_shop_awards where quarter = p_quarter and not provisional) then return 0; end if;
  -- Launch badges for this quarter make way for the final results (or a fresher launch set).
  delete from top_shop_awards where quarter = p_quarter and provisional;
  if p_provisional then d_to := least(d_to, current_date + 1); end if;
  insert into top_shop_awards (quarter, store_id, rank, score, views, actions, reviews, rating, followers, owner_activity, provisional)
  select p_quarter, t.store_id, t.rank, t.score, t.views, t.actions, t.reviews, t.rating, t.followers, t.owner_activity, p_provisional
  from top_shops_between(d_from, d_to, 100) t;
  get diagnostics n = row_count;
  return n;
end;
$$;

drop function if exists public.award_top_shops(text);
revoke all on function public.award_top_shops(text, boolean) from public, anon, authenticated;
grant execute on function public.award_top_shops(text, boolean) to service_role;

-- Issue the launch badges for Q4 2026 from today's standings.
select public.award_top_shops('2026-Q4', true);
