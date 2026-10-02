-- Final exam results: every attempt is recorded with its score.
-- Paste into the Supabase SQL Editor and run once. Safe to run again.

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

create index if not exists course_exam_attempts_user_course_idx
  on public.course_exam_attempts (user_id, course_id, created_at desc);

alter table public.course_exam_attempts enable row level security;

-- Members can see their own results; admins can see everyone's.
-- Only the server (grading) writes rows.
drop policy if exists "exam attempts own read" on public.course_exam_attempts;
create policy "exam attempts own read"
  on public.course_exam_attempts for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

select 'exam attempts ready' as status;
