-- AI team: Support Desk bookkeeping. Paste into the Supabase SQL Editor and run once. Safe to run again.
-- Remembers which support emails the Support Desk has already handled, so it never drafts twice.

create table if not exists public.ops_support_seen (
  message_id text primary key,
  thread_id text,
  action text not null,
  draft_id text,
  created_at timestamptz not null default now()
);

alter table public.ops_support_seen enable row level security;
drop policy if exists "ops admin read" on public.ops_support_seen;
create policy "ops admin read" on public.ops_support_seen for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

select 'ops_support_seen ready' as status;
