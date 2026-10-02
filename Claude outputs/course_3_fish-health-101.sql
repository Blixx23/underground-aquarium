-- Fish Health 101: creates the course with 6 lessons, images, quizzes and a 20-question final exam.
-- Paste all of this into the Supabase SQL Editor and click Run.
do $do$
declare
  cid uuid;
  sid uuid;
  opts_type text;
  next_sort int;
begin
  select udt_name into opts_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_questions' and column_name = 'options';

  -- ==================== Fish Health 101 ====================
  if not exists (select 1 from public.courses where slug = $c$fish-health-101$c$) then
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.courses;
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order)
    values ($c$fish-health-101$c$, $c$Fish Health 101$c$, $c$Spot problems early and know what to do$c$, $c$Learn what a healthy fish looks like, why water problems cause most sickness, and how to handle the five health problems beginners see most. Plus how to set up a simple hospital tank.$c$, 35, $c$Fish Medic$c$, $c$/course-media/fish-health-101/00-course-cover.png$c$, true, next_sort)
    returning id into cid;

    -- 1. Know what normal looks like
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Know what normal looks like$c$, $c$You can't spot a sick fish until you know how your healthy fish act. Spend a minute every day just watching your tank, especially at feeding time.

**Signs of a healthy fish:**

- Swims normally and holds its fins open
- Eats eagerly
- Has clear eyes and clean, even fins
- Breathes at a calm, steady pace
- Has normal color for its kind

**Early warning signs:**

- **Clamped fins:** fins held tight against the body
- **Hiding** much more than usual
- **Not eating**
- **Gasping** at the surface or breathing fast
- **Rubbing** or scraping against rocks or decor (called "flashing")
- **Spots, fuzz, or cloudy patches** on the body or fins
- **Color fading** or turning dark

