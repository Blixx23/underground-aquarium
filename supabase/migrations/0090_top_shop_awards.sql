-- Top 100 Stores, by quarter. The score is worked out over a fixed window
-- (a calendar quarter), and when a quarter ends the Top 100 is locked into
-- top_shop_awards. The badge on a shop's page shows the latest locked
-- quarter, and the admin list doubles as the reward checklist.

create or replace function public.top_shops_between(p_from date, p_to date, p_limit int default 100)
returns table (
  store_id uuid, rank int, score numeric, views bigint, actions bigint,
  reviews bigint, rating numeric, followers bigint, owner_activity bigint
)
language sql stable security definer set search_path = public
as $$
  with ev as (
    select e.store_id,
      sum(e.n) filter (where e.kind = 'view') as views,
      sum(e.n) filter (where e.kind in ('directions', 'phone', 'website', 'featured_click')) as actions
    from store_events e
    where e.day >= p_from and e.day < p_to
    group by e.store_id
  ),
  -- Reviews count up to the end of the quarter: reputation builds over time.
  rv as (
    select r.store_id, count(*) as reviews, avg(r.rating)::numeric as rating
    from store_reviews r where r.created_at < p_to
    group by r.store_id
  ),
  fv as (
    select f.fish_store_id as store_id, count(*) as followers
    from store_favorites f where f.created_at < p_to
    group by f.fish_store_id
  ),
  own as (
    select x.store_id, count(*) as n from (
      select p.store_id from store_posts p where p.created_at >= p_from and p.created_at < p_to
      union all
      select rr.store_id from review_responses rr where rr.created_at >= p_from and rr.created_at < p_to
    ) x group by x.store_id
  ),
  base as (
    select s.id as store_id,
      coalesce(ev.views, 0) as views, coalesce(ev.actions, 0) as actions,
      coalesce(rv.reviews, 0) as reviews, rv.rating,
      coalesce(fv.followers, 0) as followers, coalesce(own.n, 0) as owner_activity,
      -- Star rating pulled toward 4.0 until a shop has a few reviews, so one
      -- 5-star review can't beat forty 4.7s, then weighted by how many.
      case when coalesce(rv.reviews, 0) = 0 then 0
        else ((3 * 4.0 + rv.rating * rv.reviews) / (3 + rv.reviews)) * ln(1 + rv.reviews)
      end as review_points
    from fish_stores s
    left join ev on ev.store_id = s.id
    left join rv on rv.store_id = s.id
    left join fv on fv.store_id = s.id
    left join own on own.store_id = s.id
    where s.status = 'published'
  ),
  qualified as (
    select * from base
    where reviews >= 1 or actions >= 5 or followers >= 2 or views >= 50 or owner_activity >= 1
  ),
  scored as (
    select q.*,
      round(100 * (
        0.35 * percent_rank() over (order by review_points) +
        0.30 * percent_rank() over (order by actions) +
        0.15 * percent_rank() over (order by views) +
        0.10 * percent_rank() over (order by followers) +
        0.10 * percent_rank() over (order by owner_activity)
      )::numeric, 1) as score
    from qualified q
  )
  select store_id,
    (row_number() over (order by score desc, reviews desc, actions desc, views desc))::int,
    score, views, actions, reviews, round(rating, 2), followers, owner_activity
  from scored
  order by 2
  limit p_limit;
$$;

-- The rolling version stays, as a thin wrapper.
create or replace function public.top_shops(p_days int default 90, p_limit int default 100)
returns table (
  store_id uuid, rank int, score numeric, views bigint, actions bigint,
  reviews bigint, rating numeric, followers bigint, owner_activity bigint
)
language sql stable security definer set search_path = public
as $$ select * from public.top_shops_between(current_date - p_days, current_date + 1, p_limit) $$;

create table if not exists public.top_shop_awards (
  quarter text not null,                 -- e.g. '2026-Q4'
  store_id uuid not null references public.fish_stores(id) on delete cascade,
  rank int not null,
  score numeric not null,
  views bigint not null default 0,
  actions bigint not null default 0,
  reviews bigint not null default 0,
  rating numeric,
  followers bigint not null default 0,
  owner_activity bigint not null default 0,
  awarded_at timestamptz not null default now(),
  reward_sent_at timestamptz,
  reward_note text,
  primary key (quarter, store_id)
);
create index if not exists top_shop_awards_store_idx on public.top_shop_awards (store_id, quarter desc);
alter table public.top_shop_awards enable row level security;
-- Anyone may see who won (it's on the shop pages); only the server writes.
drop policy if exists "top shop awards are public" on public.top_shop_awards;
create policy "top shop awards are public" on public.top_shop_awards for select using (true);

-- Lock in a finished quarter. Safe to run twice: a quarter is only written once.
create or replace function public.award_top_shops(p_quarter text)
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
  if exists (select 1 from top_shop_awards where quarter = p_quarter) then return 0; end if;
  insert into top_shop_awards (quarter, store_id, rank, score, views, actions, reviews, rating, followers, owner_activity)
  select p_quarter, t.store_id, t.rank, t.score, t.views, t.actions, t.reviews, t.rating, t.followers, t.owner_activity
  from top_shops_between(d_from, d_to, 100) t;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.top_shops_between(date, date, int) from public, anon, authenticated;
revoke all on function public.top_shops(int, int) from public, anon, authenticated;
revoke all on function public.award_top_shops(text) from public, anon, authenticated;
grant execute on function public.top_shops_between(date, date, int) to service_role;
grant execute on function public.top_shops(int, int) to service_role;
grant execute on function public.award_top_shops(text) to service_role;
