-- Step 68: Key dates (Admin > Dashboard > Key dates tab)
-- Renewals, legal deadlines and other dates Chris can't miss.
-- Admin only: RLS is on with no policies, so only the server (service role) reads or writes it.

create table if not exists public.important_dates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due_on date not null,
  category text not null default 'other',
  notes text,
  link text,
  -- Repeats every N months (e.g. 36 for the copyright agent). Null = one-off.
  repeat_months integer check (repeat_months is null or repeat_months between 1 and 120),
  -- How many days before due_on it starts showing on the Dashboard.
  remind_days integer not null default 30 check (remind_days between 0 and 365),
  -- due_on minus remind_days, kept by the app, so the Dashboard can count "due soon" simply.
  remind_on date not null,
  done_at timestamptz,
  last_done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists important_dates_open_idx on public.important_dates (remind_on) where done_at is null;

alter table public.important_dates enable row level security;

-- The AI team can read it (nothing private in here).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'ops_reader') then
    grant select on public.important_dates to ops_reader;
  end if;
end $$;

-- The dates we already know about.
insert into public.important_dates (title, due_on, category, notes, link, repeat_months, remind_days, remind_on)
select * from (values
  ('Renew DMCA copyright agent (DMCA-1081928)', date '2029-10-04', 'legal',
   'Renew at the Copyright Office or lose the safe harbor. $6. Update the Terms page if the address or phone changes.',
   'https://dmca.copyright.gov', 36, 60, date '2029-10-04' - 60),
  ('New Terms of Service take effect for existing members', date '2026-11-04', 'legal',
   'Arbitration, one-year claim limit and anti-scraping terms start applying to members who joined before Oct 4, 2026. Send members the notice before this, and get a lawyer to look it over.',
   'https://www.undergroundaquarium.com/terms', null, 30, date '2026-11-04' - 30)
) as v(title, due_on, category, notes, link, repeat_months, remind_days, remind_on)
where not exists (select 1 from public.important_dates d where d.title = v.title);

select count(*) as key_dates from public.important_dates;
