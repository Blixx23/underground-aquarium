-- Notification upgrades: quiet hours, saved ads, water test reminders,
-- the come-back nudge, and the daily heartbeat's missing columns.

-- The heartbeat (api/bubbles/heartbeat) has always written these, but they
-- were never added, so last-active and login streaks weren't being kept.
alter table public.profiles
  add column if not exists last_active_date date,
  add column if not exists login_streak integer not null default 0,
  -- Water test reminders: every N days (7 or 14), null = off.
  add column if not exists water_reminder_days integer check (water_reminder_days in (7, 14)),
  add column if not exists water_reminder_last_at timestamptz,
  -- The "new ads near you" nudge after two weeks away: once per absence.
  add column if not exists comeback_nudged_at timestamptz;

-- The phone's time zone, sent by the app, so pushes can wait out the night.
alter table public.push_devices add column if not exists time_zone text;

-- A push held for quiet hours goes out at this time instead.
alter table public.notifications add column if not exists push_after timestamptz;
create index if not exists notifications_push_after_idx
  on public.notifications (push_after) where pushed_at is null and push_after is not null;

-- Ads a member saved (the heart on an ad). price_cents is the price we last
-- told them about, so a later drop can be announced once.
create table if not exists public.listing_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  price_cents integer,
  sold_notified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index if not exists listing_saves_listing_idx on public.listing_saves (listing_id);
alter table public.listing_saves enable row level security;
drop policy if exists "own saves read" on public.listing_saves;
create policy "own saves read" on public.listing_saves for select using (auth.uid() = user_id);
drop policy if exists "own saves add" on public.listing_saves;
create policy "own saves add" on public.listing_saves for insert with check (auth.uid() = user_id);
drop policy if exists "own saves remove" on public.listing_saves;
create policy "own saves remove" on public.listing_saves for delete using (auth.uid() = user_id);
