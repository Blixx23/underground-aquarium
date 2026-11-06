-- Step 87: classified alerts and Wanted matching.
-- listing_alerts: a member's saved "tell me when someone near me lists ___".
-- listing_alert_hits: which ads each alert has already told them about, so
--   nobody hears about the same ad twice.
-- listing_wanted_matches: which Wanted posts have already been matched with
--   which ads, for the same reason.
-- Safe to run more than once.

-- Stop with a plain message if the listings table isn't what this expects.
do $$
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'listings' and column_name = 'id') is distinct from 'uuid' then
    raise exception 'Step 87 expects listings.id to be a uuid. Nothing was changed. Send this message to Claude.';
  end if;
end $$;

create table if not exists public.listing_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Words that must all appear in the ad. Null means any ad in the category.
  query text check (query is null or char_length(query) <= 80),
  -- A classifieds category key. Null means every category.
  category text check (category is null or char_length(category) <= 40),
  -- The center of the search and how it reads, e.g. "Sacramento, CA".
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  place_label text not null check (char_length(place_label) between 1 and 80),
  radius_miles integer not null default 50 check (radius_miles between 5 and 250),
  -- Also tell them about Wanted posts (people looking to buy).
  include_wanted boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_hit_at timestamptz
);

create index if not exists listing_alerts_user_idx on public.listing_alerts (user_id);
create index if not exists listing_alerts_active_idx on public.listing_alerts (active) where active;

alter table public.listing_alerts enable row level security;

-- Members manage only their own alerts. The site's server does the matching.
drop policy if exists "own alerts: read" on public.listing_alerts;
create policy "own alerts: read" on public.listing_alerts
  for select using (auth.uid() = user_id);
drop policy if exists "own alerts: add" on public.listing_alerts;
create policy "own alerts: add" on public.listing_alerts
  for insert with check (auth.uid() = user_id);
drop policy if exists "own alerts: change" on public.listing_alerts;
create policy "own alerts: change" on public.listing_alerts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own alerts: remove" on public.listing_alerts;
create policy "own alerts: remove" on public.listing_alerts
  for delete using (auth.uid() = user_id);

create table if not exists public.listing_alert_hits (
  alert_id uuid not null references public.listing_alerts(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (alert_id, listing_id)
);
create index if not exists listing_alert_hits_listing_idx on public.listing_alert_hits (listing_id);
-- Server only: no policies, so members can't read or write it directly.
alter table public.listing_alert_hits enable row level security;

create table if not exists public.listing_wanted_matches (
  wanted_id uuid not null references public.listings(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wanted_id, listing_id)
);
create index if not exists listing_wanted_matches_listing_idx on public.listing_wanted_matches (listing_id);
alter table public.listing_wanted_matches enable row level security;

-- Check: should list the three tables.
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('listing_alerts', 'listing_alert_hits', 'listing_wanted_matches')
order by table_name;
