-- Creates the "The Nitrogen Cycle" course: 7 lessons + final exam, every quiz,
-- and a branded image on each lesson. Paste into the Supabase SQL Editor and run once.
-- Needs course_media.sql run first (it adds course_sections.image_url).
-- Safe to run again: if the course already exists, it only brings the final exam up to 20 questions.
do $do$
declare
  cid uuid;
  sid uuid;
  opts_type text;
begin
  select udt_name into opts_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_questions' and column_name = 'options';

  -- Already created earlier: just bring the final exam up to 20 questions.
  if exists (select 1 from public.courses where slug = 'nitrogen-cycle') then
    select s.id into sid
    from public.course_sections s join public.courses c on c.id = s.course_id
    where c.slug = 'nitrogen-cycle' and s.title = 'Final exam';
    if sid is null then
      raise notice 'nitrogen-cycle exists but has no Final exam lesson, nothing changed';
      return;
    end if;
    if (select count(*) from public.course_questions where section_id = sid) >= 20 then
      raise notice 'Final exam already has 20 questions, nothing changed';
      return;
    end if;
    update public.course_sections set content = replace(content, 'Ten questions', 'Twenty questions') where id = sid;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does nitrite do to fish?$q$, $j$["Burns their fins", "Stops their blood from carrying oxygen", "Turns the water green", "Nothing harmful"]$j$::jsonb, 1, 10);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does nitrite do to fish?$q$, array(select jsonb_array_elements_text($j$["Burns their fins", "Stops their blood from carrying oxygen", "Turns the water green", "Nothing harmful"]$j$::jsonb)), 1, 10);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How long does a fishless cycle usually take?$q$, $j$["2 to 3 days", "Exactly 1 week", "4 to 8 weeks", "6 months"]$j$::jsonb, 2, 11);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How long does a fishless cycle usually take?$q$, array(select jsonb_array_elements_text($j$["2 to 3 days", "Exactly 1 week", "4 to 8 weeks", "6 months"]$j$::jsonb)), 2, 11);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which water temperature helps speed up a cycle?$q$, $j$["78 to 82\u00b0F", "60 to 65\u00b0F", "Under 55\u00b0F", "It makes no difference"]$j$::jsonb, 0, 12);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which water temperature helps speed up a cycle?$q$, array(select jsonb_array_elements_text($j$["78 to 82\u00b0F", "60 to 65\u00b0F", "Under 55\u00b0F", "It makes no difference"]$j$::jsonb)), 0, 12);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which kind of test kit is generally more accurate?$q$, $j$["Test strips", "Liquid drop kits", "They're identical"]$j$::jsonb, 1, 13);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which kind of test kit is generally more accurate?$q$, array(select jsonb_array_elements_text($j$["Test strips", "Liquid drop kits", "They're identical"]$j$::jsonb)), 1, 13);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A healthy, cycled tank usually reads:$q$, $j$["Ammonia 1, nitrite 0, nitrate 0", "Ammonia 0, nitrite 1, nitrate 10", "All three at exactly 0, always", "Ammonia 0, nitrite 0, some nitrate"]$j$::jsonb, 3, 14);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A healthy, cycled tank usually reads:$q$, array(select jsonb_array_elements_text($j$["Ammonia 1, nitrite 0, nitrate 0", "Ammonia 0, nitrite 1, nitrate 10", "All three at exactly 0, always", "Ammonia 0, nitrite 0, some nitrate"]$j$::jsonb)), 3, 14);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Your tap water tests positive for ammonia. What's the likely reason?$q$, $j$["Your water supply uses chloramine", "Your heater is broken", "Your gravel is the wrong color"]$j$::jsonb, 0, 15);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Your tap water tests positive for ammonia. What's the likely reason?$q$, array(select jsonb_array_elements_text($j$["Your water supply uses chloramine", "Your heater is broken", "Your gravel is the wrong color"]$j$::jsonb)), 0, 15);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$After a fishless cycle finishes, why add fish within a day or two?$q$, $j$["The water expires", "So the bacteria don't starve without ammonia", "To keep nitrate at zero"]$j$::jsonb, 1, 16);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$After a fishless cycle finishes, why add fish within a day or two?$q$, array(select jsonb_array_elements_text($j$["The water expires", "So the bacteria don't starve without ammonia", "To keep nitrate at zero"]$j$::jsonb)), 1, 16);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually causes a milky white haze in a week-old tank?$q$, $j$["Too much nitrate", "Too much light", "A harmless bacterial bloom", "An ammonia overdose"]$j$::jsonb, 2, 17);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually causes a milky white haze in a week-old tank?$q$, array(select jsonb_array_elements_text($j$["Too much nitrate", "Too much light", "A harmless bacterial bloom", "An ammonia overdose"]$j$::jsonb)), 2, 17);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why can some fish medications cause a mini-cycle?$q$, $j$["They add nitrate", "They raise pH", "They can kill the beneficial bacteria"]$j$::jsonb, 2, 18);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why can some fish medications cause a mini-cycle?$q$, array(select jsonb_array_elements_text($j$["They add nitrate", "They raise pH", "They can kill the beneficial bacteria"]$j$::jsonb)), 2, 18);
    end if;
    if opts_type = 'jsonb' or opts_type = 'json' then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which part of your setup holds the most beneficial bacteria?$q$, $j$["The filter media", "The glass", "The heater", "The water itself"]$j$::jsonb, 0, 19);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which part of your setup holds the most beneficial bacteria?$q$, array(select jsonb_array_elements_text($j$["The filter media", "The glass", "The heater", "The water itself"]$j$::jsonb)), 0, 19);
    end if;
    raise notice 'Final exam topped up to 20 questions';
    return;
  end if;
  insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order)
  values ($c$nitrogen-cycle$c$, $c$The Nitrogen Cycle$c$, $c$Why new tanks kill fish, and how to make sure yours never does$c$, $c$Learn how the nitrogen cycle works, how to cycle a new tank with or without fish, how to read your test results, and how to keep a cycled tank from crashing. Seven short lessons, a quiz after each, and a final exam.$c$, 35, $c$Certified Cycler$c$, $c$/course-media/nitrogen-cycle/00-course-cover.png$c$, true,
          coalesce((select max(sort_order) + 1 from public.courses), 1))
  returning id into cid;

  -- 1. What the nitrogen cycle is
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$What the nitrogen cycle is$c$, $c$Every fish tank runs on bacteria you can't see. Those bacteria turn deadly fish waste into something much safer, and the process is called the nitrogen cycle.

