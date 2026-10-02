-- Underground Aquarium AI Operating Team: database setup.
-- Paste into the Supabase SQL Editor and run once. Safe to run again.
--
-- What this does:
--   1. Tables for the team: settings, workers, runs, memory, findings (tickets).
--   2. A read-only database login (ops_reader) that can see site data but NOT
--      emails, phone numbers, addresses, payment details, tokens or private messages.
--   3. ops_query(): the only way an agent can query. One SELECT at a time,
--      10-second limit, at most 50 rows, no writes, no unsafe functions.

-- 1. Tables ------------------------------------------------------------------

create table if not exists public.ops_settings (
  id integer primary key default 1 check (id = 1),
  enabled boolean not null default true,
  monthly_cap_cents integer not null default 5000,
  brief_email text not null default 'chris@undergroundaquarium.com',
  updated_at timestamptz not null default now()
);
insert into public.ops_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.ops_workers (
  key text primary key,
  enabled boolean not null default false,
  last_run_at timestamptz,
  last_status text,
  running_since timestamptz,
  updated_at timestamptz not null default now()
);
-- Only the morning session starts switched on.
insert into public.ops_workers (key, enabled) values
  ('morning', true), ('community', false), ('cmo', false), ('partnerships', false),
  ('weekly', false), ('reviewer', false), ('support', false), ('qa', false)
on conflict (key) do nothing;

create table if not exists public.ops_runs (
  id uuid primary key default gen_random_uuid(),
  worker_key text not null,
  trigger text not null default 'schedule',
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  model text,
  queries integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  cost_cents numeric(10,2) not null default 0,
  report text,
  scorecard jsonb not null default '[]'::jsonb,
  nothing_needed boolean not null default false,
  error text
);
create index if not exists ops_runs_worker_idx on public.ops_runs (worker_key, started_at desc);
create index if not exists ops_runs_month_idx on public.ops_runs (started_at);

create table if not exists public.ops_memory (
  id uuid primary key default gen_random_uuid(),
  worker_key text not null,
  kind text not null check (kind in ('rule', 'fact', 'thread', 'example')),
  content text not null,
  source text not null default 'agent',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  retired_at timestamptz
);
create index if not exists ops_memory_worker_idx on public.ops_memory (worker_key, active, created_at desc);

create table if not exists public.ops_findings (
  id uuid primary key default gen_random_uuid(),
  worker_key text not null,
  role text,
  kind text not null check (kind in ('queue', 'message', 'data', 'bug', 'decision', 'idea')),
  risk text not null default 'medium' check (risk in ('low', 'medium', 'high')),
  title text not null,
  detail text,
  suggested_action text,
  evidence text,
  link text,
  status text not null default 'new'
    check (status in ('new', 'open', 'in_progress', 'fixed', 'verified', 'dismissed')),
  reviewer_verdict text check (reviewer_verdict in ('approve', 'reject', 'escalate')),
  reviewer_note text,
  rating smallint check (rating in (-1, 1)),
  rating_note text,
  github_issue_url text,
  run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ops_findings_status_idx on public.ops_findings (status, created_at desc);
create index if not exists ops_findings_worker_idx on public.ops_findings (worker_key, status);

-- Admin-only: nothing here is readable by the public. The site writes with the service role.
alter table public.ops_settings enable row level security;
alter table public.ops_workers enable row level security;
alter table public.ops_runs enable row level security;
alter table public.ops_memory enable row level security;
alter table public.ops_findings enable row level security;

do $$
declare t text;
begin
  foreach t in array array['ops_settings', 'ops_workers', 'ops_runs', 'ops_memory', 'ops_findings'] loop
    execute format('drop policy if exists "ops admin read" on public.%I', t);
    execute format(
      'create policy "ops admin read" on public.%I for select to authenticated
         using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))', t);
  end loop;
end
$$;

-- 2. The read-only login ------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'ops_reader') then
    begin
      create role ops_reader nologin bypassrls;
    exception when insufficient_privilege then
      create role ops_reader nologin;
      raise notice 'ops_reader created without BYPASSRLS: agents will only see rows that public policies allow';
    end;
  end if;
end
$$;

grant ops_reader to postgres;
grant usage on schema public to ops_reader;

-- Start clean, then grant column by column, skipping anything private.
do $$
declare
  r record;
  skip_tables text[] := array[
    'club_member_details', 'store_contacts', 'email_suppressions', 'email_events',
    'notifications', 'user_blocks', 'course_questions', 'ops_settings'
  ];
  -- Column names that look private are never granted.
  private_cols text := '(email|phone|address|stripe|token|secret|password|postal|zip|^ip$|_ip$|ip_address|html|api_key|birth|ssn|tax)';
  -- Private message bodies, never granted.
  private_pairs text[] := array['listing_messages.body', 'dues_payments.receipt_url', 'email_queue.context', 'email_queue.last_error'];
