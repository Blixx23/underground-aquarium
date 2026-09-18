-- ============================================================
-- STEP 30 — Society member identity
--
-- Member numbers, the badge catalogue, and earned badges.
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Member numbers
--
-- Permanent, sequential, never reissued. Scoped per club so the
-- Society's numbering is its own, and unique so two members can
-- never share one.
-- ------------------------------------------------------------

alter table public.club_members
  add column if not exists member_number integer;

-- Backfill in join order, so the people already here get the low
-- numbers they earned by being early.
with ordered as (
  select id,
         row_number() over (
           partition by club_id
           order by joined_at nulls last, id
         ) as n
  from public.club_members
  where member_number is null
)
update public.club_members m
set member_number = ordered.n
from ordered
where m.id = ordered.id;

create unique index if not exists club_members_number_unique
  on public.club_members (club_id, member_number)
  where member_number is not null;

-- Assign the next number on insert. Takes a lock on the club row so
-- two people joining at the same instant can't be handed the same
-- number, which a plain max()+1 would happily do.
create or replace function public.assign_member_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
begin
  if new.member_number is not null then
    return new;
  end if;

  perform 1 from public.clubs where id = new.club_id for update;

  select coalesce(max(member_number), 0) + 1
  into v_next
  from public.club_members
  where club_id = new.club_id;

  new.member_number := v_next;
  return new;
end;
$$;

drop trigger if exists club_members_assign_number on public.club_members;
create trigger club_members_assign_number
  before insert on public.club_members
  for each row
  execute function public.assign_member_number();


-- ------------------------------------------------------------
-- 2. The badge catalogue
--
-- Definitions live in the database rather than in code so badges
-- can be added without a deploy, and so a member's earned row can
-- point at a stable key.
-- ------------------------------------------------------------

