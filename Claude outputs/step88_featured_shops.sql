-- Step 88: Featured fish stores on classified ads and forum threads.
-- Lets the site count two new things per claimed shop:
--   featured        = the shop was seen in the Featured fish stores box
--   featured_click  = someone tapped the shop from that box
-- The Monday weekly report (shop_weekly_facts) already totals every kind,
-- so these flow into "seen by X people this week" with no other change.
-- Safe to run more than once.

-- 1. If store_events limits which kinds it accepts, widen that list.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'store_events'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%kind%'
  loop
    execute format('alter table public.store_events drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.store_events
  add constraint store_events_kind_check
  check (kind in ('view','directions','phone','website','favorite','featured','featured_click')) not valid;

-- 2. Same as step 60's version (owners looking at their own shop don't
--    count), plus the two new kinds.
create or replace function public.record_store_event(p_store uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if p_kind not in ('view','directions','phone','website','favorite','featured','featured_click') then return; end if;
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

grant execute on function public.record_store_event(uuid, text) to anon, authenticated;

-- Done: should show the new check and the claimed shops that will be featured.
select
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'store_events_kind_check') as kinds_allowed,
  (select count(*) from public.fish_stores where claimed_by is not null and status = 'published') as claimed_shops_featured;
