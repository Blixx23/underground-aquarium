-- ============================================================
-- Step 58: bug-fix batch (27 Sept 2026). Run once in the Supabase SQL
-- Editor. Safe to run more than once. Three parts:
--   A. The Society can never be deleted.
--   B. Tank reports get a status so the new admin queue can track them.
--   C. Forum posts remember when they were edited.
-- The last query checks all three: every row should say ok.
-- ============================================================

-- ---------- A. Society ----------
-- ============================================================
-- Step 58 (Society): the Society club can never be deleted.
--
-- The site is one Society now. The old "Delete club" button called the
-- delete_club RPC, which would have wiped the Society, its members and
-- its dues history. The button is gone from the admin page, and this
-- trigger makes the database itself refuse, whoever asks (the RPC, the
-- service role, or a stray query). Because it raises an error, anything
-- delete_club already removed in the same call is rolled back too.
--
-- Safe to run twice: the function is replaced and the trigger is
-- dropped and recreated.
-- ============================================================

create or replace function public.prevent_society_delete()
returns trigger
language plpgsql
as $$
begin
  if old.slug = 'underground-aquarium-society' then
    raise exception 'The Underground Aquarium Society cannot be deleted.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_society_delete on public.clubs;

create trigger prevent_society_delete
  before delete on public.clubs
  for each row
  execute function public.prevent_society_delete();


-- ---------- B. Tank reports ----------
-- Step 58: admin review queue for reported tanks (safe to run more than once).
--
-- The "Report this tank" button has always saved reports into tank_reports,
-- but nothing tracked whether an admin had dealt with one. This adds a
-- status (open, resolved, dismissed) plus who closed it and when, so the new
-- Admin > Tank reports screen can show only the ones still waiting.
--
-- Existing reports all start as "open", so nothing already reported is lost.
-- Events and suggested shops need no database change.

-- In case the table was never created, make it with the columns the site uses.
create table if not exists public.tank_reports (
  id uuid primary key default gen_random_uuid(),
  tank_id uuid not null,
  reason text,
  reporter_id uuid,
  created_at timestamptz not null default now()
);

alter table public.tank_reports add column if not exists id uuid default gen_random_uuid();
alter table public.tank_reports add column if not exists created_at timestamptz not null default now();
alter table public.tank_reports add column if not exists status text not null default 'open';
alter table public.tank_reports add column if not exists reviewed_at timestamptz;
alter table public.tank_reports add column if not exists reviewed_by uuid;

-- Keep the status to the three values the admin screen understands.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tank_reports_status_check'
      and conrelid = 'public.tank_reports'::regclass
  ) then
    alter table public.tank_reports
      add constraint tank_reports_status_check
      check (status in ('open', 'resolved', 'dismissed')) not valid;
  end if;
end $$;

-- The admin screen and the badge count both ask for "open" reports.
create index if not exists tank_reports_status_idx on public.tank_reports (status, created_at desc);

-- Visitors must still be able to file a report. If this table has no insert
-- rule yet (for example it was just created above, or row level security was
-- off until now), add one. The "Report this tank" button is shown to signed
-- out visitors too (they send no reporter), so both roles may insert, but a
-- signed-in member can only file as themselves. Admin reads and updates go through
-- the server with the service role, so no extra read rule is needed.
alter table public.tank_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tank_reports' and cmd in ('INSERT', 'ALL')
  ) then
    create policy "Members can report tanks" on public.tank_reports
      for insert to anon, authenticated
      with check (reporter_id is null or reporter_id = auth.uid());
  end if;
end $$;


-- ---------- C. Forum edits ----------
-- Step 58 (forum): remember when a forum post was edited.
--
-- The thread page shows "(edited)" next to a post once its author or an admin
-- has changed it. Edits are saved by /api/forum/post with the service role,
-- which stamps this column. Safe to run more than once.

alter table public.forum_posts
  add column if not exists edited_at timestamptz;

comment on column public.forum_posts.edited_at is
  'When the author or an admin last edited this post. Null means never edited.';

-- Make sure the API picks up the new column right away.
notify pgrst, 'reload schema';


-- ---------- Check: every row should say ok ----------
select 'A. Society delete guard' as item,
       case when exists (select 1 from pg_trigger where tgname = 'prevent_society_delete' and not tgisinternal)
            then 'ok' else 'MISSING' end as status
union all
select 'B. tank_reports.status',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'tank_reports' and column_name = 'status')
            then 'ok' else 'MISSING' end
union all
select 'C. forum_posts.edited_at',
       case when exists (select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'forum_posts' and column_name = 'edited_at')
            then 'ok' else 'MISSING' end;
