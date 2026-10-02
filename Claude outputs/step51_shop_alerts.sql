-- ============================================================
-- STEP 51 — Shop alerts
--
-- Tells shop owners when something happens on their shop:
--   shop_review    a new review, the moment it's posted
--   shop_fix       someone reported wrong hours, a move, a closure
--   shop_milestone total views or followers passed a milestone
--   shop_weekly    Monday's report: views, calls, directions,
--                  website taps, followers, reviews, city rank, a tip
-- Each is an in-app notification with structured data for the
-- richer shop card, and the site emails it to the owner too.
-- Owners can switch any of them off in notification settings.
--
-- RUN THIS BEFORE PUSHING THE CODE: the code reads the new columns.
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Notifications carry data, and remember when they were emailed
-- ------------------------------------------------------------

alter table public.notifications add column if not exists data jsonb;
alter table public.notifications add column if not exists emailed_at timestamptz;

create index if not exists notifications_shop_unemailed
  on public.notifications (created_at)
  where emailed_at is null and type like 'shop\_%';


-- ------------------------------------------------------------
-- 2. Milestones already celebrated, so each is sent once
-- ------------------------------------------------------------

create table if not exists public.shop_milestones (
  store_id    uuid not null references public.fish_stores(id) on delete cascade,
  metric      text not null,
  value       integer not null,
  reached_at  timestamptz not null default now(),
  primary key (store_id, metric, value)
);

alter table public.shop_milestones enable row level security;


-- ------------------------------------------------------------
-- 3. The shop's card details: name, link, first photo
-- ------------------------------------------------------------

create or replace function public.shop_card(p_store uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'store_id', s.id,
    'slug', s.slug,
    'name', s.name,
    'city', s.city,
    'photo', (select ph.url from public.store_photos ph
              where ph.store_id = s.id order by ph.sort, ph.created_at limit 1)
  )
  from public.fish_stores s
  where s.id = p_store;
$$;

revoke all on function public.shop_card(uuid) from public, anon, authenticated;


-- ------------------------------------------------------------
-- 4. New review → owner, right away
-- ------------------------------------------------------------

create or replace function public.shop_alert_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name  text;
  v_slug  text;
  v_who   text;
  v_text  text := nullif(btrim(coalesce(new.body, '')), '');
begin
  select claimed_by, name, slug into v_owner, v_name, v_slug
  from public.fish_stores where id = new.store_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;

  select coalesce(nullif(btrim(full_name), ''), username, 'An aquarist') into v_who
  from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, link, data)
  values (
    v_owner, 'shop_review',
    'New ' || new.rating || '-star review for ' || v_name,
    coalesce(v_who, 'An aquarist') || case when v_text is null then ' left a rating. Tap to reply.'
      else ': "' || left(v_text, 140) || case when char_length(v_text) > 140 then '…' else '' end || '"' end,
    '/my/shops/' || v_slug || '/reviews',
    public.shop_card(new.store_id) || jsonb_build_object(
      'rating', new.rating, 'reviewer', v_who, 'excerpt', left(coalesce(v_text, ''), 280),
      'cta', 'Reply to this review')
  );
  return new;
end;
$$;

drop trigger if exists store_reviews_shop_alert on public.store_reviews;
create trigger store_reviews_shop_alert
  after insert on public.store_reviews
  for each row execute function public.shop_alert_review();


-- ------------------------------------------------------------
-- 5. Someone flagged the listing → owner, right away
-- ------------------------------------------------------------

create or replace function public.shop_alert_fix()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_name  text;
  v_slug  text;
  v_what  text;
begin
  select claimed_by, name, slug into v_owner, v_name, v_slug
  from public.fish_stores where id = new.store_id;
  if v_owner is null or v_owner = new.user_id then return new; end if;

  v_what := case new.kind
    when 'hours'   then 'your hours are wrong'
    when 'closed'  then 'the shop has closed'
    when 'moved'   then 'the shop has moved'
    when 'phone'   then 'your phone number is wrong'
    when 'website' then 'your website is wrong'
    when 'name'    then 'the shop name is wrong'
    else 'something on your listing is wrong'
  end;

  insert into public.notifications (user_id, type, title, body, link, data)
  values (
    v_owner, 'shop_fix',
    'A shopper says ' || v_what,
    left(new.body, 200) || case when char_length(new.body) > 200 then '…' else '' end,
    '/my/shops/' || v_slug || '/hours',
    public.shop_card(new.store_id) || jsonb_build_object(
      'kind', new.kind, 'what', v_what, 'note', left(new.body, 500), 'cta', 'Check your listing')
  );
  return new;
end;
$$;

drop trigger if exists store_edit_suggestions_shop_alert on public.store_edit_suggestions;
create trigger store_edit_suggestions_shop_alert
  after insert on public.store_edit_suggestions
  for each row execute function public.shop_alert_fix();


-- ------------------------------------------------------------
-- 6. Milestones: total views and followers
-- ------------------------------------------------------------