**It starts with ammonia.** Fish give off ammonia through their gills and in their waste. Uneaten food, dead plant leaves, and anything else rotting in the tank adds more. Ammonia burns gills and skin, and even small amounts stress fish.

**Bacteria turn ammonia into nitrite.** A group of bacteria living on your filter media, gravel, and decorations eats ammonia and gives off nitrite. Nitrite is still toxic. It stops fish blood from carrying oxygen, so fish gasp at the surface even when the water is full of air.

**More bacteria turn nitrite into nitrate.** A second group eats the nitrite and gives off nitrate. Nitrate is far less harmful, but it builds up over time. Water changes remove it, and live plants use some of it as food.

That's the whole loop: **waste, ammonia, nitrite, nitrate, water change.** A "cycled" tank is one with enough bacteria to handle all the ammonia your fish make, every day, so ammonia and nitrite always read zero.

**Where the bacteria live:** almost all of them grow on surfaces, not floating in the water. Your filter media is the biggest home they have, which is why how you treat your filter matters so much (Lesson 7).$c$, false, null, $c$/course-media/nitrogen-cycle/01-what-the-nitrogen-cycle-is.png$c$, 0)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What does a cycled tank do?$q$, $j$["Keeps nitrate at zero", "Converts ammonia to nitrate fast enough that ammonia and nitrite stay at zero", "Removes all bacteria from the water", "Keeps the water perfectly clear"]$j$::jsonb, 1, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What does a cycled tank do?$q$, array(select jsonb_array_elements_text($j$["Keeps nitrate at zero", "Converts ammonia to nitrate fast enough that ammonia and nitrite stay at zero", "Removes all bacteria from the water", "Keeps the water perfectly clear"]$j$::jsonb)), 1, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which is the least toxic of the three?$q$, $j$["Ammonia", "Nitrite", "Nitrate"]$j$::jsonb, 2, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which is the least toxic of the three?$q$, array(select jsonb_array_elements_text($j$["Ammonia", "Nitrite", "Nitrate"]$j$::jsonb)), 2, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Where do most of the beneficial bacteria live?$q$, $j$["Floating in the water", "On surfaces, especially the filter media", "Inside the fish", "In the fish food"]$j$::jsonb, 1, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Where do most of the beneficial bacteria live?$q$, array(select jsonb_array_elements_text($j$["Floating in the water", "On surfaces, especially the filter media", "Inside the fish", "In the fish food"]$j$::jsonb)), 1, 2);
  end if;

  -- 2. New tank syndrome
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$New tank syndrome$c$, $c$A brand new tank has almost none of the bacteria from Lesson 1. Fresh gravel, a new filter, and dechlorinated tap water are basically sterile. That's why the most common way to lose fish is buying a tank and stocking it the same weekend.

**What happens, step by step:**

1. Fish go in and start producing ammonia on day one.
2. With no bacteria to eat it, ammonia climbs for a week or two.
3. Ammonia-eating bacteria finally grow, ammonia drops, and nitrite spikes instead.
4. Nitrite-eating bacteria lag behind, so nitrite stays high for another week or more.
5. Eventually both groups catch up and the tank settles. Many fish don't make it that far.

