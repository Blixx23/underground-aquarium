-- Foundations Mastery: the 100-question final exam for the beginner path.
-- STEP 1 of 3. Paste into the Supabase SQL Editor and run. Then run step 2 and step 3.
-- Safe to run again.
--
-- What this does:
--   1. Adds what the exam needs (question topics and explanations, a pass mark per course,
--      server-timed exam sessions, extra fields on exam attempts).
--   2. Locks the answer key: the public can no longer read correct_index or explanations,
--      and can't read the mastery questions at all. Grading already uses the service role.
--   3. Creates the Foundations Mastery course with its 100 questions.

-- 1. Columns and tables ------------------------------------------------------
alter table public.course_questions
  add column if not exists topic text,
  add column if not exists explanation text;

alter table public.courses
  add column if not exists pass_percent integer;

create table if not exists public.course_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  correct integer not null,
  total integer not null,
  score integer not null,
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.course_exam_attempts enable row level security;
drop policy if exists "exam attempts own read" on public.course_exam_attempts;
create policy "exam attempts own read"
  on public.course_exam_attempts for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

alter table public.course_exam_attempts
  add column if not exists session_id uuid,
  add column if not exists focus_losses integer not null default 0,
  add column if not exists duration_seconds integer;

create table if not exists public.course_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  focus_losses integer not null default 0
);
create index if not exists course_exam_sessions_user_idx
  on public.course_exam_sessions (user_id, section_id, started_at desc);
alter table public.course_exam_sessions enable row level security;
drop policy if exists "exam sessions own read" on public.course_exam_sessions;
create policy "exam sessions own read"
  on public.course_exam_sessions for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 2. Lock the answer key -----------------------------------------------------
-- Browsers may read only the question text and options, never correct_index or explanation.
revoke select on public.course_questions from anon, authenticated;
grant select (id, section_id, prompt, options, sort_order) on public.course_questions to anon, authenticated;

-- 3. The course --------------------------------------------------------------
do $do$
declare
  cid uuid;
  sid uuid;
  opts_type text;
  has_rls boolean;
begin
  select udt_name into opts_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_questions' and column_name = 'options';

  select id into cid from public.courses where slug = 'foundations-mastery';
  if cid is null then
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order, pass_percent)
    values (
      'foundations-mastery',
      'Foundations Mastery',
      'The final test of everything a new fish keeper needs to know',
      'A 100-question exam covering every beginner course. Unlocks once you have completed them all. Pass with 90% or better to earn Foundations Master.',
      120,
      'Foundations Master',
      null,
      true,
      1000,
      90
    )
    returning id into cid;

    insert into public.course_sections (course_id, title, content, has_video, video_url, sort_order)
    values (cid, 'Mastery exam', $c$The final test of the beginner path. 100 questions drawn from every beginner course. You have 120 minutes, and you need 90% to pass.

Pass, and you earn **Foundations Master**: a certificate and a mastery emblem on your profile.$c$, false, null, 0)
    returning id into sid;

    raise notice 'Foundations Mastery created';
  else
    raise notice 'Foundations Mastery already exists';
  end if;

  -- Mastery questions are invisible to the public; the exam page reads them
  -- server-side only once a member has unlocked the exam.
  select relrowsecurity into has_rls from pg_class where oid = 'public.course_questions'::regclass;
  if has_rls then
    execute 'drop policy if exists "hide mastery questions" on public.course_questions';
    execute $p$
      create policy "hide mastery questions" on public.course_questions
      as restrictive for select to anon, authenticated
      using (section_id not in (
        select s.id from public.course_sections s
        join public.courses c on c.id = s.course_id
        where c.slug = 'foundations-mastery'
      ))
    $p$;
  end if;
end
$do$;

select c.title, c.pass_percent,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
where c.slug = 'foundations-mastery';
