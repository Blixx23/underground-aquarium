-- Step 67: the Wholesale list.
-- Businesses that reply "we're wholesale only" move off the shop directory
-- onto their own list (status 'wholesale'), kept apart from shops and out
-- of every shop email. Nothing is deleted; "Back to shops" undoes it.
-- Safe to run more than once.

-- 1. Allow the status 'wholesale' (plain text, a check rule, or an enum).
do $$
declare
  col_type text;
  c record;
begin
  select udt_name into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'fish_stores' and column_name = 'status';

  if col_type not in ('text', 'varchar', 'bpchar') then
    execute format('alter type public.%I add value if not exists %L', col_type, 'wholesale');
  end if;

  for c in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.fish_stores'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
      and pg_get_constraintdef(oid) not ilike '%wholesale%'
  loop
    execute format('alter table public.fish_stores drop constraint %I', c.conname);
    execute format(
      'alter table public.fish_stores add constraint %I %s',
      c.conname,
      regexp_replace(c.def, 'ARRAY\[', 'ARRAY[''wholesale''::text, ')
    );
  end loop;
end $$;

-- 2. What you track about each wholesaler.
alter table public.fish_stores add column if not exists wholesale_at timestamptz;
alter table public.fish_stores add column if not exists wholesale_stage text;
alter table public.fish_stores add column if not exists wholesale_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.fish_stores'::regclass and conname = 'fish_stores_wholesale_stage_check'
  ) then
    alter table public.fish_stores
      add constraint fish_stores_wholesale_stage_check
      check (wholesale_stage is null or wholesale_stage in ('prospect', 'contacted', 'signed', 'not_interested'));
  end if;
end $$;

create index if not exists fish_stores_wholesale_idx
  on public.fish_stores (wholesale_at desc)
  where status = 'wholesale';

-- Check: the status rule (if any) now includes 'wholesale', and today's counts.
select 'rule' as what, conname as name, pg_get_constraintdef(oid) as detail
from pg_constraint
where conrelid = 'public.fish_stores'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
union all
select 'count', coalesce(status::text, '(none)'), count(*)::text
from public.fish_stores
group by status;
