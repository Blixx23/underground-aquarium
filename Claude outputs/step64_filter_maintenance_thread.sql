-- step64_filter_maintenance_thread.sql
-- Posts the "Hang-on-back filter won't start after cleaning?" thread in
-- Equipment & DIY, as Chris. Adds one thread and its opening post; changes
-- nothing else. Safe to run more than once: it won't post a duplicate.

do $$
declare
  v_cat    uuid;
  v_author uuid;
  v_thread uuid;
  v_slug   text := 'hang-on-back-filter-wont-start-after-cleaning';
begin
  select id into v_cat from public.forum_categories where slug = 'equipment-diy';
  if v_cat is null then
    raise exception 'Equipment & DIY category not found.';
  end if;

  select id into v_author
  from public.profiles
  where is_admin
  order by (lower(username) in ('chris_lewis', 'salmon868')) desc, created_at
  limit 1;
  if v_author is null then
    raise exception 'No admin account found to post as.';
  end if;

  if exists (select 1 from public.forum_threads where category_id = v_cat and slug = v_slug) then
    raise notice 'Already posted. Nothing to do.';
    return;
  end if;

  insert into public.forum_threads (category_id, author_id, slug, title, images, is_seeded)
  values (v_cat, v_author, v_slug,
          'Hang-on-back filter won''t start after cleaning? Try this before you buy a new one',
          '{}', false)
  returning id into v_thread;

  insert into public.forum_posts (thread_id, author_id, body, is_op, parent_id)
  values (v_thread, v_author, $body$Your filter was running fine. You gave it a good cleaning, hung it back on the tank, plugged it in, and now... nothing. Maybe a hum, maybe a click, maybe a weak trickle. Don't panic, and don't throw it out yet. This happens a lot after maintenance, and it's usually a quick fix.

## First, the quick checks

Unplug the filter before you touch anything.

- **Is the filter box full of water?** Most hang-on-back filters need water in the box to start pulling. Fill it to the top with tank water and plug it back in.
- **Is the tank water high enough?** If the water line is below the intake, the filter is sucking air. Top off the tank.
- **Is the intake tube pushed all the way in?** A loose tube lets air in and the filter won't prime.
- **Is the motor cover seated?** If the top of the motor housing isn't clicked down fully, some filters won't run right.

## Clean the motor, not just the media

A lot of people rinse the sponge and cartridge and skip the motor. The motor is usually the problem.

Under the filter, where the intake tube plugs in, is the **impeller**. It's the little part that looks like a propeller, sitting on a thin metal or ceramic shaft with a magnet on it. It spins to move the water. Gunk, snail shells, sand and slime build up around it and slow it down or stop it.

1. Pull the intake tube out.
2. Pop off the impeller cover and slide the impeller out. Be careful: the thin shaft is easy to lose or bend.
3. Rinse the impeller and wipe the magnet clean.
4. Clean out the hole it sits in (the impeller well). An old toothbrush or a cotton swab works great.
5. If you see white crusty buildup, soak the parts in a little vinegar for a few minutes, then rinse well.
6. Check that the small rubber caps on the ends of the shaft are still there, then put it all back together the way it came out.

## Still stuck or struggling? Give it a kick start

This is the one most people don't know. Sometimes, even after a good cleaning, the impeller just won't get going on its own. The fix:

1. Hang the filter back on the tank **without the intake tube**, so you can see the opening where the impeller sits.
2. Fill the filter box with tank water.
3. Plug it in.
4. Take a **toothpick** (wood or plastic, never metal) and gently poke through the opening to give the impeller blade a little nudge, like flicking a pinwheel.

Nine times out of ten it catches and starts spinning right away. Once it's running, unplug it, put the intake tube back on, and plug it back in.

Keep your fingers out of the opening, and don't leave it running dry for long.

## If it still won't run

- **Humming but not spinning:** the impeller or shaft may be worn or cracked. Replacement impellers are cheap and easy to swap, and your local fish store usually carries them.
- **Rattling or grinding:** the shaft may be bent or the rubber caps missing.
- **Completely silent:** check the outlet and the power cord. If there's still nothing, the motor may be done.

## To keep it from happening again

- Clean the impeller every time you do a full filter cleaning, not just the media.
- Rinse your media in tank water, not tap water, so you keep your good bacteria.
- Snails love hanging out in the impeller well. A quick check every month or so saves a headache.

Got a filter that still won't start after all this? Post the brand and model below and we'll help you sort it out.$body$, true, null);
end $$;

-- Check: the thread is there.
select t.title, c.name as category, p.username as posted_by, t.created_at
from public.forum_threads t
join public.forum_categories c on c.id = t.category_id
left join public.profiles p on p.id = t.author_id
where t.slug = 'hang-on-back-filter-wont-start-after-cleaning';
