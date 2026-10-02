-- ============================================================
-- STEP 52 — Shop dashboard data
--
-- One call returns everything the redesigned shop dashboard shows:
-- 60 days of daily views, direction taps, calls and website visits
-- (so 7 and 30 days can each compare with the period before),
-- followers, reviews and rating, city rank for 7 and 30 days, what
-- needs attention, and open listing reports the owner can clear.
--
-- Run after step 51. Safe to run more than once.
-- ============================================================

create or replace function public.shop_dashboard(p_store uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_s   public.fish_stores;
  v_out jsonb;
begin
  -- The owner, or an admin checking on a shop.
  if not (public.owns_store(p_store)
          or coalesce((select is_admin from public.profiles where id = auth.uid()), false)) then
    return null;
  end if;
  select * into v_s from public.fish_stores where id = p_store;
  if v_s.id is null then return null; end if;

  with days as (
    select generate_series(current_date - 59, current_date, interval '1 day')::date as day
  ),
  ev as (
    select day, kind, sum(n)::int as n from public.store_events
    where store_id = p_store and day > current_date - 60
    group by day, kind
  ),
  daily as (
    select d.day,
           coalesce(max(ev.n) filter (where ev.kind = 'view'), 0)       as views,
           coalesce(max(ev.n) filter (where ev.kind = 'directions'), 0) as directions,
           coalesce(max(ev.n) filter (where ev.kind = 'phone'), 0)      as calls,
           coalesce(max(ev.n) filter (where ev.kind = 'website'), 0)    as website
    from days d left join ev on ev.day = d.day
    group by d.day
  ),
  city as (
    select f.id,
           coalesce(sum(e.n) filter (where e.day > current_date - 7), 0)  as v7,
           coalesce(sum(e.n) filter (where e.day > current_date - 30), 0) as v30
    from public.fish_stores f
    left join public.store_events e on e.store_id = f.id and e.kind = 'view' and e.day > current_date - 30
    where f.state = v_s.state
      and lower(coalesce(f.city, '')) = lower(coalesce(v_s.city, ''))
      and coalesce(f.status, '') not in ('pending', 'rejected', 'hidden')
    group by f.id
  )
  select jsonb_build_object(
    'daily', (select jsonb_agg(jsonb_build_object('day', day, 'views', views, 'directions', directions,
                                                  'calls', calls, 'website', website) order by day) from daily),
    'followers', (select count(*)::int from public.store_favorites where fish_store_id = p_store),
    'followers_7', (select count(*)::int from public.store_favorites
                    where fish_store_id = p_store and created_at > now() - interval '7 days'),
    'followers_30', (select count(*)::int from public.store_favorites
                     where fish_store_id = p_store and created_at > now() - interval '30 days'),
    'reviews', (select count(*)::int from public.store_reviews where store_id = p_store),
    'reviews_7', (select count(*)::int from public.store_reviews
                  where store_id = p_store and created_at > now() - interval '7 days'),
    'reviews_30', (select count(*)::int from public.store_reviews
                   where store_id = p_store and created_at > now() - interval '30 days'),
    'rating', (select round(avg(rating)::numeric, 1) from public.store_reviews where store_id = p_store),
    'unanswered', (select count(*)::int from public.store_reviews r where r.store_id = p_store
                   and not exists (select 1 from public.review_responses rr where rr.review_id = r.id)),
    'city', v_s.city,
    'city_shops', (select count(*)::int from city),
    'rank_7', (select 1 + count(*)::int from city c where c.v7 > coalesce((select v7 from city where id = p_store), 0)),
    'rank_30', (select 1 + count(*)::int from city c where c.v30 > coalesce((select v30 from city where id = p_store), 0)),
    'photos', (select count(*)::int from public.store_photos where store_id = p_store),
    'posts', (select count(*)::int from public.store_posts where store_id = p_store),
    'days_since_post', (select (current_date - max(created_at)::date) from public.store_posts where store_id = p_store),
    'has_hours', coalesce(btrim(v_s.hours), '') <> '',
    'has_about', coalesce(btrim(v_s.description), '') <> '',
    'has_phone', coalesce(btrim(v_s.phone), '') <> '',
    'has_website', coalesce(btrim(v_s.website), '') <> '',
    'fixes', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'body', x.body,
                                                            'created_at', x.created_at) order by x.created_at desc), '[]'::jsonb)
              from (select id, kind, body, created_at from public.store_edit_suggestions
                    where store_id = p_store and status = 'open'
                    order by created_at desc limit 5) x)
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.shop_dashboard(uuid) from public, anon;
grant execute on function public.shop_dashboard(uuid) to authenticated;


-- The owner clears a listing report: 'done' (fixed it) or 'dismissed'
-- (the report was wrong). Same statuses the admin fixes page uses.
create or replace function public.resolve_my_store_fix(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid;
begin
  if p_status not in ('done', 'dismissed') then raise exception 'Unknown status.'; end if;
  select store_id into v_store from public.store_edit_suggestions where id = p_id and status = 'open';
  if v_store is null then raise exception 'That report was already handled.'; end if;
  if not (public.owns_store(v_store)
          or coalesce((select is_admin from public.profiles where id = auth.uid()), false)) then
    raise exception 'That isn''t your shop.';
  end if;

  update public.store_edit_suggestions
  set status = p_status, resolved_at = now()
  where id = p_id;
end;
$$;

revoke all on function public.resolve_my_store_fix(uuid, text) from public, anon;
grant execute on function public.resolve_my_store_fix(uuid, text) to authenticated;


-- Views and taps by the shop's own owner don't count, so owners checking
-- their page don't inflate their numbers, city rank or milestones.
-- (Same as step 51's version, plus that one check.)
create or replace function public.record_store_event(p_store uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if p_kind not in ('view','directions','phone','website','favorite') then return; end if;
  select claimed_by into v_owner from public.fish_stores where id = p_store;
  if not found then return; end if;
  if v_owner is not null and v_owner = auth.uid() then return; end if;

  insert into public.store_events (store_id, day, kind, n)
  values (p_store, current_date, p_kind, 1)
  on conflict (store_id, day, kind) do update set n = public.store_events.n + 1;

  if p_kind = 'view' then
    begin
      perform public.shop_check_milestone(p_store, 'views');
    exception when others then
      raise warning 'shop milestone check failed: %', sqlerrm;
    end;
  end if;
end;
$$;


-- Done.
select count(*) as dashboard_functions
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('shop_dashboard', 'resolve_my_store_fix');