Hobbyists call this **new tank syndrome**. The fish store didn't sell you bad fish, and the tank isn't broken. It just wasn't ready.

**Signs your fish are in trouble:** gasping at the surface, sitting on the bottom, clamped fins, red or inflamed gills, cloudy eyes, refusing food. If you see these in a tank under 6 weeks old, test ammonia and nitrite right away.

**The fix is patience.** Cycling a tank before fish go in (Lesson 3) takes about 4 to 8 weeks. If fish are already in, Lesson 4 shows you how to get them through it.

**Cloudy water is not the cycle.** A milky haze in a new tank is usually a harmless bacterial bloom. It clears on its own in a few days. Don't take it as a sign the tank is cycled, and don't chase it with chemicals. Test the water instead.$c$, false, null, $c$/course-media/nitrogen-cycle/02-new-tank-syndrome.png$c$, 1)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why do fish often die in a brand new tank?$q$, $j$["Tap water has too much nitrate", "There aren't enough bacteria yet to process their ammonia", "The gravel is too clean", "New filters are too strong"]$j$::jsonb, 1, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why do fish often die in a brand new tank?$q$, array(select jsonb_array_elements_text($j$["Tap water has too much nitrate", "There aren't enough bacteria yet to process their ammonia", "The gravel is too clean", "New filters are too strong"]$j$::jsonb)), 1, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$In an uncycled tank with fish, what usually spikes first?$q$, $j$["Nitrate", "Nitrite", "Ammonia"]$j$::jsonb, 2, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$In an uncycled tank with fish, what usually spikes first?$q$, array(select jsonb_array_elements_text($j$["Nitrate", "Nitrite", "Ammonia"]$j$::jsonb)), 2, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your 5-day-old tank turned milky white. What does that most likely mean?$q$, $j$["The tank is fully cycled", "A harmless bacterial bloom that clears on its own", "Nitrate poisoning", "The filter is broken"]$j$::jsonb, 1, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your 5-day-old tank turned milky white. What does that most likely mean?$q$, array(select jsonb_array_elements_text($j$["The tank is fully cycled", "A harmless bacterial bloom that clears on its own", "Nitrate poisoning", "The filter is broken"]$j$::jsonb)), 1, 2);
  end if;

  -- 3. Fishless cycling, step by step
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$Fishless cycling, step by step$c$, $c$Fishless cycling grows the bacteria first, by feeding them ammonia yourself, before any fish go in. It's the safest way to start a tank, and no animal suffers while you wait.

**What you need:**

- Pure ammonia with no soap, scent, or surfactants (shake it: if it foams, don't use it), or a bottled ammonia sold for cycling
- A liquid test kit for ammonia, nitrite, and nitrate (strips are less accurate)
- Water conditioner (dechlorinator)
- Your filter running 24/7 and the heater set to about 78 to 82°F, which speeds bacteria growth

**The steps:**

1. Set up the tank fully: substrate, decor, filter, heater. Dechlorinate the water.
2. Add ammonia until the test reads about **2 ppm**. Write down how much it took.
3. Test ammonia and nitrite every 1 to 2 days.
4. When ammonia drops below 1 ppm, dose back up to 2 ppm. Keep doing this.
5. Around week 2 to 3, nitrite shows up and climbs. The first bacteria are working.
6. Keep dosing ammonia. Eventually nitrite starts dropping and nitrate rises. That's the second group arriving.
7. **The test for done:** dose to 2 ppm, and 24 hours later ammonia AND nitrite both read 0. Pass that two days in a row and you're cycled.
8. Do a big water change (50 to 75%) to bring nitrate down, then add fish within a day or two so the bacteria don't starve.

**Don't overdose.** More ammonia does not cycle faster. Levels above about 4 to 5 ppm, or nitrite left extremely high, can stall the bacteria for weeks. If nitrite goes off the chart, do a partial water change.

**If the cycle stalls:** check pH. Below about 6.5 the bacteria slow way down. A small water change with fresh tap water, or a pinch of baking soda to raise KH, usually gets it moving again.

**Stock gradually.** The colony is sized for the ammonia you were dosing. Add fish in small groups over a few weeks rather than filling the tank at once.$c$, false, null, $c$/course-media/nitrogen-cycle/03-fishless-cycling.png$c$, 2)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$How do you know a fishless cycle is finished?$q$, $j$["The water turns crystal clear", "Nitrate reads zero", "2 ppm of ammonia is gone, with 0 nitrite, within 24 hours", "It has been exactly two weeks"]$j$::jsonb, 2, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$How do you know a fishless cycle is finished?$q$, array(select jsonb_array_elements_text($j$["The water turns crystal clear", "Nitrate reads zero", "2 ppm of ammonia is gone, with 0 nitrite, within 24 hours", "It has been exactly two weeks"]$j$::jsonb)), 2, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your ammonia bottle foams when you shake it. Should you use it?$q$, $j$["Yes, foam means it's strong", "No, it contains surfactants that can harm the tank"]$j$::jsonb, 1, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your ammonia bottle foams when you shake it. Should you use it?$q$, array(select jsonb_array_elements_text($j$["Yes, foam means it's strong", "No, it contains surfactants that can harm the tank"]$j$::jsonb)), 1, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What should you do right before adding fish to a freshly cycled tank?$q$, $j$["Clean the filter thoroughly", "Turn off the heater", "Do a large water change to lower nitrate", "Add more ammonia"]$j$::jsonb, 2, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What should you do right before adding fish to a freshly cycled tank?$q$, array(select jsonb_array_elements_text($j$["Clean the filter thoroughly", "Turn off the heater", "Do a large water change to lower nitrate", "Add more ammonia"]$j$::jsonb)), 2, 2);
  end if;

  -- 4. Fish-in cycling
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$Fish-in cycling$c$, $c$Sometimes fish are already in an uncycled tank: a surprise gift, an impulse buy, or a tank you didn't know needed cycling. You can still get them through it. It just takes daily work for a few weeks.

