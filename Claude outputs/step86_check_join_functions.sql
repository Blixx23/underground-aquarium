-- Step 86 (read only): shows how joining the Society works inside the database,
-- so the "give your info, then pay right away" flow can be built on the real rules.
-- Changes nothing. Copy the whole result back to Claude.

select p.proname as function_name, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('accept_invite', 'create_invite', 'join_club', 'update_my_club_contact', 'is_in_good_standing')
union all
select 'club_members columns',
       string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position)
from information_schema.columns
where table_schema = 'public' and table_name = 'club_members';
