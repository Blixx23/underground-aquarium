-- Course levels and Society members-only classes.
-- Paste into the Supabase SQL Editor and run once. Safe to run again.

alter table public.courses
  add column if not exists level text not null default 'beginner',
  add column if not exists members_only boolean not null default false;

do $do$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'courses_level_check'
  ) then
    alter table public.courses
      add constraint courses_level_check check (level in ('beginner', 'intermediate', 'expert'));
  end if;
end
$do$;

-- Both current courses are beginner courses, open to everyone.
update public.courses set level = 'beginner', members_only = false
where slug in ('new-tank-owner', 'nitrogen-cycle');

select title, level, members_only, is_published from public.courses order by sort_order;