**The goal:** keep ammonia and nitrite low enough that fish stay healthy, while still leaving enough for the bacteria to grow. Keep ammonia plus nitrite combined at or under **0.5 ppm**.

**Your daily routine:**

1. Test ammonia and nitrite every day, at the same time.
2. If the combined reading is over 0.5 ppm, change enough water to bring it down. A 50% change cuts the level in half.
3. Use a water conditioner that also detoxifies ammonia and nitrite (Seachem Prime is the common one). Dose for the full tank volume on every change. It protects fish for roughly 24 hours, so it buys time but doesn't replace water changes.
4. Match the new water's temperature to the tank.

**Make the fish produce less waste:**

- Feed lightly, once a day or every other day. Fish handle hunger far better than ammonia.
- Remove uneaten food after a few minutes.
- Don't add any more fish until the cycle is finished.

**Don't sabotage the bacteria:**

- Don't replace or deep-clean the filter media.
- Avoid medications unless fish are truly sick. Many kill beneficial bacteria.

**Speed it up:** a bottled bacteria product or seeded media from an established tank (Lesson 6) can cut weeks off a fish-in cycle.

You're done when ammonia and nitrite read 0 for a full week with normal feeding, and nitrate climbs slowly between water changes.$c$, false, null, $c$/course-media/nitrogen-cycle/04-fish-in-cycling.png$c$, 3)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$During a fish-in cycle, what level of ammonia plus nitrite should you stay at or under?$q$, $j$["0.5 ppm combined", "2 ppm each", "5 ppm combined", "Any level is fine if the fish look okay"]$j$::jsonb, 0, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$During a fish-in cycle, what level of ammonia plus nitrite should you stay at or under?$q$, array(select jsonb_array_elements_text($j$["0.5 ppm combined", "2 ppm each", "5 ppm combined", "Any level is fine if the fish look okay"]$j$::jsonb)), 0, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What does a 50% water change do to the ammonia level?$q$, $j$["Removes it completely", "Cuts it roughly in half", "Doubles it"]$j$::jsonb, 1, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What does a 50% water change do to the ammonia level?$q$, array(select jsonb_array_elements_text($j$["Removes it completely", "Cuts it roughly in half", "Doubles it"]$j$::jsonb)), 1, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which is the best feeding approach during a fish-in cycle?$q$, $j$["Feed extra so fish stay strong", "Feed lightly and remove leftovers", "Don't feed at all for a month"]$j$::jsonb, 1, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which is the best feeding approach during a fish-in cycle?$q$, array(select jsonb_array_elements_text($j$["Feed extra so fish stay strong", "Feed lightly and remove leftovers", "Don't feed at all for a month"]$j$::jsonb)), 1, 2);
  end if;

  -- 5. Reading your test results
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$Reading your test results$c$, $c$You can't see ammonia or nitrite. A test kit is the only way to know where your tank stands. Log every result in Water Check so you can spot trends instead of guessing.

**Liquid kits beat strips.** Liquid kits (drops in a test tube) are more accurate and cheaper per test. Strips are handy for quick checks but can read high or low, especially once the tub has been open a while.

**What the numbers mean in a cycled tank:**

- **Ammonia:** healthy is 0 ppm. Act on anything over 0.25 ppm.
- **Nitrite:** healthy is 0 ppm. Act on anything over 0.25 ppm.
- **Nitrate:** healthy is under 20 to 40 ppm. Over 40 ppm, do a water change.
- **pH:** healthy is steady (most fish do well between 6.5 and 8). Watch for sudden swings.

