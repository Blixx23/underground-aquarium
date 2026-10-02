-- Step 57: site-wide search speed-ups (safe to run more than once).
--
-- Site search asks the database for stores, classifieds and events whose
-- text CONTAINS the words typed. Without an index Postgres reads every row
-- to answer that. Trigram (pg_trgm) indexes let it jump straight to the
-- matching rows, so search stays fast at 10x the shops and ads.
-- Nothing about the data changes.

create extension if not exists pg_trgm with schema extensions;

do $$
declare
  s text;  -- whichever schema pg_trgm actually lives in
begin
  select n.nspname into s
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_trgm';

  execute format('create index if not exists fish_stores_name_trgm on public.fish_stores using gin (name %I.gin_trgm_ops)', s);
  execute format('create index if not exists fish_stores_city_trgm on public.fish_stores using gin (city %I.gin_trgm_ops)', s);
  execute format('create index if not exists listings_title_trgm on public.listings using gin (title %I.gin_trgm_ops)', s);
  execute format('create index if not exists listings_description_trgm on public.listings using gin (description %I.gin_trgm_ops)', s);
  execute format('create index if not exists events_title_trgm on public.events using gin (title %I.gin_trgm_ops)', s);
end $$;

-- Check: should list 5 indexes.
select tablename, indexname
from pg_indexes
where schemaname = 'public' and indexname like '%\_trgm' escape '\'
order by tablename, indexname;
