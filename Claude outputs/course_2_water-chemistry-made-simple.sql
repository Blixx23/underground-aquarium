-- Water Chemistry Made Simple: creates the course with 6 lessons, images, quizzes and a 20-question final exam.
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

  -- ==================== Water Chemistry Made Simple ====================
  if not exists (select 1 from public.courses where slug = $c$water-chemistry-made-simple$c$) then
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.courses;
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order)
    values ($c$water-chemistry-made-simple$c$, $c$Water Chemistry Made Simple$c$, $c$pH, hardness and temperature in plain English$c$, $c$Understand the numbers on your test kit without a chemistry degree. Learn what pH, KH, GH and temperature mean, why steady water beats "perfect" water, and how your tap water affects your fish.$c$, 30, $c$Water Wise$c$, $c$/course-media/water-chemistry-made-simple/00-course-cover.png$c$, true, next_sort)
    returning id into cid;

    -- 1. Why steady beats perfect
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Why steady beats perfect$c$, $c$Fish can get used to a lot of different water. What they can't handle well are **sudden changes**. A fish that has lived its whole life at pH 7.6 is healthier at a steady 7.6 than at a pH that jumps between 6.8 and 7.4.

**Why chasing numbers backfires:**

- Products like "pH Up" and "pH Down" change the number quickly.
- Your tank slowly drifts back, so you add more.
- The water swings up and down, and every swing stresses your fish.

**A better plan:**

1. Test your water so you know where it sits.
2. Pick fish that are happy in water like yours.
3. Keep it steady with regular water changes.

Most fish sold today were raised on fish farms and are used to a wide range of water. For them, steady water matters much more than hitting a "perfect" number.