**Reading the stage of a cycle:**

- Ammonia high, nitrite 0: bacteria haven't started. Early cycle.
- Ammonia falling, nitrite rising: the first bacteria are working. Mid cycle.
- Ammonia 0, nitrite falling, nitrate rising: the second bacteria are arriving. Nearly there.
- Ammonia 0, nitrite 0, nitrate rising slowly: cycled.

**pH and temperature change how toxic ammonia is.** In higher pH and warmer water, more of it is in the toxic form. The same 0.5 ppm reading is more dangerous at pH 8.2 than at pH 6.8. In hard, alkaline water, treat any ammonia as urgent.

**Testing tips:**

- Follow the kit's shake and wait times exactly. Nitrate bottles need hard shaking.
- Read colors in daylight against a white background.
- Test your tap water once too. Some tap water already has ammonia (from chloramine) or nitrate in it.
- Check expiry dates. Old reagents give false readings.$c$, false, null, $c$/course-media/nitrogen-cycle/05-reading-test-results.png$c$, 4)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your test shows ammonia 0, nitrite 2 ppm, nitrate 10 ppm. What stage is the cycle in?$q$, $j$["Not started", "Mid to late, with nitrite bacteria still catching up", "Fully cycled"]$j$::jsonb, 1, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your test shows ammonia 0, nitrite 2 ppm, nitrate 10 ppm. What stage is the cycle in?$q$, array(select jsonb_array_elements_text($j$["Not started", "Mid to late, with nitrite bacteria still catching up", "Fully cycled"]$j$::jsonb)), 1, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$When is the same ammonia reading most dangerous?$q$, $j$["Low pH and cool water", "High pH and warm water", "It's always equally dangerous"]$j$::jsonb, 1, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$When is the same ammonia reading most dangerous?$q$, array(select jsonb_array_elements_text($j$["Low pH and cool water", "High pH and warm water", "It's always equally dangerous"]$j$::jsonb)), 1, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why should you test your tap water?$q$, $j$["It can already contain ammonia or nitrate", "Tap water always has nitrite", "You don't need to"]$j$::jsonb, 0, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why should you test your tap water?$q$, array(select jsonb_array_elements_text($j$["It can already contain ammonia or nitrate", "Tap water always has nitrite", "You don't need to"]$j$::jsonb)), 0, 2);
  end if;

  -- 6. Bottled bacteria and seeded media
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$Bottled bacteria and seeded media$c$, $c$You can't skip the cycle, but you can give it a head start. Two shortcuts actually work. A lot of others don't.

**Seeded media: the best shortcut.** Bacteria from an established, healthy tank can jump-start a new one in days instead of weeks.

- A used filter sponge, ceramic rings, or bio-balls from a cycled tank work best.
- Squeeze a dirty sponge from an established filter into the new tank, or put a piece of it in the new filter.
- Gravel and decor from an old tank help a little. Filter media helps a lot.
- Keep it wet. Bacteria die quickly if the media dries out.
- Only take media from a tank you trust. Disease, parasites, and pest snails can come along for the ride.

Many local fish stores will give you a handful of used media if you ask. Find yours in Shops Near Me.

**Bottled bacteria: works if it's the right kind.** Some products contain live nitrifying bacteria and can noticeably speed up a cycle. Others are mostly sludge-eating bacteria that do little for ammonia.

- Look for products that say they contain live nitrifying bacteria.
- Follow the label exactly. Some need ammonia present to survive, others want fish added the same day.
- Buy fresh. Bottles that sat hot in a warehouse may be dead.
- Keep testing anyway. A bottle is a boost, not a guarantee. Your readings tell you when you're actually cycled.

**Shortcuts that don't work:**

