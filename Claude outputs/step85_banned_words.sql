-- Step 85: banned words are starred out (****) when members save text.
-- Not strict: everyday cussing (fuck, shit, hell, damn, ass) is allowed.
-- Starred: porn and sexual terms, the nasty words, and hate slurs.
-- Whole words only, any capitals, so "cocktail", "spicy", "Scunthorpe" and
-- fish words like "anal fin", "sexing" and "spawning" are never touched.
-- Covers forum threads and replies, feed posts, shop reviews and owner
-- replies, shop posts, classifieds and their messages, tank names and
-- comments, events, and profile names and bios. Safe to run more than once.
-- To add or remove a word later, edit the list below and run this again.

create or replace function public.mask_bad_words(input text)
returns text
language plpgsql
immutable
set search_path = public
as $fn$
declare
  words constant text[] := array[
    -- the nasty words
    'cunt','cunts','whore','whores','slut','sluts','slutty','twat','twats',
    -- porn and sexual
    'porn','porno','pornos','porns','pornography','pornographic','pornhub','xvideos','xhamster','onlyfans','xxx',
    'dildo','dildos','blowjob','blowjobs','handjob','handjobs','rimjob','cumshot','cumshots','cum','jizz',
    'hentai','milf','milfs','pussy','pussies','cock','cocks','cocksucker','cocksuckers','titties','tits',
    'gangbang','bukkake','nudes',
    -- hate slurs
    'nigger','niggers','nigga','niggas','faggot','faggots','fag','fags','dyke','dykes','tranny','trannies',
    'chink','chinks','spic','spics','kike','kikes','wetback','wetbacks','gook','gooks','beaner','beaners',
    'raghead','ragheads','towelhead','towelheads','coon','coons','retard','retards','retarded'
  ];
  pattern text;
  found text;
  out text := input;
begin
  if input is null or input = '' then
    return input;
  end if;
  -- \m and \M are word edges, so only whole words match.
  pattern := '\m(' || array_to_string(words, '|') || ')\M';
  for found in
    select distinct lower(m[1]) from regexp_matches(input, pattern, 'gi') as m
  loop
    out := regexp_replace(out, '\m' || found || '\M', repeat('*', length(found)), 'gi');
  end loop;
  return out;
end;
$fn$;

-- One trigger function for every table. Each table says which of its
-- columns are member writing; columns a table doesn't have are skipped.
create or replace function public.mask_member_text()
returns trigger
language plpgsql
set search_path = public
as $fn$
declare
  row_json jsonb := to_jsonb(new);
  col text;
begin
  foreach col in array tg_argv loop
    if row_json ? col and jsonb_typeof(row_json -> col) = 'string' then
      row_json := jsonb_set(row_json, array[col], to_jsonb(public.mask_bad_words(row_json ->> col)));
    end if;
  end loop;
  new := jsonb_populate_record(new, row_json);
  return new;
end;
$fn$;

do $do$
declare
  t record;
begin
  for t in
    select * from (values
      ('forum_threads',     array['title','body']),
      ('forum_posts',       array['body']),
      ('feed_posts',        array['body']),
      ('store_reviews',     array['body']),
      ('review_responses',  array['body']),
      ('store_posts',       array['title','body']),
      ('listings',          array['title','description']),
      ('listing_messages',  array['body']),
      ('tanks',             array['name','description']),
      ('tank_comments',     array['body']),
      ('events',            array['title','description']),
      ('profiles',          array['full_name','bio'])
    ) as v(tbl, cols)
  loop
    if to_regclass('public.' || t.tbl) is not null then
      execute format('drop trigger if exists mask_member_text on public.%I', t.tbl);
      execute format(
        'create trigger mask_member_text before insert or update on public.%I for each row execute function public.mask_member_text(%s)',
        t.tbl,
        (select string_agg(quote_literal(c), ', ') from unnest(t.cols) as c)
      );
    end if;
  end loop;
end
$do$;

-- Check: the first two lines should come back starred, the last two untouched.
select public.mask_bad_words('What a whore of a store, total SLUTS') as starred
union all select public.mask_bad_words('check out my pornhub link')
union all select public.mask_bad_words('Fuck yeah, this shit is a hell of a tank')
union all select public.mask_bad_words('Sexing my cockatoo? No, sexing my bettas by the anal fin, spicy food, Scunthorpe');
