-- Certified Breeder: Guppy + Bristlenose Pleco for the admin account.
-- Clones your approved Angelfish spawn log, swaps the species, and approves it
-- on a random date in the past year. Safe to run again (skips species you already have).

do $do$
declare
  src     jsonb;
  sp      record;
  d       timestamptz;
  rec     jsonb;
  wanted  text[][] := array[
    array['Guppy',             '%guppy%',       '%reticulata%'],
    array['Bristlenose Pleco', '%bristlenose%', '%ancistrus%']
  ];
  i int;
begin
  select to_jsonb(l) into src
  from public.spawn_logs l
  join public.profiles p on p.id = l.user_id
  where p.is_admin and l.status = 'approved'
  order by l.decided_at nulls last
  limit 1;

  if src is null then
    raise exception 'No approved spawn log found on the admin account to copy from';
  end if;

  for i in 1 .. array_length(wanted, 1) loop
    select s.id, s.common_name, s.points into sp
    from public.club_award_species s
    where s.club_id = (src->>'club_id')::uuid
      and (s.common_name ilike wanted[i][2] or s.scientific_name ilike wanted[i][3])
    order by length(s.common_name)
    limit 1;

    if exists (
      select 1 from public.spawn_logs l
      where l.user_id = (src->>'user_id')::uuid and l.status = 'approved'
        and ((sp.id is not null and l.species_id = sp.id) or l.species_name ilike wanted[i][2])
    ) then
      raise notice '% already certified, skipped', wanted[i][1];
      continue;
    end if;

    -- Random approval date between 20 and 330 days ago.
    d := now() - ((20 + floor(random() * 310))::int * interval '1 day')
               - (floor(random() * 86400)::int * interval '1 second');

    rec := src || jsonb_build_object(
      'id',                  gen_random_uuid(),
      'species_id',          sp.id,
      'species_name',        coalesce(sp.common_name, wanted[i][1]),
      'challenge_code',      upper(substr(md5(random()::text), 1, greatest(length(coalesce(src->>'challenge_code', '')), 6))),
      'status',              'approved',
      'opened_at',           d - interval '42 days',
      'submitted_at',        d - interval '4 days',
      'decided_at',          d,
      'created_at',          d - interval '42 days',
      'updated_at',          d,
      'points_awarded',      coalesce(sp.points, (src->>'points_awarded')::int),
      'is_first_in_society', false,
      'judge_reason',        null,
      'appeal_reason',       null,
      'appealed_at',         null
    );

    insert into public.spawn_logs
    select * from jsonb_populate_record(null::public.spawn_logs, rec);

    raise notice '% certified on %', coalesce(sp.common_name, wanted[i][1]), d::date;
  end loop;
end
$do$;

-- Check: every approved species on your account.
select l.species_name, l.decided_at::date as certified_on, l.points_awarded
from public.spawn_logs l
join public.profiles p on p.id = l.user_id
where p.is_admin and l.status = 'approved'
order by l.decided_at;