- **Leaving the tank empty for a while.** Bacteria need food to grow. An empty tank sitting for a week is still uncycled.
- **"Starter fish" to cycle the tank.** This is just fish-in cycling with extra suffering. If you go this route, do it right (Lesson 4).
- **Rotting fish food.** It works slowly, makes a mess, and you can't control the ammonia level. Measured ammonia is better.$c$, false, null, $c$/course-media/nitrogen-cycle/06-bottled-bacteria-and-seeded-media.png$c$, 5)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What is the most effective way to speed up a cycle?$q$, $j$["Leaving the tank empty for a week", "Seeded filter media from an established, healthy tank", "Daily 100% water changes"]$j$::jsonb, 1, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What is the most effective way to speed up a cycle?$q$, array(select jsonb_array_elements_text($j$["Leaving the tank empty for a week", "Seeded filter media from an established, healthy tank", "Daily 100% water changes"]$j$::jsonb)), 1, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What is the main risk of using media from someone else's tank?$q$, $j$["It brings in too much nitrate", "It can carry disease, parasites, or pest snails", "It makes the water cloudy forever"]$j$::jsonb, 1, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What is the main risk of using media from someone else's tank?$q$, array(select jsonb_array_elements_text($j$["It brings in too much nitrate", "It can carry disease, parasites, or pest snails", "It makes the water cloudy forever"]$j$::jsonb)), 1, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$After adding bottled bacteria, when do you know the tank is cycled?$q$, $j$["Right away, the bottle says so", "After 24 hours", "When your tests show ammonia and nitrite at 0"]$j$::jsonb, 2, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$After adding bottled bacteria, when do you know the tank is cycled?$q$, array(select jsonb_array_elements_text($j$["Right away, the bottle says so", "After 24 hours", "When your tests show ammonia and nitrite at 0"]$j$::jsonb)), 2, 2);
  end if;

  -- 7. Mini-cycles and how to recover
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$Mini-cycles and how to recover$c$, $c$A cycled tank can lose part of its bacteria and spike ammonia again. That's a mini-cycle. It's usually caused by something the keeper did, which means it's usually avoidable.

**Common causes, and how to avoid them:**

- **Rinsing filter media in tap water.** Chlorine kills the bacteria. Rinse media in old tank water from a water change instead.
- **Replacing all the filter media at once.** That throws out most of the colony. Replace one part at a time, weeks apart.
- **Filter off for hours (like a power outage).** Bacteria suffocate without flow. After 2+ hours off, rinse the media in tank water before restarting.
- **Adding many fish at once.** Ammonia jumps faster than bacteria can grow. Add a few fish at a time, weeks apart.
- **Some medications.** Antibiotics can kill nitrifying bacteria. Treat in a hospital tank when you can, and test daily.
- **A dead fish or rotting food.** A sudden ammonia dump. Count your fish daily and remove leftovers.

**Filter cartridges are a trap.** Many filters tell you to swap the cartridge monthly. Doing that throws out your bacteria every month. Rinse it in tank water instead, and only replace it when it's falling apart. Even better, add a sponge or ceramic media that never gets thrown out.

**How to recover:**

1. Test ammonia and nitrite as soon as you suspect a problem.
2. Do a water change to bring ammonia plus nitrite under 0.5 ppm, using conditioner for the full tank volume.
3. Cut feeding way back until readings return to 0.
4. Add bottled bacteria or seeded media to help it bounce back.
5. Test daily until you get several days of zeros.