**The big exceptions** are ammonia and nitrite. Those should always be zero. You learned about them in The Nitrogen Cycle course.$c$, false, null, $c$/course-media/water-chemistry-made-simple/01-steady.png$c$, 0)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What stresses fish more?$q$, $j$["A steady pH that isn't \"perfect\"", "Sudden changes in their water"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What stresses fish more?$q$, array(select jsonb_array_elements_text($j$["A steady pH that isn't \"perfect\"", "Sudden changes in their water"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually happens when you keep adding pH Up or pH Down?$q$, $j$["The fish grow faster", "The pH swings up and down", "The pH stays perfect forever"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually happens when you keep adding pH Up or pH Down?$q$, array(select jsonb_array_elements_text($j$["The fish grow faster", "The pH swings up and down", "The pH stays perfect forever"]$j$::jsonb)), 1, 1);
    end if;

    -- 2. pH: acid or base
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$pH: acid or base$c$, $c$**pH** tells you how acidic or basic your water is. The scale runs from 0 to 14.

- **Below 7** is acidic.
- **7** is neutral.
- **Above 7** is basic, also called alkaline.

**Each step is a big jump.** The pH scale works in multiples of 10. Water at pH 6 is 10 times more acidic than water at pH 7, and 100 times more acidic than water at pH 8. That's why a "small" change of one full point is a big deal to a fish.

**Where most fish are happy:** most common community fish do well somewhere between about **6.5 and 7.8**.

**pH drifts down over time.** The bacteria in your filter make acids as they break down waste. Over weeks without water changes, the pH slowly drops. Regular water changes bring it back up.

**Testing tip:** test pH at about the same time of day each time. pH can change a little from morning to night, especially in planted tanks.$c$, false, null, $c$/course-media/water-chemistry-made-simple/02-ph.png$c$, 1)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$pH 6 is how many times more acidic than pH 7?$q$, $j$["10 times", "2 times", "100 times"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$pH 6 is how many times more acidic than pH 7?$q$, array(select jsonb_array_elements_text($j$["10 times", "2 times", "100 times"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually makes pH drop slowly over time?$q$, $j$["Too much light", "Acids made by filter bacteria", "Feeding flakes"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually makes pH drop slowly over time?$q$, array(select jsonb_array_elements_text($j$["Too much light", "Acids made by filter bacteria", "Feeding flakes"]$j$::jsonb)), 1, 1);
    end if;

    -- 3. KH: your pH bodyguard
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$KH: your pH bodyguard$c$, $c$**KH** stands for carbonate hardness. You can think of it as your pH's bodyguard. KH soaks up acids so your pH stays steady.

**How it works:**

- Acids are always being made in your tank.
- KH uses itself up neutralizing those acids.
- As long as there is enough KH, pH stays steady.
- When KH runs out, pH can drop fast. This is called a **pH crash**, and it can stress or kill fish.

**What to aim for:** most community tanks do well with a KH of about **3 to 8 dKH**. ("dKH" is the unit most test kits use.)

**If your KH is low:**

- Do regular water changes. Fresh tap water usually adds KH back.
- Add a small bag of **crushed coral** to your filter. It slowly dissolves and raises KH (and GH).

**If your pH keeps dropping between water changes, test KH.** Low KH is often the reason.$c$, false, null, $c$/course-media/water-chemistry-made-simple/03-kh.png$c$, 2)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does KH do in your tank?$q$, $j$["Makes water warmer", "Keeps pH steady by soaking up acids", "Feeds plants"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does KH do in your tank?$q$, array(select jsonb_array_elements_text($j$["Makes water warmer", "Keeps pH steady by soaking up acids", "Feeds plants"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can happen when KH runs out?$q$, $j$["The water turns green", "A pH crash", "Nothing at all"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can happen when KH runs out?$q$, array(select jsonb_array_elements_text($j$["The water turns green", "A pH crash", "Nothing at all"]$j$::jsonb)), 1, 1);
    end if;

    -- 4. GH: soft and hard water
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$GH: soft and hard water$c$, $c$**GH** stands for general hardness. It measures minerals in the water, mostly **calcium** and **magnesium**. Water with a lot of these minerals is called **hard**. Water with very little is called **soft**.

**Fish that come from soft water:**

- Tetras
- Rasboras
- Discus and many South American fish

**Fish that come from hard water:**

- Livebearers like guppies, mollies, and platies
- African cichlids from the big rift lakes

Most farm-raised fish adapt to a wide range. Wild-caught fish and some special species are pickier, so check the Species Library.

**Snails and shrimp need minerals too.** They use calcium to build their shells. In very soft water, snail shells can get thin, pitted, or cracked, and shrimp can have trouble molting.

**GH vs. KH:** they sound alike but measure different things. GH is mostly calcium and magnesium. KH is the carbonate that keeps pH steady. Your test kit measures them separately.$c$, false, null, $c$/course-media/water-chemistry-made-simple/04-gh.png$c$, 3)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$GH mostly measures which minerals?$q$, $j$["Chlorine and sodium", "Calcium and magnesium", "Ammonia and nitrite"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$GH mostly measures which minerals?$q$, array(select jsonb_array_elements_text($j$["Chlorine and sodium", "Calcium and magnesium", "Ammonia and nitrite"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish naturally come from hard water?$q$, $j$["Guppies and mollies", "Neon tetras", "Discus"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish naturally come from hard water?$q$, array(select jsonb_array_elements_text($j$["Guppies and mollies", "Neon tetras", "Discus"]$j$::jsonb)), 0, 1);
    end if;

    -- 5. Temperature
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Temperature$c$, $c$Fish are cold-blooded. Their bodies match the water around them, so water temperature controls how they eat, grow, and fight off disease.

**Typical ranges:**

- **Tropical fish:** about 74 to 80°F
- **Goldfish and other coldwater fish:** about 65 to 72°F

**Keep it steady.** Try to keep your tank within about 1 to 2 degrees of where you set it. Big swings stress fish and can lead to disease like ich.

**Your gear:**

- **A heater** for tropical tanks. A common guideline is about 3 to 5 watts per gallon.
- **A thermometer** you can read easily. Don't just trust the heater's dial.

**Warm water holds less oxygen.** On a hot day, or if your heater gets stuck on, fish may gasp at the surface. More surface movement from your filter helps.

**During water changes,** make the new water about the same temperature as the tank. A thermometer makes this easy.$c$, false, null, $c$/course-media/water-chemistry-made-simple/05-temperature.png$c$, 4)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What temperature range do most tropical fish like?$q$, $j$["About 74 to 80\u00b0F", "About 85 to 95\u00b0F", "About 60 to 65\u00b0F"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What temperature range do most tropical fish like?$q$, array(select jsonb_array_elements_text($j$["About 74 to 80\u00b0F", "About 85 to 95\u00b0F", "About 60 to 65\u00b0F"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do fish sometimes gasp at the surface on very hot days?$q$, $j$["The light is too bright", "Warm water holds less oxygen", "They are hungry"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do fish sometimes gasp at the surface on very hot days?$q$, array(select jsonb_array_elements_text($j$["The light is too bright", "Warm water holds less oxygen", "They are hungry"]$j$::jsonb)), 1, 1);
    end if;

    -- 6. Your tap water
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Your tap water$c$, $c$Your tap water is the starting point for everything in your tank, so it's worth getting to know it.

**Chlorine and chloramine:** cities add these to make water safe for people. Both harm fish and can kill the good bacteria in your filter. **Always use a water conditioner** on tap water. Good conditioners remove both.

**A note on chloramine:** when a conditioner breaks chloramine apart, a small amount of ammonia is released. Many conditioners also lock up that ammonia for a while, and your filter bacteria take care of the rest.

**Test your tap water once.** Check pH, KH, GH, ammonia, and nitrate. Some tap water already has ammonia or nitrate in it. Knowing your starting point helps you pick the right fish and understand your test results.

**Water softeners:** home softeners swap calcium and magnesium for sodium. That water isn't a good match for most aquariums. If you can, use water from a tap that skips the softener, like an outdoor spigot.

**RO water:** reverse osmosis water has almost nothing in it. Some keepers use it for soft-water fish or shrimp, but it needs minerals added back before fish can live in it.$c$, false, null, $c$/course-media/water-chemistry-made-simple/06-tap.png$c$, 5)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why must you use water conditioner on tap water?$q$, $j$["It feeds the fish", "It adds color", "It removes chlorine and chloramine"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why must you use water conditioner on tap water?$q$, array(select jsonb_array_elements_text($j$["It feeds the fish", "It adds color", "It removes chlorine and chloramine"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why isn't softened water from a home water softener good for most aquariums?$q$, $j$["It has too much oxygen", "It swaps calcium and magnesium for sodium", "It is too cold"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why isn't softened water from a home water softener good for most aquariums?$q$, array(select jsonb_array_elements_text($j$["It has too much oxygen", "It swaps calcium and magnesium for sodium", "It is too cold"]$j$::jsonb)), 1, 1);
    end if;

    -- Final exam
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, 'Final exam', $c$Twenty questions covering the whole course. Score 80% or better (16 of 20) to pass and earn your **Water Wise** certificate and badge.

You'll see your score and the right answers when you finish. If you don't pass, you can take it again.$c$, false, null, $c$/course-media/water-chemistry-made-simple/00-course-cover.png$c$, 6)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which two readings should always be zero in a healthy tank?$q$, $j$["Ammonia and nitrite", "pH and KH", "GH and temperature"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which two readings should always be zero in a healthy tank?$q$, array(select jsonb_array_elements_text($j$["Ammonia and nitrite", "pH and KH", "GH and temperature"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the best plan for most fish?$q$, $j$["Pick fish that suit your water and keep it steady", "Change the pH every day", "Chase a perfect pH with chemicals"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the best plan for most fish?$q$, array(select jsonb_array_elements_text($j$["Pick fish that suit your water and keep it steady", "Change the pH every day", "Chase a perfect pH with chemicals"]$j$::jsonb)), 0, 1);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does a pH of 7 mean?$q$, $j$["Acidic", "Neutral", "Very basic"]$j$::jsonb, 1, 2);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does a pH of 7 mean?$q$, array(select jsonb_array_elements_text($j$["Acidic", "Neutral", "Very basic"]$j$::jsonb)), 1, 2);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A pH above 7 is called:$q$, $j$["Alkaline (basic)", "Acidic", "Soft"]$j$::jsonb, 0, 3);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A pH above 7 is called:$q$, array(select jsonb_array_elements_text($j$["Alkaline (basic)", "Acidic", "Soft"]$j$::jsonb)), 0, 3);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$pH 6 is how many times more acidic than pH 8?$q$, $j$["10 times", "100 times", "2 times"]$j$::jsonb, 1, 4);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$pH 6 is how many times more acidic than pH 8?$q$, array(select jsonb_array_elements_text($j$["10 times", "100 times", "2 times"]$j$::jsonb)), 1, 4);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Most common community fish do well in a pH of about:$q$, $j$["9.0 to 10.0", "4.0 to 5.0", "6.5 to 7.8"]$j$::jsonb, 2, 5);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Most common community fish do well in a pH of about:$q$, array(select jsonb_array_elements_text($j$["9.0 to 10.0", "4.0 to 5.0", "6.5 to 7.8"]$j$::jsonb)), 2, 5);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually brings a slowly dropping pH back up?$q$, $j$["Leaving the light on", "Feeding more", "Regular water changes"]$j$::jsonb, 2, 6);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What usually brings a slowly dropping pH back up?$q$, array(select jsonb_array_elements_text($j$["Leaving the light on", "Feeding more", "Regular water changes"]$j$::jsonb)), 2, 6);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does KH stand for?$q$, $j$["Key health", "Kelvin heat", "Carbonate hardness"]$j$::jsonb, 2, 7);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does KH stand for?$q$, array(select jsonb_array_elements_text($j$["Key health", "Kelvin heat", "Carbonate hardness"]$j$::jsonb)), 2, 7);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A good KH range for most community tanks is about:$q$, $j$["20 to 30 dKH", "3 to 8 dKH", "0 to 1 dKH"]$j$::jsonb, 1, 8);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A good KH range for most community tanks is about:$q$, array(select jsonb_array_elements_text($j$["20 to 30 dKH", "3 to 8 dKH", "0 to 1 dKH"]$j$::jsonb)), 1, 8);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can you add to a filter to slowly raise KH?$q$, $j$["Activated carbon", "Crushed coral", "Driftwood"]$j$::jsonb, 1, 9);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can you add to a filter to slowly raise KH?$q$, array(select jsonb_array_elements_text($j$["Activated carbon", "Crushed coral", "Driftwood"]$j$::jsonb)), 1, 9);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Your pH keeps dropping between water changes. What should you test?$q$, $j$["Temperature", "KH", "Light"]$j$::jsonb, 1, 10);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Your pH keeps dropping between water changes. What should you test?$q$, array(select jsonb_array_elements_text($j$["Temperature", "KH", "Light"]$j$::jsonb)), 1, 10);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Water with lots of calcium and magnesium is called:$q$, $j$["Hard", "Soft", "Neutral"]$j$::jsonb, 0, 11);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Water with lots of calcium and magnesium is called:$q$, array(select jsonb_array_elements_text($j$["Hard", "Soft", "Neutral"]$j$::jsonb)), 0, 11);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do snails need minerals in the water?$q$, $j$["To build their shells", "To change color", "To swim faster"]$j$::jsonb, 0, 12);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do snails need minerals in the water?$q$, array(select jsonb_array_elements_text($j$["To build their shells", "To change color", "To swim faster"]$j$::jsonb)), 0, 12);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish naturally come from soft water?$q$, $j$["Mollies", "Tetras and rasboras", "African rift lake cichlids"]$j$::jsonb, 1, 13);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish naturally come from soft water?$q$, array(select jsonb_array_elements_text($j$["Mollies", "Tetras and rasboras", "African rift lake cichlids"]$j$::jsonb)), 1, 13);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Fish are cold-blooded. What does that mean for your tank?$q$, $j$["They need ice", "Water temperature controls their body temperature", "They don't care about temperature"]$j$::jsonb, 1, 14);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Fish are cold-blooded. What does that mean for your tank?$q$, array(select jsonb_array_elements_text($j$["They need ice", "Water temperature controls their body temperature", "They don't care about temperature"]$j$::jsonb)), 1, 14);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A common heater guideline is about:$q$, $j$["50 watts per gallon", "3 to 5 watts per gallon", "1 watt per 10 gallons"]$j$::jsonb, 1, 15);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$A common heater guideline is about:$q$, array(select jsonb_array_elements_text($j$["50 watts per gallon", "3 to 5 watts per gallon", "1 watt per 10 gallons"]$j$::jsonb)), 1, 15);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How steady should your tank's temperature be?$q$, $j$["It doesn't matter", "Within 15 degrees", "Within about 1 to 2 degrees"]$j$::jsonb, 2, 16);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How steady should your tank's temperature be?$q$, array(select jsonb_array_elements_text($j$["It doesn't matter", "Within 15 degrees", "Within about 1 to 2 degrees"]$j$::jsonb)), 2, 16);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why should you test your tap water at least once?$q$, $j$["Tap water is always perfect", "It may already contain ammonia or nitrate", "It never changes anything"]$j$::jsonb, 1, 17);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why should you test your tap water at least once?$q$, array(select jsonb_array_elements_text($j$["Tap water is always perfect", "It may already contain ammonia or nitrate", "It never changes anything"]$j$::jsonb)), 1, 17);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can happen when a conditioner breaks apart chloramine?$q$, $j$["The water turns red", "A small amount of ammonia is released", "Nothing happens"]$j$::jsonb, 1, 18);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can happen when a conditioner breaks apart chloramine?$q$, array(select jsonb_array_elements_text($j$["The water turns red", "A small amount of ammonia is released", "Nothing happens"]$j$::jsonb)), 1, 18);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Before fish can live in RO water, you need to:$q$, $j$["Add salt only", "Add minerals back", "Boil it"]$j$::jsonb, 1, 19);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Before fish can live in RO water, you need to:$q$, array(select jsonb_array_elements_text($j$["Add salt only", "Add minerals back", "Boil it"]$j$::jsonb)), 1, 19);
    end if;

    raise notice 'Water Chemistry Made Simple created';
  else
    raise notice 'Water Chemistry Made Simple already exists, skipped';
  end if;

end
$do$;

select c.sort_order, c.title,
       (select count(*) from public.course_sections s where s.course_id = c.id) as lessons,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
order by c.sort_order;
