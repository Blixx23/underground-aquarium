-- Top 100 Stores: one score per published shop from reviews, customer
-- actions (directions, call, website taps), page views, followers and owner
-- activity. Each part is ranked against the other qualifying shops so no
-- single big number dominates. A shop needs some real activity to qualify,
-- so the badge is earned, not handed to a quiet listing.
create or replace function public.top_shops(p_days int default 90, p_limit int default 100)
returns table (
  store_id uuid,
  rank int,
  score numeric,
  views bigint,
  actions bigint,
  reviews bigint,
  rating numeric,
  followers bigint,
  owner_activity bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with since as (select (current_date - p_days) as d),
  ev as (
    select e.store_id,
      sum(e.n) filter (where e.kind = 'view') as views,
      sum(e.n) filter (where e.kind in ('directions', 'phone', 'website', 'featured_click')) as actions
    from store_events e, since
    where e.day >= since.d
    group by e.store_id
  ),
  rv as (
    select r.store_id, count(*) as reviews, avg(r.rating)::numeric as rating
    from store_reviews r
    group by r.store_id
  ),
  fv as (
    select f.fish_store_id as store_id, count(*) as followers
    from store_favorites f
    group by f.fish_store_id
  ),
  own as (
    select x.store_id, count(*) as n from (
      select p.store_id from store_posts p, since where p.created_at >= since.d
      union all
      select rr.store_id from review_responses rr, since where rr.created_at >= since.d
    ) x group by x.store_id
  ),
  base as (
    select s.id as store_id,
      coalesce(ev.views, 0) as views,
      coalesce(ev.actions, 0) as actions,
      coalesce(rv.reviews, 0) as reviews,
      rv.rating,
      coalesce(fv.followers, 0) as followers,
      coalesce(own.n, 0) as owner_activity,
      -- Star rating pulled toward 4.0 until a shop has a few reviews, so one
      -- 5-star review can't beat forty 4.7s. Weighted by how many there are.
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
    (row_number() over (order by score desc, reviews desc, actions desc, views desc))::int as rank,
    score, views, actions, reviews, round(rating, 2), followers, owner_activity
  from scored
  order by rank
  limit p_limit;
$$;

revoke all on function public.top_shops(int, int) from public, anon, authenticated;
grant execute on function public.top_shops(int, int) to service_role;