Most mini-cycles clear in a week or two if you catch them early. That's why the habit that matters most isn't a product. It's testing.$c$, false, null, $c$/course-media/nitrogen-cycle/07-mini-cycles-and-recovery.png$c$, 6)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What's the safest way to clean filter media?$q$, $j$["Under hot tap water", "Swirl it in old tank water from a water change", "Soak it in bleach", "Replace it every month"]$j$::jsonb, 1, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What's the safest way to clean filter media?$q$, array(select jsonb_array_elements_text($j$["Under hot tap water", "Swirl it in old tank water from a water change", "Soak it in bleach", "Replace it every month"]$j$::jsonb)), 1, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your power was out for 5 hours. What should you do before restarting the filter?$q$, $j$["Nothing, just turn it back on", "Throw out the media", "Rinse the media in tank water, then restart and test for a few days"]$j$::jsonb, 2, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your power was out for 5 hours. What should you do before restarting the filter?$q$, array(select jsonb_array_elements_text($j$["Nothing, just turn it back on", "Throw out the media", "Rinse the media in tank water, then restart and test for a few days"]$j$::jsonb)), 2, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why does replacing a filter cartridge every month cause problems?$q$, $j$["It removes most of the beneficial bacteria", "New cartridges add ammonia", "It makes the filter too strong"]$j$::jsonb, 0, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why does replacing a filter cartridge every month cause problems?$q$, array(select jsonb_array_elements_text($j$["It removes most of the beneficial bacteria", "New cartridges add ammonia", "It makes the filter too strong"]$j$::jsonb)), 0, 2);
  end if;

  -- 8. Final exam
  insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
  values (cid, $c$Final exam$c$, $c$Twenty questions covering the whole course. Get them all right to finish and earn your **Certified Cycler** certificate and badge.

If you miss one, it'll be highlighted. Head back to the lesson if you need a refresher, then try again.$c$, false, null, $c$/course-media/nitrogen-cycle/00-course-cover.png$c$, 7)
  returning id into sid;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What is the correct order of the nitrogen cycle?$q$, $j$["Nitrate, nitrite, ammonia", "Ammonia, nitrite, nitrate", "Nitrite, ammonia, nitrate", "Ammonia, nitrate, nitrite"]$j$::jsonb, 1, 0);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What is the correct order of the nitrogen cycle?$q$, array(select jsonb_array_elements_text($j$["Nitrate, nitrite, ammonia", "Ammonia, nitrite, nitrate", "Nitrite, ammonia, nitrate", "Ammonia, nitrate, nitrite"]$j$::jsonb)), 1, 0);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Fish are gasping at the surface in a 2-week-old tank. What's the first thing to do?$q$, $j$["Add more fish to balance it out", "Test ammonia and nitrite", "Replace the filter cartridge", "Turn off the filter"]$j$::jsonb, 1, 1);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Fish are gasping at the surface in a 2-week-old tank. What's the first thing to do?$q$, array(select jsonb_array_elements_text($j$["Add more fish to balance it out", "Test ammonia and nitrite", "Replace the filter cartridge", "Turn off the filter"]$j$::jsonb)), 1, 1);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$How is nitrate mainly removed from a home aquarium?$q$, $j$["The filter destroys it", "Water changes, with some taken up by live plants", "It evaporates", "Fish eat it"]$j$::jsonb, 1, 2);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$How is nitrate mainly removed from a home aquarium?$q$, array(select jsonb_array_elements_text($j$["The filter destroys it", "Water changes, with some taken up by live plants", "It evaporates", "Fish eat it"]$j$::jsonb)), 1, 2);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$During a fishless cycle, ammonia has dropped to 0.5 ppm. What's next?$q$, $j$["Add fish, it's done", "Dose ammonia back up to about 2 ppm", "Do a 100% water change"]$j$::jsonb, 1, 3);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$During a fishless cycle, ammonia has dropped to 0.5 ppm. What's next?$q$, array(select jsonb_array_elements_text($j$["Add fish, it's done", "Dose ammonia back up to about 2 ppm", "Do a 100% water change"]$j$::jsonb)), 1, 3);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why is dosing 8 ppm of ammonia a bad idea?$q$, $j$["It cycles too fast", "Very high levels can stall the bacteria", "It turns into nitrate instantly"]$j$::jsonb, 1, 4);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why is dosing 8 ppm of ammonia a bad idea?$q$, array(select jsonb_array_elements_text($j$["It cycles too fast", "Very high levels can stall the bacteria", "It turns into nitrate instantly"]$j$::jsonb)), 1, 4);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which conditioner feature matters most during a fish-in cycle?$q$, $j$["It adds slime coat", "It temporarily detoxifies ammonia and nitrite", "It lowers pH"]$j$::jsonb, 1, 5);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which conditioner feature matters most during a fish-in cycle?$q$, array(select jsonb_array_elements_text($j$["It adds slime coat", "It temporarily detoxifies ammonia and nitrite", "It lowers pH"]$j$::jsonb)), 1, 5);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$A fishless cycle has stalled for two weeks and pH reads 6.0. What's the likely fix?$q$, $j$["Add more ammonia", "Raise pH and KH with a water change or a little baking soda", "Turn off the heater"]$j$::jsonb, 1, 6);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$A fishless cycle has stalled for two weeks and pH reads 6.0. What's the likely fix?$q$, array(select jsonb_array_elements_text($j$["Add more ammonia", "Raise pH and KH with a water change or a little baking soda", "Turn off the heater"]$j$::jsonb)), 1, 6);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which of these will NOT cycle a tank?$q$, $j$["Dosing pure ammonia", "Seeded media from a healthy tank", "Letting an empty tank sit with no ammonia source"]$j$::jsonb, 2, 7);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which of these will NOT cycle a tank?$q$, array(select jsonb_array_elements_text($j$["Dosing pure ammonia", "Seeded media from a healthy tank", "Letting an empty tank sit with no ammonia source"]$j$::jsonb)), 2, 7);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your tank has been cycled for a year. You add 15 new fish at once and ammonia appears. What happened?$q$, $j$["The bacteria died of old age", "The waste jumped faster than the bacteria could grow, a mini-cycle", "The test kit is broken"]$j$::jsonb, 1, 8);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your tank has been cycled for a year. You add 15 new fish at once and ammonia appears. What happened?$q$, array(select jsonb_array_elements_text($j$["The bacteria died of old age", "The waste jumped faster than the bacteria could grow, a mini-cycle", "The test kit is broken"]$j$::jsonb)), 1, 8);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What's the single most useful habit for preventing cycle problems?$q$, $j$["Changing the filter cartridge monthly", "Regular water testing", "Feeding more often", "Adding bacteria every week"]$j$::jsonb, 1, 9);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What's the single most useful habit for preventing cycle problems?$q$, array(select jsonb_array_elements_text($j$["Changing the filter cartridge monthly", "Regular water testing", "Feeding more often", "Adding bacteria every week"]$j$::jsonb)), 1, 9);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What does nitrite do to fish?$q$, $j$["Burns their fins", "Stops their blood from carrying oxygen", "Turns the water green", "Nothing harmful"]$j$::jsonb, 1, 10);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What does nitrite do to fish?$q$, array(select jsonb_array_elements_text($j$["Burns their fins", "Stops their blood from carrying oxygen", "Turns the water green", "Nothing harmful"]$j$::jsonb)), 1, 10);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$How long does a fishless cycle usually take?$q$, $j$["2 to 3 days", "Exactly 1 week", "4 to 8 weeks", "6 months"]$j$::jsonb, 2, 11);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$How long does a fishless cycle usually take?$q$, array(select jsonb_array_elements_text($j$["2 to 3 days", "Exactly 1 week", "4 to 8 weeks", "6 months"]$j$::jsonb)), 2, 11);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which water temperature helps speed up a cycle?$q$, $j$["78 to 82\u00b0F", "60 to 65\u00b0F", "Under 55\u00b0F", "It makes no difference"]$j$::jsonb, 0, 12);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which water temperature helps speed up a cycle?$q$, array(select jsonb_array_elements_text($j$["78 to 82\u00b0F", "60 to 65\u00b0F", "Under 55\u00b0F", "It makes no difference"]$j$::jsonb)), 0, 12);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which kind of test kit is generally more accurate?$q$, $j$["Test strips", "Liquid drop kits", "They're identical"]$j$::jsonb, 1, 13);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which kind of test kit is generally more accurate?$q$, array(select jsonb_array_elements_text($j$["Test strips", "Liquid drop kits", "They're identical"]$j$::jsonb)), 1, 13);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$A healthy, cycled tank usually reads:$q$, $j$["Ammonia 1, nitrite 0, nitrate 0", "Ammonia 0, nitrite 1, nitrate 10", "All three at exactly 0, always", "Ammonia 0, nitrite 0, some nitrate"]$j$::jsonb, 3, 14);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$A healthy, cycled tank usually reads:$q$, array(select jsonb_array_elements_text($j$["Ammonia 1, nitrite 0, nitrate 0", "Ammonia 0, nitrite 1, nitrate 10", "All three at exactly 0, always", "Ammonia 0, nitrite 0, some nitrate"]$j$::jsonb)), 3, 14);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your tap water tests positive for ammonia. What's the likely reason?$q$, $j$["Your water supply uses chloramine", "Your heater is broken", "Your gravel is the wrong color"]$j$::jsonb, 0, 15);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Your tap water tests positive for ammonia. What's the likely reason?$q$, array(select jsonb_array_elements_text($j$["Your water supply uses chloramine", "Your heater is broken", "Your gravel is the wrong color"]$j$::jsonb)), 0, 15);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$After a fishless cycle finishes, why add fish within a day or two?$q$, $j$["The water expires", "So the bacteria don't starve without ammonia", "To keep nitrate at zero"]$j$::jsonb, 1, 16);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$After a fishless cycle finishes, why add fish within a day or two?$q$, array(select jsonb_array_elements_text($j$["The water expires", "So the bacteria don't starve without ammonia", "To keep nitrate at zero"]$j$::jsonb)), 1, 16);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What usually causes a milky white haze in a week-old tank?$q$, $j$["Too much nitrate", "Too much light", "A harmless bacterial bloom", "An ammonia overdose"]$j$::jsonb, 2, 17);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$What usually causes a milky white haze in a week-old tank?$q$, array(select jsonb_array_elements_text($j$["Too much nitrate", "Too much light", "A harmless bacterial bloom", "An ammonia overdose"]$j$::jsonb)), 2, 17);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why can some fish medications cause a mini-cycle?$q$, $j$["They add nitrate", "They raise pH", "They can kill the beneficial bacteria"]$j$::jsonb, 2, 18);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Why can some fish medications cause a mini-cycle?$q$, array(select jsonb_array_elements_text($j$["They add nitrate", "They raise pH", "They can kill the beneficial bacteria"]$j$::jsonb)), 2, 18);
  end if;
  if opts_type = 'jsonb' or opts_type = 'json' then
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which part of your setup holds the most beneficial bacteria?$q$, $j$["The filter media", "The glass", "The heater", "The water itself"]$j$::jsonb, 0, 19);
  else
    insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
    values (sid, $q$Which part of your setup holds the most beneficial bacteria?$q$, array(select jsonb_array_elements_text($j$["The filter media", "The glass", "The heater", "The water itself"]$j$::jsonb)), 0, 19);
  end if;

  raise notice 'The Nitrogen Cycle course created';
end
$do$;

select c.title, count(distinct s.id) as lessons, count(q.id) as questions
from public.courses c
join public.course_sections s on s.course_id = c.id
left join public.course_questions q on q.section_id = s.id
where c.slug = 'nitrogen-cycle'
group by c.title;
