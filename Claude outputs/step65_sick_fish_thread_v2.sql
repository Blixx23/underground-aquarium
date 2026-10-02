-- step65_sick_fish_thread.sql  (version 2)
-- Posts "My fish is sick and I don't know why. What do I do?" in Fish Health,
-- as Chris. If the thread was already posted by the first version, this
-- updates its text instead of posting a second copy. Changes nothing else.

do $$
declare
  v_cat    uuid;
  v_author uuid;
  v_thread uuid;
  v_slug   text := 'my-fish-is-sick-and-i-dont-know-why-what-do-i-do';
  v_title  text := 'My fish is sick and I don''t know why. What do I do?';
  v_body   text := $body$Your fish is acting weird, looks sick, or just isn't itself, and you have no idea why. That's a scary feeling. The good news: most of the time you can turn it around, and the fix is usually simpler than you think.

Here's what to do, in order.

## Right now: the first 10 minutes

- **Check the heater and thermometer.** Is the water too hot or too cold?
- **Make sure the filter is running** and the water surface is moving.
- **Take out any dead fish** and any uneaten food you can see.
- **Don't add any medicine yet.** (More on why below.)

## Step 1: Test your water

This is the most important step. Clear water can still be dangerous. You can't see the problem just by looking.

Test for these:

- **Ammonia:** should be **0**
- **Nitrite:** should be **0**
- **Nitrate:** under **40** is okay, lower is better
- **pH:** should stay steady, not jump around
- **Temperature:** most tropical fish like **74 to 80°F**

If ammonia or nitrite is anything above 0, that's very likely your problem. They are poison to fish, even in small amounts.

No test kit? Most local fish stores will test your water for free or for a couple of dollars. Bring a clean cup of tank water. You can also put your numbers into our **Water Check** tool to see what they mean.

## Step 2: Do a water change

Whatever the test says, clean water almost always helps.

1. Take out about **25 to 30 percent** of the water.
2. Add new water that's close to the same temperature. Check with a thermometer or your hand.
3. **Always** add water conditioner (dechlorinator). Tap water has chlorine that burns fish gills.

If ammonia or nitrite is high, do a water change today and another one tomorrow. Keep going until the test reads 0.

## Step 3: Look closely and write it down

Watch your fish for a few minutes. Writing down what you see helps you, and it helps anyone you ask for help.

- **White dots like salt or sugar** on the body or fins
- **Fins that look torn or ragged,** or are getting shorter
- **Gasping at the top** of the water, or breathing fast
- **Clamped fins** (held tight against the body)
- **Hiding** a lot more than normal
- **Not eating**
- **Swimming sideways, upside down,** or struggling to stay level
- **Fuzzy or cotton-like patches**
- **Swollen belly** or **eyes that stick out**
- **Scratching** or rubbing against rocks and decorations

## Step 4: Think about what changed

Fish usually get sick after something changes. Ask yourself:

- Did I add **new fish or plants** in the last few weeks?
- Did I **clean the filter** or change a lot of water at once?
- Is the tank **new** (less than 2 months old)?
- Did the **heater** break, or did the room get cold?
- Am I **feeding too much?** Leftover food rots and pollutes the water.
- Did I use **soap, spray cleaner, bug spray or lotion** near the tank?

Often the answer to "why is my fish sick?" is hiding in this list.

## Step 5: Make life easy for your fish

While you figure things out, help your fish rest and heal:

- **Feed less.** A small amount once a day, or skip a day. Fish are fine without food for a couple of days, and less food means cleaner water.
- **Keep the lights low** so your fish feels safe.
- **Add air** (an air stone, or point the filter at the surface), especially if fish are gasping.
- **If one fish is sick and you have a spare tank,** move it there so it can rest and doesn't spread anything.

## Step 6: Medicine, and why less is more

Once your water is clean and you know what you're looking at, medicine can help. For example, white dots that look like salt are usually **ich**, and there are medicines made just for it.

But here's the big lesson: **doing a little, carefully, is better than throwing a bunch of different medicines in the tank.** Here's why:

- **Your fish is already weak.** Every medicine is a little stressful, even the good ones. Adding lots of them can be the thing that finally tips a sick fish over.
- **Medicines can react with each other.** Two medicines that are each safe on their own can become harmful when mixed. You won't see it happen until it's too late.
- **Many brands have the same stuff inside.** Two bottles with different names can have the same medicine in them, so using both can accidentally double the dose.
- **Medicine can kill the good bacteria** in your filter that clean the water. Then ammonia goes up, and your fish get sicker from the water, not the disease.
- **Some medicines lower the oxygen** in the water, and a sick fish needs oxygen more than ever.
- **You won't know what worked.** If you add three things and your fish gets better (or worse), you can't tell which one did it. Next time, you're guessing again.
- **Shrimp, snails and some catfish** are hurt easily by many medicines.

So the rules are simple:

1. **One medicine at a time.** Pick the one that matches what you see.
2. **Follow the directions exactly.** More is not better.
3. **Finish the treatment** before trying something else, unless it's clearly making things worse.
4. **Do a water change before switching** to a different medicine.
5. **Take the carbon out of your filter** while you treat, or it will soak the medicine up.
6. **Read the label** if you have shrimp, snails or catfish.

When you're not sure what's wrong, clean water and patience are the safest medicine there is.

## Step 7: Ask for help

You don't have to figure this out alone. Reply here or start a new thread with:

- A **photo or short video** of the fish
- Your **water test numbers**
- **Tank size**, how long it's been set up, and what else lives in it
- **What you've seen**, and when it started
- **Anything you've already added** (medicines, salt, water treatments)

The more you share, the faster people can help. Your local fish store is a great place to ask too. They see sick fish every day.

## The short version

1. Check the heater and filter, and remove anything dead.
2. Test your water.
3. Do a water change.
4. Write down what you see.
5. Think about what changed.
6. Feed less and keep things calm.
7. Use one medicine at a time, only once you know what you're treating.
8. Ask for help with photos and your water numbers.

You've got this. Good water fixes more fish problems than anything else.$body$;
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

  select id into v_thread from public.forum_threads where category_id = v_cat and slug = v_slug;

  if v_thread is not null then
    -- Already posted by version 1: update the text in place.
    update public.forum_threads set title = v_title where id = v_thread;
    update public.forum_posts set body = v_body where thread_id = v_thread and is_op;
    raise notice 'Updated the existing thread.';
    return;
  end if;

  insert into public.forum_threads (category_id, author_id, slug, title, images, is_seeded)
  values (v_cat, v_author, v_slug, v_title, '{}', false)
  returning id into v_thread;

  insert into public.forum_posts (thread_id, author_id, body, is_op, parent_id)
  values (v_thread, v_author, v_body, true, null);
end $$;

-- Check: the thread is there.
select t.title, c.name as category, p.username as posted_by, t.created_at
from public.forum_threads t
join public.forum_categories c on c.id = t.category_id
left join public.profiles p on p.id = t.author_id
where t.slug = 'my-fish-is-sick-and-i-dont-know-why-what-do-i-do';
