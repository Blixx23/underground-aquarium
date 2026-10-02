-- Step 68: seven missing Neocaridina shrimp profiles.
-- Red Rili, Blue Rili, Carbon Rili, Bloody Mary, Fire Red, Painted Fire Red, Blue Diamond.
--
-- Each new profile is a copy of the Cherry Shrimp row (so every care stat,
-- group and setting matches it exactly), with its own name, aliases and
-- write-up, listed as a variant under Cherry Shrimp like Blue Dream is.
-- Profiles that already exist are skipped, so it's safe to run more than once.

do $$
declare
  cols text;
  v record;
begin
  if not exists (select 1 from public.species where slug = 'cherry-shrimp') then
    raise exception 'Cherry Shrimp (cherry-shrimp) not found; nothing to copy from.';
  end if;

  -- Every column except ones the database fills in itself (id, timestamps).
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'species'
    and column_name not in ('id', 'created_at', 'updated_at')
    and coalesce(is_identity, 'NO') = 'NO'
    and coalesce(is_generated, 'NEVER') = 'NEVER';

  for v in
    select * from (values
      (
        'red-rili-shrimp',
        'Red Rili Shrimp',
        array['Rili Shrimp', 'Red Rili', 'Red Rili Cherry Shrimp'],
        'A Neocaridina color form with a red head and tail and a clear band through the middle. Same easy care as cherry shrimp.',
        'Rili shrimp are a pattern form of Neocaridina davidi: color on the head and tail, with a clear or nearly clear section across the middle. Red is the original Rili line. Grading comes down to how clean that clear section is, and a little red speckling there is normal. Care and breeding match cherry shrimp exactly. Some young come out solid red or mostly clear, so keep the best-patterned adults breeding to hold the look, and keep them apart from other Neocaridina colors or the young drift back toward wild brown.'
      ),
      (
        'blue-rili-shrimp',
        'Blue Rili Shrimp',
        array['Blue Rili'],
        'The Rili pattern on a blue line: blue head and tail with a clear middle. Same easy care as cherry shrimp.',
        'Blue Rili shrimp have a blue head and tail with a clear band through the middle, the Rili pattern carried on a blue Neocaridina line. They are a little less consistent than Red Rili, and some young come out solid blue or washed out, so choosing which adults breed matters. Care is the same as any Neocaridina: stable water, no copper, and plenty of biofilm to graze. Keep them apart from other Neocaridina colors to keep the pattern.'
      ),
      (
        'carbon-rili-shrimp',
        'Carbon Rili Shrimp',
        array['Black Rili', 'Black Rili Shrimp', 'Carbon Rili'],
        'A dark Rili form: black to blue-black head and tail with a clear middle. Same easy care as cherry shrimp.',
        'Carbon Rili shrimp carry the Rili pattern in black or very dark blue-black, with a dark head and tail and a clear middle. They show best against light sand and bright green plants. Color can range from charcoal to deep blue-black, and young that come out solid dark are normal for the line. Care and breeding match cherry shrimp. Keep them apart from other Neocaridina colors.'
      ),
      (
        'bloody-mary-shrimp',
        'Bloody Mary Shrimp',
        array['Bloody Mary', 'Bloody Mary Cherry Shrimp'],
        'A deep, glassy red Neocaridina line. The color sits under a clear shell, so it looks dark and translucent rather than painted.',
        'Bloody Mary shrimp are one of the deepest reds in Neocaridina. The red is in the body under a glassy, clear shell, so they look dark red and almost see-through rather than solid and painted like Fire Red. They hold their color best over a dark substrate. Care and breeding are the same as cherry shrimp. Keep them away from other red lines and other colors if you want the young to keep the look.'
      ),
      (
        'fire-red-shrimp',
        'Fire Red Shrimp',
        array['Fire Red Cherry Shrimp', 'Fire Red', 'Sakura Fire Red'],
        'A high grade of red cherry shrimp: solid, even red over the whole body. Same easy care as cherry shrimp.',
        'Fire Red is a high grade of red cherry shrimp, with solid, even red over the whole body and little or no clear showing. Red cherry grades run from Cherry, to Sakura, to Fire Red, with Painted Fire Red at the top. Care is identical to cherry shrimp. Moving the paler young to another tank keeps the colony''s color strong over generations.'
      ),
      (
        'painted-fire-red-shrimp',
        'Painted Fire Red Shrimp',
        array['PFR', 'Painted Fire Red', 'Painted Red Cherry Shrimp'],
        'The top grade of red cherry shrimp: fully solid red that looks painted on, legs included.',
        'Painted Fire Red is the highest grade of red Neocaridina: a fully opaque, solid red that looks painted on, with no clear areas even on the legs. They are bred up from Fire Red lines and cost more than regular cherries. Care matches cherry shrimp. To keep the grade, breed only the most solid red adults and move paler young to a separate tank.'
      ),
      (
        'blue-diamond-shrimp',
        'Blue Diamond Shrimp',
        array['Blue Diamond', 'Blue Diamond Neocaridina'],
        'A bright, even blue Neocaridina line, often lighter and shinier than Blue Dream. Same easy care as cherry shrimp.',
        'Blue Diamond shrimp are a bright, even blue Neocaridina line, usually a lighter, shinier blue than Blue Dream. Color can fade with stress, a water change or a molt and comes back as they settle, and a dark background brings it out. Care and breeding are the same as cherry shrimp. Keep them apart from other Neocaridina colors to keep the young blue.'
      )
    ) as t(slug, common_name, aka, summary, body)
  loop
    if exists (select 1 from public.species where slug = v.slug) then
      raise notice 'Skipped %, already there', v.slug;
      continue;
    end if;

    drop table if exists pg_temp.new_species;
    execute format('create temp table new_species as select %s from public.species where slug = %L', cols, 'cherry-shrimp');

    update pg_temp.new_species set
      slug          = v.slug,
      common_name   = v.common_name,
      also_known_as = v.aka,
      summary       = v.summary,
      body          = v.body,
      parent_slug   = 'cherry-shrimp',
      origin        = 'Selectively bred Neocaridina davidi';

    execute format('insert into public.species (%s) select %s from pg_temp.new_species', cols, cols);
  end loop;

  drop table if exists pg_temp.new_species;
end $$;

-- Check: Cherry Shrimp and all its variants, new ones included.
select slug, common_name, scientific_name, parent_slug, care_level, temp_min_f, temp_max_f
from public.species
where slug = 'cherry-shrimp' or parent_slug = 'cherry-shrimp'
order by parent_slug nulls first, common_name;
