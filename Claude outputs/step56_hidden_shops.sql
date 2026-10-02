-- Step 56: let a shop page be "hidden" (off the directory, not deleted).
-- Works whether fish_stores.status is plain text, text with a check rule,
-- or an enum. Safe to run more than once.

do $$
declare
  col_type text;
  c record;
begin
  select udt_name into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'fish_stores' and column_name = 'status';

  -- Enum: add the new value.
  if col_type not in ('text', 'varchar', 'bpchar') then
    execute format('alter type public.%I add value if not exists %L', col_type, 'hidden');
  end if;

  -- Check rule listing the allowed values: add 'hidden' to it.
  for c in
    select conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where conrelid = 'public.fish_stores'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
      and pg_get_constraintdef(oid) not ilike '%hidden%'
  loop
    execute format('alter table public.fish_stores drop constraint %I', c.conname);
    execute format(
      'alter table public.fish_stores add constraint %I %s',
      c.conname,
      regexp_replace(c.def, 'ARRAY\[', 'ARRAY[''hidden''::text, ')
    );
  end loop;
end $$;

-- Check: shows the status rule (if any) now including 'hidden', and today's counts.
select conname, pg_get_constraintdef(oid) as rule
from pg_constraint
where conrelid = 'public.fish_stores'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%';

select status, count(*) from public.fish_stores group by status order by 2 desc;
