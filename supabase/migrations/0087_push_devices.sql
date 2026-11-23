-- iPhone push notifications.
--
-- push_devices: one row per phone that allowed notifications, tied to the
-- member signed in on it. Only the server (service role) reads or writes it,
-- so it has row level security on and no policies.
--
-- notifications.pushed_at: set the moment a notification is claimed for
-- pushing, so it's never pushed twice.
--
-- The trigger pings the site the instant a bell notification is created for
-- someone who has the app, so the phone buzzes right away. It never blocks
-- the notification itself: any problem with the ping is ignored, and the
-- site's one-minute sweep picks it up instead.

create extension if not exists pg_net;

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null default 'ios',
  apns_env text check (apns_env in ('production', 'sandbox')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_devices_user_id_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;

alter table public.notifications add column if not exists pushed_at timestamptz;

create index if not exists notifications_created_at_idx on public.notifications (created_at);

create or replace function public.push_new_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.push_devices d where d.user_id = new.user_id) then
    begin
      perform net.http_post(
        url := 'https://www.undergroundaquarium.com/api/push/send',
        body := jsonb_build_object('id', new.id),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_push on public.notifications;

create trigger notifications_push
after insert on public.notifications
for each row execute function public.push_new_notification();

select 'push_devices ready' as status,
       (select count(*) from public.push_devices) as devices,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'notifications' and column_name = 'pushed_at') as pushed_at_column;
