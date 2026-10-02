-- step65_sick_fish_thread.sql
-- Posts "My fish is sick and I don't know why. What do I do?" in Fish Health,
-- as Chris. Adds one thread and its opening post; changes nothing else.
-- Safe to run more than once: it won't post a duplicate.

do $$
declare
  v_cat    uuid;
  v_author uuid;
  v_thread uuid;
  v_slug   text := 'my-fish-is-sick-and-i-dont-know-why-what-do-i-do';
begin
  select id into v_cat from public.forum_categories where slug = 'fish-health';
  if v_cat is null then
    raise exception 'Fish Health category not found.';
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
          'My fish is sick and I don''t know why. What do I do?',
          '{}', false)
  returning id into v_thread;

  insert into public.forum_posts (thread_id, author_id, body, is_op, parent_id)
  values (v_thread, v_author, $body$Your fish is acting weird, looks sick, or just isn't itself, and you have no idea why. That's a scary feeling. Here's what to do, step by step. Most of the time, you can turn things around.

## Step 1: Don't panic, and don't grab medicine yet

It's tempting to run to the store and dump a bottle of medicine in the tank. Don't do that yet. The wrong medicine can make things worse, and some medicines can kill the good bacteria that keep your tank safe.

Most sick fish are sick because of **the water**, not a germ. So we start there.

## Step 2: Test your water

This is the most important step. You can't see what's wrong with water just by looking at it. Clear water can still be dangerous.

Test for these:

- **Ammonia:** should be **0**
- **Nitrite:** should be **0**
- **Nitrate:** under **40** is okay, lower is better
- **pH:** it should stay steady, not jump around
- **Temperature:** most tropical fish like **74 to 80°F**

If ammonia or nitrite is anything above 0, that's very likely your problem. They are like poison to fish.

No test kit? Most local fish stores will test your water for free or for a couple of dollars. Bring a clean cup of your tank water. You can also put your numbers into our **Water Check** tool to see what they mean.

## Step 3: Do a water change

Whatever the test says, a water change almost always helps.

1. Take out about **25 to 30 percent** of the water.
2. Add new water that's close to the same temperature as the tank. Use your hand or a thermometer.
3. **Always** add water conditioner (dechlorinator) to the new water. Tap water has chlorine that hurts fish.

If ammonia or nitrite is high, do a water change today and another one tomorrow.

## Step 4: Look closely and write it down

Watch your fish for a few minutes. What do you see? Writing it down helps you, and it helps anyone you ask for help.

- **White dots like salt or sugar** on the body or fins
- **Fins that look torn, ragged or are getting shorter**
- **Gasping at the top** of the water
- **Breathing fast**
- **Clamped fins** (fins held tight against the body)
- **Hiding** a lot more than normal
- **Not eating**
- **Swimming sideways, upside down, or struggling to stay up**
- **Fuzzy or cotton-like patches**
- **Swollen belly** or **eyes that stick out**
- **Scratching** against rocks or decorations

## Step 5: Think about what changed

Sickness usually follows a change. Ask yourself:

- Did I add **new fish** in the last few weeks?
- Did I **clean the filter** or change a lot of water at once?
- Is the tank **new** (less than 2 months old)?
- Did the **heater** break or the room get cold?
- Am I **feeding too much**? Leftover food rots and pollutes the water.
- Did I use soap, spray cleaner or lotion near the tank?

## Step 6: Simple things that help while you figure it out

- **Feed less.** Feed a small amount once a day, or skip a day. Fish are fine without food for a couple of days.
- **Keep the lights low** so the fish feels less stressed.
- **Make sure there's air movement** at the top of the water, especially if fish are gasping.
- **Take out any dead fish right away.**
- **If one fish is sick and you have a spare tank**, move it there so it can rest and doesn't spread anything.

## Step 7: Only then, think about medicine

Once your water is good and you know what the sign looks like, medicine can help. For example, white dots are often **ich**, and there are medicines made just for it.

A few rules:

- **Only use one medicine at a time.** Mixing them can be deadly.
- **Follow the directions exactly.**
- **Take the carbon out of your filter** while you use medicine, or it will soak the medicine up.
- **Be careful with shrimp, snails and some catfish.** Many medicines can hurt them. Read the label.

## Step 8: Ask for help

You don't have to figure this out alone. Post a reply or start a thread here with:

- A **photo or short video** of the fish
- Your **water test numbers**
- **Tank size**, how long it's been set up, and what fish live in it
- **What you've seen**, and when it started

The more you share, the faster people can help. You can also call or visit your local fish store. They see sick fish every day.

## The short version

1. Don't panic, and don't grab medicine yet.
2. Test your water.
3. Do a water change.
4. Look closely and write down what you see.
5. Think about what changed.
6. Feed less and keep things calm.
7. Use medicine only when you know what you're treating.
8. Ask for help here with photos and your water numbers.

You've got this. Good water fixes more fish problems than anything else.$body$, true, null);
end $$;

-- Check: the thread is there.
select t.title, c.name as category, p.username as posted_by, t.created_at
from public.forum_threads t
join public.forum_categories c on c.id = t.category_id
left join public.profiles p on p.id = t.author_id
where t.slug = 'my-fish-is-sick-and-i-dont-know-why-what-do-i-do';