**Why daily checks matter:** most fish problems are easy to fix when caught early, and much harder after a few days. Counting your fish every day also helps you notice if one goes missing, so you can find and remove it before it fouls the water.$c$, false, null, $c$/course-media/fish-health-101/01-normal.png$c$, 0)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What are clamped fins?$q$, $j$["Fins that are extra long", "Fins held tight against the body", "Fins with spots"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What are clamped fins?$q$, array(select jsonb_array_elements_text($j$["Fins that are extra long", "Fins held tight against the body", "Fins with spots"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why count your fish every day?$q$, $j$["It isn't useful", "To decide how much light to use", "To notice if one goes missing or dies"]$j$::jsonb, 2, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why count your fish every day?$q$, array(select jsonb_array_elements_text($j$["It isn't useful", "To decide how much light to use", "To notice if one goes missing or dies"]$j$::jsonb)), 2, 1);
    end if;

    -- 2. Check the water first
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Check the water first$c$, $c$Here's the most important rule in fish health: **most sickness starts with the water.** Poor water stresses fish, and stressed fish get sick far more easily.

**When a fish looks sick, start here:**

1. **Test your water.** Check ammonia, nitrite, nitrate, pH, and temperature.
2. **Fix any problems.** If ammonia or nitrite is above zero, or nitrate is high, do a water change with conditioned water.
3. **Look for the cause.** Overfeeding? A new fish? A heater problem? A dirty filter?
4. **Then decide on medicine.** Only treat once you know what you're dealing with.

**Why not just add medicine?** If the water is the problem, medicine won't fix it. Some medicines can also harm your filter bacteria, shrimp, or snails. Fixing the water first often clears up mild problems on its own.

**Common stress causes:**

- Ammonia or nitrite above zero
- Temperature swings
- Overcrowding
- Bullying tankmates
- A new fish that brought in disease

Log your results in Water Check so you can see what changed.$c$, false, null, $c$/course-media/fish-health-101/02-water-first.png$c$, 1)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What causes most fish sickness?$q$, $j$["Bad luck", "Too many plants", "Problems with the water"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What causes most fish sickness?$q$, array(select jsonb_array_elements_text($j$["Bad luck", "Too many plants", "Problems with the water"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A fish looks sick. What should you do first?$q$, $j$["Test your water", "Buy a new fish", "Add medicine right away"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A fish looks sick. What should you do first?$q$, array(select jsonb_array_elements_text($j$["Test your water", "Buy a new fish", "Add medicine right away"]$j$::jsonb)), 0, 1);
    end if;

    -- 3. Ich: white spot disease
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Ich: white spot disease$c$, $c$**Ich** (pronounced "ick") is one of the most common fish diseases. It's caused by a tiny parasite. It looks like someone sprinkled **salt grains** on your fish.

**Signs:**

- Small white dots on the body, fins, and gills
- Fish rubbing against objects
- Clamped fins and fast breathing

**What causes it:** the parasite is often brought in on new fish. Stress, like a sudden temperature drop, makes outbreaks more likely.

**How ich spreads:** the parasite lives on the fish for a few days. Then it drops off, multiplies, and releases many new parasites that look for fish. Medicine only kills the parasite during its free-swimming stage, not while it's on the fish. That's why treatment takes time.

**How to treat it:**

1. Treat the **whole tank**, since every fish has been exposed.
2. Slowly raise the temperature to about **82 to 86°F** if all your fish can handle it. Warmer water speeds up the parasite's life cycle so medicine works faster. Add extra surface movement for oxygen.
3. Use an ich medicine and follow the label.
4. Keep treating for **several days after the last spot is gone.**

**Careful:** many ich medicines can harm shrimp, snails, and some scaleless fish. Read the label first.$c$, false, null, $c$/course-media/fish-health-101/03-ich.png$c$, 2)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does ich usually look like?$q$, $j$["Red streaks", "Cotton-like tufts", "White dots like salt grains"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does ich usually look like?$q$, array(select jsonb_array_elements_text($j$["Red streaks", "Cotton-like tufts", "White dots like salt grains"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do you keep treating ich after the spots are gone?$q$, $j$["Medicine only kills the free-swimming stage, so some parasites may still be on the way", "It's not needed", "To make the fish grow"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do you keep treating ich after the spots are gone?$q$, array(select jsonb_array_elements_text($j$["Medicine only kills the free-swimming stage, so some parasites may still be on the way", "It's not needed", "To make the fish grow"]$j$::jsonb)), 0, 1);
    end if;

    -- 4. Fin rot and fungus
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Fin rot and fungus$c$, $c$**Fin rot** is a bacterial infection that eats away at fins. It almost always starts with poor water or stress.

**Signs of fin rot:**

- Fin edges look ragged, torn, or melted
- Edges may turn white, red, or black
- Fins get shorter over time

**How to treat fin rot:**

1. Test the water and fix any problems. This is the most important step.
2. Do extra water changes for a week or two.
3. If it keeps getting worse, use an antibacterial medicine made for fish.
4. Keep bullies away. Nipping can look like fin rot and can lead to it.

Mild fin rot often heals with clean water alone. Fins can grow back once the fish is healthy.

**Fungus** looks like white or gray **cotton-like tufts** on the body, mouth, or fins. It often grows on a fish that already has a wound or is weak from stress.

**How to treat fungus:**

1. Fix the water first.
2. Use an antifungal medicine for fish.
3. Remove uneaten food and anything rotting, since fungus grows on decaying matter too.

**Note:** a bacterial infection called columnaris can look a lot like fungus. If antifungal medicine doesn't help within a few days, ask an experienced keeper or your local fish store.

**Tip:** fuzzy white growth on uneaten food or a dead fish is fungus too. Remove it right away.$c$, false, null, $c$/course-media/fish-health-101/04-fin-rot.png$c$, 3)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually starts fin rot?$q$, $j$["Live plants", "Poor water or stress", "Too much light"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually starts fin rot?$q$, array(select jsonb_array_elements_text($j$["Live plants", "Poor water or stress", "Too much light"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does fungus usually look like?$q$, $j$["White or gray cotton-like tufts", "Tiny black dots", "Bright red fins"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does fungus usually look like?$q$, array(select jsonb_array_elements_text($j$["White or gray cotton-like tufts", "Tiny black dots", "Bright red fins"]$j$::jsonb)), 0, 1);
    end if;

    -- 5. Bloat, dropsy and swim bladder
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Bloat, dropsy and swim bladder$c$, $c$These three problems can look alike, but they are very different.

**Constipation and bloat:**

- The fish's belly looks swollen.
- It may float oddly or have trouble swimming.
- Often caused by **overfeeding** or dry food that swells in the stomach.

**What to do:** stop feeding for 1 to 2 days. For many fish that eat plants or a mixed diet, a small piece of cooked, shelled pea afterward can help things move. Then feed smaller amounts.

**Swim bladder problems:**

- The fish floats upside down, sinks, or swims tilted.
- Common in fancy goldfish and bettas.
- Often linked to overfeeding or constipation, but not always.

Try fasting for 1 to 2 days and keep the water clean. Skip the pea for meat-eaters like bettas.

**Dropsy (the serious one):**

- The belly swells **and** the scales stick out like a **pinecone** when you look from above.
- Dropsy is a sign of serious internal sickness, often organ failure.
- Sadly, many fish with dropsy don't recover.

**What to do:** move the fish to a hospital tank, keep the water very clean, and talk to an experienced keeper or your local fish store. Then test your main tank's water, since stress often plays a part.$c$, false, null, $c$/course-media/fish-health-101/05-bloat.png$c$, 4)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is a first step for a constipated, bloated fish?$q$, $j$["Feed double", "Turn off the heater", "Stop feeding for 1 to 2 days"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is a first step for a constipated, bloated fish?$q$, array(select jsonb_array_elements_text($j$["Feed double", "Turn off the heater", "Stop feeding for 1 to 2 days"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the warning sign of dropsy?$q$, $j$["Scales sticking out like a pinecone", "Torn fins", "White spots"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the warning sign of dropsy?$q$, array(select jsonb_array_elements_text($j$["Scales sticking out like a pinecone", "Torn fins", "White spots"]$j$::jsonb)), 0, 1);
    end if;

    -- 6. The hospital tank
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$The hospital tank$c$, $c$A **hospital tank** is a small, simple tank kept just for sick or new fish. It's one of the best tools a fish keeper can have.

**Why use one?**

- Medicine can harm your filter bacteria, plants, shrimp, and snails. Treating in a separate tank protects your main tank.
- It's easier to watch one fish and see if it's eating.
- Medicine dosing is more accurate in a small, bare tank.
- Sick fish get a break from bullies.

**What you need:**

- A small tank, often 5 to 10 gallons
- A heater and thermometer
- A **sponge filter**. Keep a spare one running in your main tank all the time, so it's already full of good bacteria when you need it.
- A hiding spot, like a plastic plant or a piece of PVC pipe
- No gravel, so it's easy to keep clean

**Medicating tips:**

- **Dose by the actual water volume,** not the tank size on the box.
- **Remove activated carbon** from the filter while medicating. Carbon pulls medicine out of the water.
- Do small water changes and test often. Hospital tanks can build up ammonia quickly.

**The same tank works for quarantine.** Our Buying Healthy Fish course shows you how.$c$, false, null, $c$/course-media/fish-health-101/06-hospital.png$c$, 5)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why should you remove activated carbon while medicating?$q$, $j$["Carbon heats the water", "Carbon makes medicine stronger", "Carbon pulls medicine out of the water"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why should you remove activated carbon while medicating?$q$, array(select jsonb_array_elements_text($j$["Carbon heats the water", "Carbon makes medicine stronger", "Carbon pulls medicine out of the water"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How should you dose medicine in a hospital tank?$q$, $j$["By the size printed on the box", "By the actual amount of water", "A full bottle at once"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How should you dose medicine in a hospital tank?$q$, array(select jsonb_array_elements_text($j$["By the size printed on the box", "By the actual amount of water", "A full bottle at once"]$j$::jsonb)), 1, 1);
    end if;

    -- Final exam
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, 'Final exam', $c$Twenty questions covering the whole course. Score 80% or better (16 of 20) to pass and earn your **Fish Medic** certificate and badge.

You'll see your score and the right answers when you finish. If you don't pass, you can take it again.$c$, false, null, $c$/course-media/fish-health-101/00-course-cover.png$c$, 6)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these is a sign of a healthy fish?$q$, $j$["Eating eagerly", "Clamped fins", "Rubbing against rocks"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these is a sign of a healthy fish?$q$, array(select jsonb_array_elements_text($j$["Eating eagerly", "Clamped fins", "Rubbing against rocks"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is "flashing"?$q$, $j$["Changing color quickly", "Jumping out of the tank", "Rubbing or scraping against objects"]$j$::jsonb, 2, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is "flashing"?$q$, array(select jsonb_array_elements_text($j$["Changing color quickly", "Jumping out of the tank", "Rubbing or scraping against objects"]$j$::jsonb)), 2, 1);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why are daily checks so useful?$q$, $j$["They replace water changes", "Fish like being watched", "Problems are easier to fix when caught early"]$j$::jsonb, 2, 2);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why are daily checks so useful?$q$, array(select jsonb_array_elements_text($j$["They replace water changes", "Fish like being watched", "Problems are easier to fix when caught early"]$j$::jsonb)), 2, 2);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Most fish sickness starts with:$q$, $j$["The decorations", "The light", "The water"]$j$::jsonb, 2, 3);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Most fish sickness starts with:$q$, array(select jsonb_array_elements_text($j$["The decorations", "The light", "The water"]$j$::jsonb)), 2, 3);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might medicine not help a sick fish?$q$, $j$["If the real problem is the water", "Fish can't take medicine", "Medicine always helps"]$j$::jsonb, 0, 4);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might medicine not help a sick fish?$q$, array(select jsonb_array_elements_text($j$["If the real problem is the water", "Fish can't take medicine", "Medicine always helps"]$j$::jsonb)), 0, 4);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these can cause stress that leads to sickness?$q$, $j$["Clean water", "Steady temperature", "Ammonia above zero"]$j$::jsonb, 2, 5);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these can cause stress that leads to sickness?$q$, array(select jsonb_array_elements_text($j$["Clean water", "Steady temperature", "Ammonia above zero"]$j$::jsonb)), 2, 5);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Ich is caused by:$q$, $j$["Too much food", "A tiny parasite", "Cold water alone"]$j$::jsonb, 1, 6);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Ich is caused by:$q$, array(select jsonb_array_elements_text($j$["Too much food", "A tiny parasite", "Cold water alone"]$j$::jsonb)), 1, 6);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How is ich often brought into a tank?$q$, $j$["On new fish", "Through the light", "From fish flakes"]$j$::jsonb, 0, 7);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How is ich often brought into a tank?$q$, array(select jsonb_array_elements_text($j$["On new fish", "Through the light", "From fish flakes"]$j$::jsonb)), 0, 7);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why does raising the temperature help when treating ich?$q$, $j$["It speeds up the parasite's life cycle so medicine works faster", "It cools the fish down", "It kills the fish's bacteria"]$j$::jsonb, 0, 8);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why does raising the temperature help when treating ich?$q$, array(select jsonb_array_elements_text($j$["It speeds up the parasite's life cycle so medicine works faster", "It cools the fish down", "It kills the fish's bacteria"]$j$::jsonb)), 0, 8);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When treating ich, you should treat:$q$, $j$["The whole tank", "Only the plants", "Only the fish with spots"]$j$::jsonb, 0, 9);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When treating ich, you should treat:$q$, array(select jsonb_array_elements_text($j$["The whole tank", "Only the plants", "Only the fish with spots"]$j$::jsonb)), 0, 9);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Many ich medicines can harm:$q$, $j$["Shrimp and snails", "Gravel", "Heaters"]$j$::jsonb, 0, 10);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Many ich medicines can harm:$q$, array(select jsonb_array_elements_text($j$["Shrimp and snails", "Gravel", "Heaters"]$j$::jsonb)), 0, 10);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What do fins with fin rot look like?$q$, $j$["Covered in white dots", "Ragged, torn, or melted at the edges", "Extra long and flowing"]$j$::jsonb, 1, 11);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What do fins with fin rot look like?$q$, array(select jsonb_array_elements_text($j$["Covered in white dots", "Ragged, torn, or melted at the edges", "Extra long and flowing"]$j$::jsonb)), 1, 11);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the most important step in treating fin rot?$q$, $j$["Adding more fish", "Fixing the water", "Feeding more"]$j$::jsonb, 1, 12);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the most important step in treating fin rot?$q$, array(select jsonb_array_elements_text($j$["Adding more fish", "Fixing the water", "Feeding more"]$j$::jsonb)), 1, 12);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Fungus often grows on fish that:$q$, $j$["Are perfectly healthy", "Already have a wound or are stressed", "Live in planted tanks"]$j$::jsonb, 1, 13);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Fungus often grows on fish that:$q$, array(select jsonb_array_elements_text($j$["Are perfectly healthy", "Already have a wound or are stressed", "Live in planted tanks"]$j$::jsonb)), 1, 13);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can cause bloat and constipation?$q$, $j$["A thermometer", "Overfeeding", "Too many plants"]$j$::jsonb, 1, 14);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can cause bloat and constipation?$q$, array(select jsonb_array_elements_text($j$["A thermometer", "Overfeeding", "Too many plants"]$j$::jsonb)), 1, 14);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can help many plant-eating fish with constipation after a short fast?$q$, $j$["A bigger meal of flakes", "A small piece of cooked, shelled pea", "Salt"]$j$::jsonb, 1, 15);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can help many plant-eating fish with constipation after a short fast?$q$, array(select jsonb_array_elements_text($j$["A bigger meal of flakes", "A small piece of cooked, shelled pea", "Salt"]$j$::jsonb)), 1, 15);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Scales sticking out like a pinecone is a sign of:$q$, $j$["Fin rot", "Dropsy", "Ich"]$j$::jsonb, 1, 16);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Scales sticking out like a pinecone is a sign of:$q$, array(select jsonb_array_elements_text($j$["Fin rot", "Dropsy", "Ich"]$j$::jsonb)), 1, 16);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why use a hospital tank for medicine?$q$, $j$["Because it looks nice", "To protect the main tank's bacteria, plants, and inverts", "Medicine only works in small tanks"]$j$::jsonb, 1, 17);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why use a hospital tank for medicine?$q$, array(select jsonb_array_elements_text($j$["Because it looks nice", "To protect the main tank's bacteria, plants, and inverts", "Medicine only works in small tanks"]$j$::jsonb)), 1, 17);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What filter works best in a hospital tank?$q$, $j$["A sponge filter already full of good bacteria", "A brand-new carbon filter", "No filter at all"]$j$::jsonb, 0, 18);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What filter works best in a hospital tank?$q$, array(select jsonb_array_elements_text($j$["A sponge filter already full of good bacteria", "A brand-new carbon filter", "No filter at all"]$j$::jsonb)), 0, 18);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why doesn't a hospital tank usually have gravel?$q$, $j$["Gravel heats the water", "Fish dislike gravel", "It's easier to keep clean"]$j$::jsonb, 2, 19);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why doesn't a hospital tank usually have gravel?$q$, array(select jsonb_array_elements_text($j$["Gravel heats the water", "Fish dislike gravel", "It's easier to keep clean"]$j$::jsonb)), 2, 19);
    end if;

    raise notice 'Fish Health 101 created';
  else
    raise notice 'Fish Health 101 already exists, skipped';
  end if;

end
$do$;

select c.sort_order, c.title,
       (select count(*) from public.course_sections s where s.course_id = c.id) as lessons,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
order by c.sort_order;
