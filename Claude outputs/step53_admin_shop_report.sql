-- ============================================================
-- STEP 53 — Admin shop report
--
-- One call for the admin "Shop stats" page: directory-wide totals
-- against the period before, top shops, the busiest unclaimed shops
-- (warm leads for the sign-up campaign, with whether we have an
-- email for them), top cities, and the biggest risers.
--
-- Admins only. Safe to run more than once.
-- ============================================================

create or replace function public.admin_shop_report(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days integer := case when p_days in (7, 30, 90) then p_days else 7 end;
  v_out  jsonb;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Admins only.';
  end if;

  with ev as (
    select store_id, day, kind, n from public.store_events
    where day > current_date - (v_days * 2)
  ),
  per_shop as (
    select e.store_id,
      sum(n) filter (where day > current_date - v_days and kind = 'view')::int        as views,
      sum(n) filter (where day > current_date - v_days and kind = 'directions')::int  as directions,
      sum(n) filter (where day > current_date - v_days and kind = 'phone')::int       as calls,
      sum(n) filter (where day > current_date - v_days and kind = 'website')::int     as website,
      sum(n) filter (where day <= current_date - v_days and kind = 'view')::int       as prev_views,
      sum(n) filter (where day <= current_date - v_days and kind in ('directions', 'phone', 'website'))::int as prev_actions
    from ev e
    group by e.store_id
  ),
  shops as (
    select s.id, s.name, s.slug, s.city, s.state, (s.claimed_by is not null) as claimed,
           coalesce(p.views, 0) as views, coalesce(p.directions, 0) as directions,
           coalesce(p.calls, 0) as calls, coalesce(p.website, 0) as website,
           coalesce(p.directions, 0) + coalesce(p.calls, 0) + coalesce(p.website, 0) as actions,
           coalesce(p.prev_views, 0) as prev_views, coalesce(p.prev_actions, 0) as prev_actions
    from public.fish_stores s
    join per_shop p on p.store_id = s.id
  ),
  daily as (
    select d::date as day,
           coalesce((select sum(n) from ev where ev.day = d::date and kind = 'view'), 0)::int as views,
           coalesce((select sum(n) from ev where ev.day = d::date and kind in ('directions', 'phone', 'website')), 0)::int as actions
    from generate_series(current_date - (v_days - 1), current_date, interval '1 day') d
  ),
  row_json as (
    select id, jsonb_build_object('id', id, 'name', name, 'slug', slug, 'city', city, 'state', state,
                                  'claimed', claimed, 'views', views, 'directions', directions, 'calls', calls,
                                  'website', website, 'actions', actions, 'prev_views', prev_views,
                                  'prev_actions', prev_actions) as j,
           views, actions, prev_views, claimed
    from shops
  )
  select jsonb_build_object(
    'days', v_days,
    'totals', (select jsonb_build_object(
        'views', coalesce(sum(views), 0), 'directions', coalesce(sum(directions), 0),
        'calls', coalesce(sum(calls), 0), 'website', coalesce(sum(website), 0),
        'actions', coalesce(sum(actions), 0),
        'prev_views', coalesce(sum(prev_views), 0), 'prev_actions', coalesce(sum(prev_actions), 0),
        'shops_viewed', count(*) filter (where views > 0))
      from shops),
    'daily', (select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'actions', actions) order by day) from daily),
    'directory', jsonb_build_object(
        'listed', (select count(*) from public.fish_stores where coalesce(status, '') not in ('pending', 'rejected', 'hidden')),
        'claimed', (select count(*) from public.fish_stores where claimed_by is not null),
        'claims_waiting', (select count(*) from public.store_claims where status = 'pending'),
        'reviews', (select count(*) from public.store_reviews where created_at > now() - make_interval(days => v_days)),
        'prev_reviews', (select count(*) from public.store_reviews
                         where created_at <= now() - make_interval(days => v_days)
                           and created_at > now() - make_interval(days => v_days * 2)),
        'follows', (select count(*) from public.store_favorites where created_at > now() - make_interval(days => v_days)),
        'posts', (select count(*) from public.store_posts where created_at > now() - make_interval(days => v_days)),
        'fixes_open', (select count(*) from public.store_edit_suggestions where status = 'open')),
    'top', (select coalesce(jsonb_agg(j order by views desc, actions desc), '[]'::jsonb)
            from (select * from row_json where views > 0 order by views desc, actions desc limit 15) t),
    'top_actions', (select coalesce(jsonb_agg(j order by actions desc, views desc), '[]'::jsonb)
                    from (select * from row_json where actions > 0 order by actions desc, views desc limit 10) t),
    'leads', (select coalesce(jsonb_agg(j || jsonb_build_object('has_email', has_email) order by views desc), '[]'::jsonb)
              from (select r.*, exists (select 1 from public.store_contacts c
                                        where c.store_id = r.id and coalesce(c.email, '') <> ''
                                          and c.unsubscribed_at is null) as has_email
                    from row_json r where not claimed and views > 0
                    order by views desc limit 15) t),
    'risers', (select coalesce(jsonb_agg(j order by (views - prev_views) desc), '[]'::jsonb)
               from (select * from row_json where views - prev_views >= 3
                     order by (views - prev_views) desc limit 8) t),
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('city', city, 'state', state, 'views', views,
                                                            'actions', actions, 'shops', shops) order by views desc), '[]'::jsonb)
               from (select city, state, sum(views)::int as views, sum(actions)::int as actions, count(*)::int as shops
                     from shops where views > 0 and city is not null
                     group by city, state order by sum(views) desc limit 10) c)
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.admin_shop_report(integer) from public, anon;
grant execute on function public.admin_shop_report(integer) to authenticated;


-- Done.
select count(*) as report_function
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'admin_shop_report';
