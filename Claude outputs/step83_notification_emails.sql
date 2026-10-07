-- Step 83: email notifications members can control by category.
-- Members choose, per category, whether they get an email as well as the bell,
-- and how often: bundled (at most one email an hour), once a day, or never.
-- Safe to run more than once.

alter table public.profiles
  -- Email categories this member turned off (keys from src/lib/notificationGroups.ts).
  -- Likes and bubbles start off: they're frequent and the bell covers them.
  add column if not exists email_off text[] not null default '{feed_likes,bubbles}',
  -- 'bundled' = at most one email an hour, 'daily' = one morning email, 'off' = no notification emails.
  add column if not exists email_digest text not null default 'bundled',
  add column if not exists last_digest_at timestamptz;

do $$ begin
  alter table public.profiles add constraint profiles_email_digest_check check (email_digest in ('bundled', 'daily', 'off'));
exception when duplicate_object then null; end $$;

comment on column public.profiles.email_off is 'Notification categories this member does not want emailed (see src/lib/notificationGroups.ts).';
comment on column public.profiles.email_digest is 'How often notification emails go out: bundled (max hourly), daily, or off.';

-- Everything already in the bell before today counts as handled, so the
-- first run doesn't email members a backlog of old notices.
update public.notifications set emailed_at = now() where emailed_at is null and created_at < now();

-- The email job looks for notices not emailed yet.
create index if not exists notifications_to_email_idx
  on public.notifications (created_at) where emailed_at is null;

-- Check: every profile has the defaults, nothing old is waiting.
select
  (select count(*) from public.profiles where email_digest = 'bundled') as bundled_members,
  (select count(*) from public.notifications where emailed_at is null) as waiting_to_email;