create table if not exists public.society_badges (
  key           text primary key,
  name          text not null,
  description   text not null,
  category      text not null,   -- membership | breeding | service | longevity | contribution
  tier          text not null default 'bronze',  -- bronze | silver | gold
  sort_order    integer not null default 0,
  -- Badges that can't be earned yet still show, greyed out, because a
  -- locked badge is a roadmap. This hides one entirely if ever needed.
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

insert into public.society_badges
  (key, name, description, category, tier, sort_order)
values
  -- Membership milestones. Each member earns exactly one, by number.
  ('member_25',        'Charter Twenty-Five', 'One of the first 25 members of the Society.',                      'membership',  'gold',   10),
  ('member_50',        'First Fifty',         'Among the first 50 members of the Society.',                       'membership',  'gold',   11),
  ('member_100',       'First Hundred',       'Among the first 100 members of the Society.',                      'membership',  'silver', 12),
  ('member_250',       'First Two Fifty',     'Among the first 250 members of the Society.',                      'membership',  'silver', 13),
  ('member_1000',      'First Thousand',      'Among the first 1,000 members of the Society.',                    'membership',  'bronze', 14),

  -- Breeding. Earned once the Breeder Award Program ships.
  ('first_blood',      'First Blood',         'Your first approved entry in the Breeder Award Program.',          'breeding',    'bronze', 20),
  ('first_in_society', 'First in Society',    'First member to log an approved spawn of a species.',              'breeding',    'gold',   21),
  ('pioneer',          'Pioneer',             'Five or more first-in-Society records.',                           'breeding',    'gold',   22),
  ('deep_water',       'Deep Water',          'An approved Class E entry.',                                       'breeding',    'silver', 23),
  ('unicorn',          'Unicorn',             'An approved Class F entry.',                                       'breeding',    'gold',   24),
  ('clean_sheet',      'Clean Sheet',         'All five stages logged on time, approved without escalation.',     'breeding',    'silver', 25),
  ('persistent',       'Persistent',          'An approved entry in six consecutive months.',                     'breeding',    'silver', 26),

  -- Service. The review programme.
  ('reviewer_10',      'Reviewer',            'Completed 10 peer reviews.',                                       'service',     'bronze', 30),
  ('reviewer_50',      'Senior Reviewer',     'Completed 50 peer reviews.',                                       'service',     'silver', 31),
  ('reviewer_100',     'Chief Reviewer',      'Completed 100 peer reviews.',                                      'service',     'gold',   32),
  ('sharp_eye',        'Sharp Eye',           'Caught a submission later confirmed fraudulent.',                  'service',     'gold',   33),
  ('mentor',           'Mentor',              'Helped another member to their first approved award.',             'service',     'silver', 34),

  -- Longevity. Pure function of the join date.
  ('year_1',           'One Year',            'A member for one year.',                                           'longevity',   'bronze', 40),
  ('year_3',           'Three Years',         'A member for three years.',                                        'longevity',   'silver', 41),
  ('year_5',           'Five Years',          'A member for five years.',                                         'longevity',   'gold',   42),
  ('year_10',          'Ten Years',           'A member for ten years.',                                          'longevity',   'gold',   43),

  -- Contribution.
  ('author',           'Author',              'Published a spawn report to the library.',                         'contribution','silver', 50),
  ('cartographer',     'Cartographer',        'Added a species the library did not have.',                        'contribution','silver', 51)
on conflict (key) do update
  set name        = excluded.name,
      description = excluded.description,
      category    = excluded.category,
      tier        = excluded.tier,
      sort_order  = excluded.sort_order;


-- ------------------------------------------------------------
-- 3. Earned badges
-- ------------------------------------------------------------

create table if not exists public.member_badges (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references public.clubs(id) on delete cascade,
  user_id    uuid not null,
  badge_key  text not null references public.society_badges(key) on delete cascade,
  earned_at  timestamptz not null default now(),
  -- Free-text detail for badges that have one, e.g. the species on a
  -- first-in-Society record. Shown under the badge name.
  detail     text
);

create unique index if not exists member_badges_unique
  on public.member_badges (club_id, user_id, badge_key);

create index if not exists member_badges_user
  on public.member_badges (user_id);


-- ------------------------------------------------------------
-- 4. Awarding
--
-- Idempotent by design: awarding a badge someone already holds is a
-- no-op rather than an error, so callers can fire freely.
-- ------------------------------------------------------------

create or replace function public.award_society_badge(
  p_user_id   uuid,
  p_club_id   uuid,
  p_badge_key text,
  p_detail    text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted boolean := false;
begin
  if p_user_id is null or p_club_id is null or p_badge_key is null then
    return false;
  end if;

  -- Unknown or retired badge keys are ignored rather than raising, so a
  -- stale caller can never break a page render.
  if not exists (
    select 1 from public.society_badges
    where key = p_badge_key and is_active
  ) then
    return false;
  end if;

  insert into public.member_badges (club_id, user_id, badge_key, detail)
  values (p_club_id, p_user_id, p_badge_key, p_detail)
  on conflict (club_id, user_id, badge_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;


-- ------------------------------------------------------------
-- 5. Sync
--
-- Recomputes the badges that are pure functions of membership facts:
-- the milestone from the member number, and longevity from the join
-- date. Cheap and idempotent, so it can run on page load and no cron
-- is needed.
--
-- Deliberately does NOT remove badges. Earned is earned.
-- ------------------------------------------------------------

create or replace function public.sync_member_badges(
  p_user_id uuid,
  p_club_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number   integer;
  v_joined   timestamptz;
  v_status   text;
  v_years    numeric;
  v_awarded  integer := 0;
begin
  select member_number, joined_at, status
  into v_number, v_joined, v_status
  from public.club_members
  where user_id = p_user_id and club_id = p_club_id;

  if not found or v_status = 'pending' then
    return 0;
  end if;

  -- Exactly one membership milestone: the tightest bracket you fall in.
  if v_number is not null then
    if    v_number <= 25   then
      if public.award_society_badge(p_user_id, p_club_id, 'member_25')   then v_awarded := v_awarded + 1; end if;
    elsif v_number <= 50   then
      if public.award_society_badge(p_user_id, p_club_id, 'member_50')   then v_awarded := v_awarded + 1; end if;
    elsif v_number <= 100  then
      if public.award_society_badge(p_user_id, p_club_id, 'member_100')  then v_awarded := v_awarded + 1; end if;
    elsif v_number <= 250  then
      if public.award_society_badge(p_user_id, p_club_id, 'member_250')  then v_awarded := v_awarded + 1; end if;
    elsif v_number <= 1000 then
      if public.award_society_badge(p_user_id, p_club_id, 'member_1000') then v_awarded := v_awarded + 1; end if;
    end if;
  end if;

  -- Longevity. Cumulative — a five-year member keeps the one-year badge.
  if v_joined is not null then
    v_years := extract(epoch from (now() - v_joined)) / 31557600.0;
    if v_years >= 1  and public.award_society_badge(p_user_id, p_club_id, 'year_1')  then v_awarded := v_awarded + 1; end if;
    if v_years >= 3  and public.award_society_badge(p_user_id, p_club_id, 'year_3')  then v_awarded := v_awarded + 1; end if;
    if v_years >= 5  and public.award_society_badge(p_user_id, p_club_id, 'year_5')  then v_awarded := v_awarded + 1; end if;
    if v_years >= 10 and public.award_society_badge(p_user_id, p_club_id, 'year_10') then v_awarded := v_awarded + 1; end if;
  end if;

  return v_awarded;
end;
$$;


-- ------------------------------------------------------------
-- 6. Row level security
--
-- Both tables are public to read. That is the point — the trophy
-- case is the advertisement, and it has to work for visitors with
-- no account. Writes go only through the functions above.
-- ------------------------------------------------------------

alter table public.society_badges enable row level security;
alter table public.member_badges  enable row level security;

drop policy if exists society_badges_read on public.society_badges;
create policy society_badges_read
  on public.society_badges
  for select
  using (is_active);

drop policy if exists member_badges_read on public.member_badges;
create policy member_badges_read
  on public.member_badges
  for select
  using (true);

-- A policy permits a row; the role still needs table-level SELECT.
grant select on public.society_badges to anon, authenticated;
grant select on public.member_badges  to anon, authenticated;

grant execute on function public.sync_member_badges(uuid, uuid) to authenticated;
grant execute on function public.award_society_badge(uuid, uuid, text, text) to service_role;


-- ------------------------------------------------------------
-- 7. Backfill the badges everyone has already earned
-- ------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select m.user_id, m.club_id
    from public.club_members m
    where m.user_id is not null
      and m.status <> 'pending'
  loop
    perform public.sync_member_badges(r.user_id, r.club_id);
  end loop;
end
$$;


-- ------------------------------------------------------------
-- What you should see: every member with a number, and the
-- founding handful holding Charter Twenty-Five.
-- ------------------------------------------------------------

select m.member_number,
       coalesce(m.display_name, 'member') as name,
       m.role,
       m.status,
       coalesce(
         string_agg(b.name, ', ' order by sb.sort_order),
         '—'
       ) as badges
from public.club_members m
join public.clubs c on c.id = m.club_id
left join public.member_badges b2 on b2.user_id = m.user_id and b2.club_id = m.club_id
left join public.society_badges b  on b.key = b2.badge_key
left join public.society_badges sb on sb.key = b2.badge_key
where c.slug = 'underground-aquarium-society'
group by m.member_number, m.display_name, m.role, m.status
order by m.member_number;