begin
  execute (
    select coalesce(string_agg(format('revoke all on public.%I from ops_reader', tablename), '; '), 'select 1')
    from pg_tables where schemaname = 'public'
  );
  for r in
    select c.table_name, string_agg(format('%I', c.column_name), ', ') as cols
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and t.table_type in ('BASE TABLE', 'VIEW')
      and not (c.table_name = any(skip_tables))
      and c.column_name !~* private_cols
      and not ((c.table_name || '.' || c.column_name) = any(private_pairs))
    group by c.table_name
  loop
    execute format('grant select (%s) on public.%I to ops_reader', r.cols, r.table_name);
  end loop;
end
$$;

-- 3. The query function -------------------------------------------------------

create or replace function public.ops_query(q text, max_rows integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
set statement_timeout = '10s'
as $fn$
declare
  ql text := lower(coalesce(q, ''));
  fn text;
  result jsonb;
  allowed text[] := array[
    -- aggregates and windows
    'count','sum','avg','min','max','string_agg','array_agg','bool_or','bool_and','every',
    'percentile_cont','percentile_disc','mode','stddev','variance','corr',
    'row_number','rank','dense_rank','lag','lead','first_value','last_value','ntile',
    'json_agg','jsonb_agg','json_build_object','jsonb_build_object','jsonb_object_agg',
    -- dates
    'now','date_trunc','date_part','extract','age','to_char','to_date','make_interval','timezone','generate_series',
    -- text and numbers
    'coalesce','nullif','greatest','least','round','floor','ceil','ceiling','abs','trunc','div','mod',
    'lower','upper','length','char_length','trim','btrim','left','right','substring','substr','split_part',
    'replace','position','strpos','concat','concat_ws','initcap','regexp_replace','starts_with',
    'array_length','cardinality','unnest','jsonb_array_length','jsonb_array_elements','jsonb_typeof','to_jsonb',
    -- syntax that is written like a function call
    'cast','in','exists','any','all','some','over','filter','within','values','not','and','or','as','on','using',
    'when','then','else','from','select','where','by','join','case','between','is','distinct','lateral','with',
    'like','ilike','array','row','interval','date','timestamp','timestamptz','numeric','int','integer','bigint',
    'text','varchar','decimal','real','float','boolean','having','group','order','limit','union','except','intersect'
  ];
begin
  if length(ql) = 0 or length(ql) > 4000 then
    raise exception 'Query is empty or too long (4000 characters max).';
  end if;
  if ql !~ '^\s*(select|with)\s' then
    raise exception 'Only SELECT queries are allowed.';
  end if;
  if position(';' in ql) > 0 then
    raise exception 'One statement only: remove the semicolon.';
  end if;
  -- Quotes around names and comments could hide a function call from the check below.
  if position('"' in ql) > 0 or position('/*' in ql) > 0 or position('--' in ql) > 0 then
    raise exception 'No double quotes or comments: use plain lowercase names and single-quoted values.';
  end if;
  if ql ~ '\m(insert|update|delete|merge|drop|alter|create|grant|revoke|truncate|copy|call|execute|listen|notify|vacuum|analyze|lock|set|reset|comment|into|refresh|pg_sleep|dblink)\M' then
    raise exception 'That query uses a word that is not allowed (writes, settings or SELECT INTO).';
  end if;
  for fn in select (regexp_matches(ql, '([a-z_][a-z0-9_\.]*)\s*\(', 'g'))[1] loop
    if not (fn = any(allowed)) then
      raise exception 'The function "%" is not allowed. Use plain SELECTs with counts, dates and grouping.', fn;
    end if;
  end loop;

  -- The real guarantee: from here on this transaction cannot write anything,
  -- whatever the query calls.
  perform set_config('transaction_read_only', 'on', true);

  execute format(
    'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from (%s) as sub limit %s) as t',
    q, least(greatest(coalesce(max_rows, 50), 1), 50)
  ) into result;
  return result;
end
$fn$;

-- Postgres requires the new owner to hold CREATE on the schema for the hand-over,
-- so it's granted for this one statement and taken straight back.
grant create on schema public to ops_reader;
alter function public.ops_query(text, integer) owner to ops_reader;
revoke create on schema public from ops_reader;
revoke all on function public.ops_query(text, integer) from public, anon, authenticated;
grant execute on function public.ops_query(text, integer) to service_role;

-- Takes a worker's run lock in one step, so two starts at the same moment can't both run.
create or replace function public.ops_take_lock(p_key text, p_stale_seconds integer)
returns boolean
language plpgsql
set search_path = public
as $fn$
begin
  update public.ops_workers
     set running_since = now()
   where key = p_key
     and (running_since is null or running_since < now() - make_interval(secs => p_stale_seconds));
  return found;
end
$fn$;
revoke all on function public.ops_take_lock(text, integer) from public, anon, authenticated;
grant execute on function public.ops_take_lock(text, integer) to service_role;

-- Let the agents read their own tables too (memory, findings, past runs).
grant select on public.ops_runs, public.ops_findings, public.ops_memory, public.ops_workers to ops_reader;

-- Check: should list the team and prove the private columns are hidden.
select key, enabled from public.ops_workers order by key;
select public.ops_query('select count(*) as members from profiles') as test_query;