create or replace function public.shop_check_milestone(p_store uuid, p_metric text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner  uuid;
  v_total  integer;
  v_step   integer;
  v_steps  integer[];
  v_name   text;
  v_slug   text;
begin
  select claimed_by, name, slug into v_owner, v_name, v_slug from public.fish_stores where id = p_store;
  if v_owner is null then return; end if;

  if p_metric = 'views' then
    select coalesce(sum(n), 0)::int into v_total from public.store_events where store_id = p_store and kind = 'view';
    v_steps := array[100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  elsif p_metric = 'followers' then
    select count(*)::int into v_total from public.store_favorites where fish_store_id = p_store;
    v_steps := array[10, 25, 50, 100, 250, 500, 1000];
  else
    return;
  end if;

  -- The highest step reached that hasn't been celebrated yet. Steps
  -- skipped over (a shop claimed with 600 views already) are recorded
  -- quietly so only one notice goes out.
  select max(s) into v_step from unnest(v_steps) s where s <= v_total;
  if v_step is null then return; end if;
  if exists (select 1 from public.shop_milestones where store_id = p_store and metric = p_metric and value = v_step) then
    return;
  end if;

  insert into public.shop_milestones (store_id, metric, value)
  select p_store, p_metric, s from unnest(v_steps) s where s <= v_total
  on conflict do nothing;

  insert into public.notifications (user_id, type, title, body, link, data)
  values (
    v_owner, 'shop_milestone',
    case p_metric
      when 'views' then to_char(v_step, 'FM999,999') || ' views on ' || v_name || '!'
      else to_char(v_step, 'FM999,999') || ' people follow ' || v_name || '!'
    end,
    case p_metric
      when 'views' then 'Aquarists have looked your shop up ' || to_char(v_total, 'FM999,999')
                        || ' times on Underground Aquarium. Share your page to keep it growing.'
      else 'They see every update you post. A restock or sale post is the best way to bring them in.'
    end,
    '/my/shops/' || v_slug,
    public.shop_card(p_store) || jsonb_build_object('metric', p_metric, 'value', v_step, 'total', v_total,
      'cta', case p_metric when 'views' then 'See your numbers' else 'Post an update' end)
  );
end;
$$;

revoke all on function public.shop_check_milestone(uuid, text) from public, anon, authenticated;

-- Counting a view also checks for a views milestone.
create or replace function public.record_store_event(p_store uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind not in ('view','directions','phone','website','favorite') then return; end if;
  if not exists (select 1 from public.fish_stores where id = p_store) then return; end if;

  insert into public.store_events (store_id, day, kind, n)
  values (p_store, current_date, p_kind, 1)
  on conflict (store_id, day, kind) do update set n = public.store_events.n + 1;

  if p_kind = 'view' then
    begin
      perform public.shop_check_milestone(p_store, 'views');
    exception when others then
      -- A milestone problem must never stop a view being counted.
      raise warning 'shop milestone check failed: %', sqlerrm;
    end;
  end if;
end;
$$;

create or replace function public.shop_alert_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.shop_check_milestone(new.fish_store_id, 'followers');
  exception when others then
    raise warning 'shop follower milestone failed: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists store_favorites_shop_alert on public.store_favorites;
create trigger store_favorites_shop_alert
  after insert on public.store_favorites
  for each row execute function public.shop_alert_follow();


-- ------------------------------------------------------------
-- 7. The weekly report's numbers (last 7 days vs the 7 before)
-- ------------------------------------------------------------

create or replace function public.shop_weekly_facts(p_store uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with s as (select * from public.fish_stores where id = p_store),
  wk as (
    select kind, sum(n)::int as n from public.store_events
    where store_id = p_store and day > current_date - 7 group by kind
  ),
  pw as (
    select kind, sum(n)::int as n from public.store_events
    where store_id = p_store and day <= current_date - 7 and day > current_date - 14 group by kind
  ),
  city as (
    select f.id, coalesce(sum(e.n), 0) as views
    from public.fish_stores f
    join s on lower(coalesce(f.city, '')) = lower(coalesce(s.city, '')) and f.state = s.state
    left join public.store_events e on e.store_id = f.id and e.kind = 'view' and e.day > current_date - 7
    where coalesce(f.status, '') not in ('pending', 'rejected', 'hidden')
    group by f.id
  )
  select public.shop_card(p_store) || jsonb_build_object(
    'week',  (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from wk),
    'prev',  (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from pw),
    'new_followers', (select count(*)::int from public.store_favorites
                      where fish_store_id = p_store and created_at > now() - interval '7 days'),
    'followers', (select count(*)::int from public.store_favorites where fish_store_id = p_store),
    'new_reviews', (select count(*)::int from public.store_reviews
                    where store_id = p_store and created_at > now() - interval '7 days'),
    'rating', (select round(avg(rating)::numeric, 1) from public.store_reviews where store_id = p_store),
    'reviews', (select count(*)::int from public.store_reviews where store_id = p_store),
    'unanswered', (select count(*)::int from public.store_reviews r where r.store_id = p_store
                   and not exists (select 1 from public.review_responses rr where rr.review_id = r.id)),
    'photos', (select count(*)::int from public.store_photos where store_id = p_store),
    'has_hours', (select coalesce(btrim(hours), '') <> '' from s),
    'has_about', (select coalesce(btrim(description), '') <> '' from s),
    'days_since_post', (select (current_date - max(created_at)::date) from public.store_posts where store_id = p_store),
    'city_rank', (select 1 + count(*) from city c where c.views > (select views from city where id = p_store)),
    'city_shops', (select count(*) from city),
    'open_fixes', (select count(*)::int from public.store_edit_suggestions where store_id = p_store and status = 'open')
  );
$$;

revoke all on function public.shop_weekly_facts(uuid) from public, anon, authenticated;


-- ------------------------------------------------------------
-- 8. The old review notice is replaced by shop_review above.
--    (The site stops sending the old one in the same update.)
-- ------------------------------------------------------------


-- Done.
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name in ('data', 'emailed_at')) as new_columns,
  (select count(*) from information_schema.triggers
    where trigger_name in ('store_reviews_shop_alert', 'store_edit_suggestions_shop_alert', 'store_favorites_shop_alert')) as triggers,
  (select count(*) from public.fish_stores where claimed_by is not null) as claimed_shops;
