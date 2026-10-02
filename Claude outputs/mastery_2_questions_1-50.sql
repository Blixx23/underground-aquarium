-- STEP 2 of 3. Foundations Mastery questions 1 to 50. Run after step 1. Safe to run again.
do $do$
declare
  sid uuid;
  opts_type text;
begin
  select udt_name into opts_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_questions' and column_name = 'options';

  select s.id into sid
  from public.course_sections s join public.courses c on c.id = s.course_id
  where c.slug = 'foundations-mastery' and s.title = 'Mastery exam';
  if sid is null then
    raise exception 'Run step 1 first (Foundations Mastery course not found)';
  end if;

  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why is a 20-gallon tank usually easier for a beginner than a 5-gallon tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why is a 20-gallon tank usually easier for a beginner than a 5-gallon tank?$q$, $j$["Larger tanks can run without a filter for the first month or so", "Fish in larger tanks produce less waste for their body size", "More water dilutes mistakes, so conditions change more slowly", "Bigger tanks come already cycled, so fish can go in on day one"]$j$::jsonb, 2, 0, 'setup', $x$More water spreads out waste, heat and mistakes, so temperature and water quality change slowly. Small tanks swing fast, so small errors hit fish harder.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why is a 20-gallon tank usually easier for a beginner than a 5-gallon tank?$q$, array(select jsonb_array_elements_text($j$["Larger tanks can run without a filter for the first month or so", "Fish in larger tanks produce less waste for their body size", "More water dilutes mistakes, so conditions change more slowly", "Bigger tanks come already cycled, so fish can go in on day one"]$j$::jsonb)), 2, 0, 'setup', $x$More water spreads out waste, heat and mistakes, so temperature and water quality change slowly. Small tanks swing fast, so small errors hit fish harder.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Water weighs about how much per gallon, and why does that matter?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Water weighs about how much per gallon, and why does that matter?$q$, $j$["About 2 pounds, so most furniture can hold a filled tank safely", "About 8 pounds, so the stand must hold the full filled weight", "About 4 pounds, so a sturdy desk or dresser is usually strong enough", "About 8 pounds, but the stand only needs to hold the empty glass"]$j$::jsonb, 1, 1, 'setup', $x$Water weighs about 8 pounds per gallon, so a filled 20-gallon tank is well over 160 pounds once you add glass, gravel and rock. Ordinary furniture can crack or tip under that load.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Water weighs about how much per gallon, and why does that matter?$q$, array(select jsonb_array_elements_text($j$["About 2 pounds, so most furniture can hold a filled tank safely", "About 8 pounds, so the stand must hold the full filled weight", "About 4 pounds, so a sturdy desk or dresser is usually strong enough", "About 8 pounds, but the stand only needs to hold the empty glass"]$j$::jsonb)), 1, 1, 'setup', $x$Water weighs about 8 pounds per gallon, so a filled 20-gallon tank is well over 160 pounds once you add glass, gravel and rock. Ordinary furniture can crack or tip under that load.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why should an aquarium be kept out of direct sunlight?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why should an aquarium be kept out of direct sunlight?$q$, $j$["Natural light confuses fish so they stop eating", "It kills the beneficial bacteria living in the filter media", "It fuels algae and can make the temperature swing", "It makes the pH drop to dangerous levels within a few hours"]$j$::jsonb, 2, 2, 'setup', $x$You can't control sunlight. It feeds algae and warms the water during the day, then lets it cool at night, which stresses fish.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why should an aquarium be kept out of direct sunlight?$q$, array(select jsonb_array_elements_text($j$["Natural light confuses fish so they stop eating", "It kills the beneficial bacteria living in the filter media", "It fuels algae and can make the temperature swing", "It makes the pH drop to dangerous levels within a few hours"]$j$::jsonb)), 2, 2, 'setup', $x$You can't control sunlight. It feeds algae and warms the water during the day, then lets it cool at night, which stresses fish.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What should never touch your aquarium bucket, sponges or decor?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What should never touch your aquarium bucket, sponges or decor?$q$, $j$["Old tank water saved from a water change", "Soap or household cleaners", "Dechlorinated tap water", "A clean towel used only for the aquarium"]$j$::jsonb, 1, 3, 'setup', $x$Soap and cleaners leave a residue that is toxic to fish and hard to rinse away. That's why aquarium tools should be used only for the aquarium.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What should never touch your aquarium bucket, sponges or decor?$q$, array(select jsonb_array_elements_text($j$["Old tank water saved from a water change", "Soap or household cleaners", "Dechlorinated tap water", "A clean towel used only for the aquarium"]$j$::jsonb)), 1, 3, 'setup', $x$Soap and cleaners leave a residue that is toxic to fish and hard to rinse away. That's why aquarium tools should be used only for the aquarium.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$You set up a brand-new tank yesterday. What is the right next step?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$You set up a brand-new tank yesterday. What is the right next step?$q$, $j$["Add a full group of fish so the bacteria grow faster", "Run it without fish and start the cycling process", "Add fish, but leave the filter off for the first week", "Change all the water daily until it looks clear"]$j$::jsonb, 1, 4, 'setup', $x$A new tank has almost no beneficial bacteria yet. Cycling it first builds the bacteria that keep ammonia and nitrite from poisoning fish.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$You set up a brand-new tank yesterday. What is the right next step?$q$, array(select jsonb_array_elements_text($j$["Add a full group of fish so the bacteria grow faster", "Run it without fish and start the cycling process", "Add fish, but leave the filter off for the first week", "Change all the water daily until it looks clear"]$j$::jsonb)), 1, 4, 'setup', $x$A new tank has almost no beneficial bacteria yet. Cycling it first builds the bacteria that keep ammonia and nitrite from poisoning fish.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why do you use a gravel siphon during a water change?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why do you use a gravel siphon during a water change?$q$, $j$["It strips out the bacteria so the gravel stays sterile", "It pushes fresh oxygen down into the gravel bed", "It cools the water before you refill the tank", "It pulls waste out of the gravel while draining water"]$j$::jsonb, 3, 5, 'setup', $x$Uneaten food and waste settle into the gravel, where they rot. The siphon removes that debris in the same step as removing old water.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why do you use a gravel siphon during a water change?$q$, array(select jsonb_array_elements_text($j$["It strips out the bacteria so the gravel stays sterile", "It pushes fresh oxygen down into the gravel bed", "It cools the water before you refill the tank", "It pulls waste out of the gravel while draining water"]$j$::jsonb)), 3, 5, 'setup', $x$Uneaten food and waste settle into the gravel, where they rot. The siphon removes that debris in the same step as removing old water.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which maintenance routine matches what the course recommends for most tanks?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which maintenance routine matches what the course recommends for most tanks?$q$, $j$["Just top off the water that evaporates each week", "One complete water change about once a year", "About 25% weekly, using conditioned water", "A 100% water change every day to keep it spotless"]$j$::jsonb, 2, 6, 'setup', $x$Regular partial changes steadily remove nitrate and waste without shocking fish. Huge or rare changes cause big swings in the water.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which maintenance routine matches what the course recommends for most tanks?$q$, array(select jsonb_array_elements_text($j$["Just top off the water that evaporates each week", "One complete water change about once a year", "About 25% weekly, using conditioned water", "A 100% water change every day to keep it spotless"]$j$::jsonb)), 2, 6, 'setup', $x$Regular partial changes steadily remove nitrate and waste without shocking fish. Huge or rare changes cause big swings in the water.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$You top off evaporated water for months but never do a water change. What builds up?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$You top off evaporated water for months but never do a water change. What builds up?$q$, $j$["Nitrate and other dissolved waste", "Extra oxygen from fresh water", "Only chlorine from each top-off", "Nothing, since top-offs replace the water"]$j$::jsonb, 0, 7, 'setup', $x$Only pure water evaporates. Everything dissolved in it stays behind and gets more concentrated until you actually remove water.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$You top off evaporated water for months but never do a water change. What builds up?$q$, array(select jsonb_array_elements_text($j$["Nitrate and other dissolved waste", "Extra oxygen from fresh water", "Only chlorine from each top-off", "Nothing, since top-offs replace the water"]$j$::jsonb)), 0, 7, 'setup', $x$Only pure water evaporates. Everything dissolved in it stays behind and gets more concentrated until you actually remove water.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which acclimation method does the course recommend for most new fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which acclimation method does the course recommend for most new fish?$q$, $j$["Float about 15 min, mix in tank water 20 to 30 min, then net it in", "Float the bag for 2 minutes, then pour the fish and water in", "Set the bag in a bowl of cold water first so the fish calms down", "Pour the bag straight in so the fish spends less time stressed"]$j$::jsonb, 0, 8, 'setup', $x$Floating matches the temperature, and mixing in tank water lets the fish adjust to your water chemistry slowly. Netting it in keeps store water out of your tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which acclimation method does the course recommend for most new fish?$q$, array(select jsonb_array_elements_text($j$["Float about 15 min, mix in tank water 20 to 30 min, then net it in", "Float the bag for 2 minutes, then pour the fish and water in", "Set the bag in a bowl of cold water first so the fish calms down", "Pour the bag straight in so the fish spends less time stressed"]$j$::jsonb)), 0, 8, 'setup', $x$Floating matches the temperature, and mixing in tank water lets the fish adjust to your water chemistry slowly. Netting it in keeps store water out of your tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why net new fish into your tank instead of pouring in the store water?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why net new fish into your tank instead of pouring in the store water?$q$, $j$["Store water is colder and will chill the whole tank", "Store water holds too much oxygen for a home tank", "Store water can carry disease and waste", "Store water is too clean and will stall your cycle"]$j$::jsonb, 2, 9, 'setup', $x$The store's system may carry parasites, bacteria and ammonia from many fish. Leaving that water behind protects your tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why net new fish into your tank instead of pouring in the store water?$q$, array(select jsonb_array_elements_text($j$["Store water is colder and will chill the whole tank", "Store water holds too much oxygen for a home tank", "Store water can carry disease and waste", "Store water is too clean and will stall your cycle"]$j$::jsonb)), 2, 9, 'setup', $x$The store's system may carry parasites, bacteria and ammonia from many fish. Leaving that water behind protects your tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How much should you feed at one time?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How much should you feed at one time?$q$, $j$["One large meal on Sunday that lasts the whole week", "As much as they will eat, until they stop on their own", "Only what they finish in about 1 to 2 minutes", "Enough to leave a little on the gravel for later"]$j$::jsonb, 2, 10, 'setup', $x$Food that isn't eaten quickly sinks and rots, which raises ammonia. Fish have small stomachs, so small meals once or twice a day are plenty.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How much should you feed at one time?$q$, array(select jsonb_array_elements_text($j$["One large meal on Sunday that lasts the whole week", "As much as they will eat, until they stop on their own", "Only what they finish in about 1 to 2 minutes", "Enough to leave a little on the gravel for later"]$j$::jsonb)), 2, 10, 'setup', $x$Food that isn't eaten quickly sinks and rots, which raises ammonia. Fish have small stomachs, so small meals once or twice a day are plenty.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your fish are suddenly gasping at the surface. What does that most often point to?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your fish are suddenly gasping at the surface. What does that most often point to?$q$, $j$["An ammonia spike or low oxygen in the water", "The heater is set a few degrees too cool for them", "The fish are healthy and simply playing near the light", "The fish are hungry and are begging for more food"]$j$::jsonb, 0, 11, 'setup', $x$Gasping means fish are struggling to breathe, which usually comes from a water problem. Test ammonia and nitrite and make sure the surface is moving to add oxygen.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your fish are suddenly gasping at the surface. What does that most often point to?$q$, array(select jsonb_array_elements_text($j$["An ammonia spike or low oxygen in the water", "The heater is set a few degrees too cool for them", "The fish are healthy and simply playing near the light", "The fish are hungry and are begging for more food"]$j$::jsonb)), 0, 11, 'setup', $x$Gasping means fish are struggling to breathe, which usually comes from a water problem. Test ammonia and nitrite and make sure the surface is moving to add oxygen.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the correct order of the nitrogen cycle?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the correct order of the nitrogen cycle?$q$, $j$["Ammonia, then nitrate, and finally nitrite", "Ammonia, then nitrite, then nitrate", "Nitrate, then nitrite, then ammonia", "Nitrite, then ammonia, then nitrate"]$j$::jsonb, 1, 12, 'cycle', $x$Fish waste makes ammonia, and one group of bacteria turns it into nitrite. A second group turns nitrite into nitrate, which is far less harmful.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the correct order of the nitrogen cycle?$q$, array(select jsonb_array_elements_text($j$["Ammonia, then nitrate, and finally nitrite", "Ammonia, then nitrite, then nitrate", "Nitrate, then nitrite, then ammonia", "Nitrite, then ammonia, then nitrate"]$j$::jsonb)), 1, 12, 'cycle', $x$Fish waste makes ammonia, and one group of bacteria turns it into nitrite. A second group turns nitrite into nitrate, which is far less harmful.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Where do most of a tank's beneficial bacteria live?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Where do most of a tank's beneficial bacteria live?$q$, $j$["Floating freely in the open water", "On surfaces, especially the filter media", "Mostly inside the fish's gut and slime coat", "In the top layer of the water, near the air"]$j$::jsonb, 1, 13, 'cycle', $x$Nitrifying bacteria cling to surfaces instead of floating in the water. Filter media has lots of surface and steady water flow, so it holds the biggest colony.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Where do most of a tank's beneficial bacteria live?$q$, array(select jsonb_array_elements_text($j$["Floating freely in the open water", "On surfaces, especially the filter media", "Mostly inside the fish's gut and slime coat", "In the top layer of the water, near the air"]$j$::jsonb)), 1, 13, 'cycle', $x$Nitrifying bacteria cling to surfaces instead of floating in the water. Filter media has lots of surface and steady water flow, so it holds the biggest colony.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which compound does a cycled tank rely on water changes to remove?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which compound does a cycled tank rely on water changes to remove?$q$, $j$["Dissolved oxygen", "Nitrite", "Nitrate", "Ammonia"]$j$::jsonb, 2, 14, 'cycle', $x$In a cycled tank, bacteria convert ammonia and nitrite for you. Nitrate is the end product, so it keeps building up until water changes or plants remove it.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which compound does a cycled tank rely on water changes to remove?$q$, array(select jsonb_array_elements_text($j$["Dissolved oxygen", "Nitrite", "Nitrate", "Ammonia"]$j$::jsonb)), 2, 14, 'cycle', $x$In a cycled tank, bacteria convert ammonia and nitrite for you. Nitrate is the end product, so it keeps building up until water changes or plants remove it.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How does nitrite harm fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How does nitrite harm fish?$q$, $j$["It makes the water too acidic to breathe", "It only damages the edges of their fins", "It slowly dissolves their scales and slime coat", "It keeps their blood from carrying oxygen"]$j$::jsonb, 3, 15, 'cycle', $x$Nitrite gets into the blood and blocks it from carrying oxygen. That's why poisoned fish can gasp even when the water has plenty of oxygen.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How does nitrite harm fish?$q$, array(select jsonb_array_elements_text($j$["It makes the water too acidic to breathe", "It only damages the edges of their fins", "It slowly dissolves their scales and slime coat", "It keeps their blood from carrying oxygen"]$j$::jsonb)), 3, 15, 'cycle', $x$Nitrite gets into the blood and blocks it from carrying oxygen. That's why poisoned fish can gasp even when the water has plenty of oxygen.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$During a fishless cycle, about what ammonia level should you dose to?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$During a fishless cycle, about what ammonia level should you dose to?$q$, $j$["About 0.1 ppm", "About 20 ppm", "None at all", "About 2 ppm"]$j$::jsonb, 3, 16, 'cycle', $x$About 2 ppm gives the bacteria plenty of food. Much higher levels can stall the cycle, and with no ammonia source there's nothing for bacteria to grow on.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$During a fishless cycle, about what ammonia level should you dose to?$q$, array(select jsonb_array_elements_text($j$["About 0.1 ppm", "About 20 ppm", "None at all", "About 2 ppm"]$j$::jsonb)), 3, 16, 'cycle', $x$About 2 ppm gives the bacteria plenty of food. Much higher levels can stall the cycle, and with no ammonia source there's nothing for bacteria to grow on.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which result proves a fishless cycle is finished?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which result proves a fishless cycle is finished?$q$, $j$["2 ppm ammonia clears to 0 ammonia and 0 nitrite in 24 hours", "Exactly two weeks have passed since you first added ammonia", "Nitrate reads exactly zero after a full day of testing", "The water turns crystal clear and stays that way for a week"]$j$::jsonb, 0, 17, 'cycle', $x$Clear water and time passing don't prove anything. The tank is ready when its bacteria can process a full dose of ammonia, and the nitrite it creates, within a day.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which result proves a fishless cycle is finished?$q$, array(select jsonb_array_elements_text($j$["2 ppm ammonia clears to 0 ammonia and 0 nitrite in 24 hours", "Exactly two weeks have passed since you first added ammonia", "Nitrate reads exactly zero after a full day of testing", "The water turns crystal clear and stays that way for a week"]$j$::jsonb)), 0, 17, 'cycle', $x$Clear water and time passing don't prove anything. The tank is ready when its bacteria can process a full dose of ammonia, and the nitrite it creates, within a day.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your fishless cycle has stalled for two weeks and pH reads 6.0. What is the most likely fix?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your fishless cycle has stalled for two weeks and pH reads 6.0. What is the most likely fix?$q$, $j$["Raise the pH with a water change or a little baking soda", "Turn the filter off for a few days to let bacteria settle", "Dose much more ammonia so the bacteria have extra food", "Lower the temperature to 65\u00b0F so the bacteria can rest"]$j$::jsonb, 0, 18, 'cycle', $x$Nitrifying bacteria slow down sharply once pH falls below about 6.5. Fresh water or a little baking soda restores the buffer and brings the pH back up so they can work again.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your fishless cycle has stalled for two weeks and pH reads 6.0. What is the most likely fix?$q$, array(select jsonb_array_elements_text($j$["Raise the pH with a water change or a little baking soda", "Turn the filter off for a few days to let bacteria settle", "Dose much more ammonia so the bacteria have extra food", "Lower the temperature to 65\u00b0F so the bacteria can rest"]$j$::jsonb)), 0, 18, 'cycle', $x$Nitrifying bacteria slow down sharply once pH falls below about 6.5. Fresh water or a little baking soda restores the buffer and brings the pH back up so they can work again.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why do a large water change right before adding fish to a freshly cycled tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why do a large water change right before adding fish to a freshly cycled tank?$q$, $j$["To add fresh ammonia so the bacteria have food", "To drop the pH as low as possible for new fish", "To remove the bacteria so the fish can add their own", "To lower the nitrate that built up during cycling"]$j$::jsonb, 3, 19, 'cycle', $x$Weeks of dosing ammonia leave a lot of nitrate behind. A 50 to 75% change resets it, and the bacteria stay safe on the filter and surfaces.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why do a large water change right before adding fish to a freshly cycled tank?$q$, array(select jsonb_array_elements_text($j$["To add fresh ammonia so the bacteria have food", "To drop the pH as low as possible for new fish", "To remove the bacteria so the fish can add their own", "To lower the nitrate that built up during cycling"]$j$::jsonb)), 3, 19, 'cycle', $x$Weeks of dosing ammonia leave a lot of nitrate behind. A 50 to 75% change resets it, and the bacteria stay safe on the filter and surfaces.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$During a fish-in cycle, what level should you keep ammonia plus nitrite at or below?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$During a fish-in cycle, what level should you keep ammonia plus nitrite at or below?$q$, $j$["2 ppm each", "0.5 ppm combined", "5 ppm combined", "Any level, as long as the fish look fine"]$j$::jsonb, 1, 20, 'cycle', $x$At or under 0.5 ppm total, the fish stay reasonably safe while the bacteria still get enough food to grow. Fish can be harmed before they look sick.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$During a fish-in cycle, what level should you keep ammonia plus nitrite at or below?$q$, array(select jsonb_array_elements_text($j$["2 ppm each", "0.5 ppm combined", "5 ppm combined", "Any level, as long as the fish look fine"]$j$::jsonb)), 1, 20, 'cycle', $x$At or under 0.5 ppm total, the fish stay reasonably safe while the bacteria still get enough food to grow. Fish can be harmed before they look sick.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your test shows ammonia 0, nitrite 1.5 ppm and nitrate 10 ppm. Where is the cycle?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your test shows ammonia 0, nitrite 1.5 ppm and nitrate 10 ppm. Where is the cycle?$q$, $j$["It is fully cycled, because nitrate is now showing up", "It has not started yet, because ammonia bacteria haven't appeared", "Late stage; nitrite-eating bacteria are still catching up", "It has crashed, and the bacteria have all died off"]$j$::jsonb, 2, 21, 'cycle', $x$Zero ammonia and some nitrate mean the first bacteria are working. Nitrite still showing means the second group isn't big enough yet, so the cycle is close but not done.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your test shows ammonia 0, nitrite 1.5 ppm and nitrate 10 ppm. Where is the cycle?$q$, array(select jsonb_array_elements_text($j$["It is fully cycled, because nitrate is now showing up", "It has not started yet, because ammonia bacteria haven't appeared", "Late stage; nitrite-eating bacteria are still catching up", "It has crashed, and the bacteria have all died off"]$j$::jsonb)), 2, 21, 'cycle', $x$Zero ammonia and some nitrate mean the first bacteria are working. Nitrite still showing means the second group isn't big enough yet, so the cycle is close but not done.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$When is the same ammonia reading most dangerous to fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$When is the same ammonia reading most dangerous to fish?$q$, $j$["When pH and temperature are both low", "Right after live plants have been added", "When the lights have been off for hours", "When pH and temperature are high"]$j$::jsonb, 3, 22, 'cycle', $x$In warm, alkaline water more of the ammonia is in its toxic form, so the same test reading does more harm. In cool, acidic water more of it is the milder form.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$When is the same ammonia reading most dangerous to fish?$q$, array(select jsonb_array_elements_text($j$["When pH and temperature are both low", "Right after live plants have been added", "When the lights have been off for hours", "When pH and temperature are high"]$j$::jsonb)), 3, 22, 'cycle', $x$In warm, alkaline water more of the ammonia is in its toxic form, so the same test reading does more harm. In cool, acidic water more of it is the milder form.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the most effective real shortcut for cycling a new tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the most effective real shortcut for cycling a new tank?$q$, $j$["Adding a pinch of flake food every day and waiting it out", "Seeded filter media from an established, healthy tank", "Doing a 100% water change every day for two weeks", "Letting the empty tank sit and run for a full month"]$j$::jsonb, 1, 23, 'cycle', $x$Used media already carries a working bacteria colony, so the new tank starts partly cycled. An empty tank with no ammonia grows nothing, and rotting food is slow and messy.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the most effective real shortcut for cycling a new tank?$q$, array(select jsonb_array_elements_text($j$["Adding a pinch of flake food every day and waiting it out", "Seeded filter media from an established, healthy tank", "Doing a 100% water change every day for two weeks", "Letting the empty tank sit and run for a full month"]$j$::jsonb)), 1, 23, 'cycle', $x$Used media already carries a working bacteria colony, so the new tank starts partly cycled. An empty tank with no ammonia grows nothing, and rotting food is slow and messy.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the safest way to clean filter media?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the safest way to clean filter media?$q$, $j$["Soak it in a weak bleach mix, then rinse it", "Swirl it in old tank water from a water change", "Replace all of it with brand-new media every month", "Rinse it well under hot tap water until clean"]$j$::jsonb, 1, 24, 'cycle', $x$Old tank water removes gunk without harming the bacteria. Chlorine and heat kill them, and replacing all the media throws the colony away.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the safest way to clean filter media?$q$, array(select jsonb_array_elements_text($j$["Soak it in a weak bleach mix, then rinse it", "Swirl it in old tank water from a water change", "Replace all of it with brand-new media every month", "Rinse it well under hot tap water until clean"]$j$::jsonb)), 1, 24, 'cycle', $x$Old tank water removes gunk without harming the bacteria. Chlorine and heat kill them, and replacing all the media throws the colony away.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$The power was out for 4 hours. What should you do before restarting the filter?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$The power was out for 4 hours. What should you do before restarting the filter?$q$, $j$["Restart it right away; a few hours is too short to matter", "Feed extra for a few days to help the bacteria recover", "Throw away the old media and start the whole cycle over from scratch", "Rinse media in tank water, restart, then test for a few days"]$j$::jsonb, 3, 25, 'cycle', $x$Bacteria sitting in still water can lose oxygen and start dying, and the filter can hold stale water. Rinsing flushes that out, and testing catches a mini-cycle early.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$The power was out for 4 hours. What should you do before restarting the filter?$q$, array(select jsonb_array_elements_text($j$["Restart it right away; a few hours is too short to matter", "Feed extra for a few days to help the bacteria recover", "Throw away the old media and start the whole cycle over from scratch", "Rinse media in tank water, restart, then test for a few days"]$j$::jsonb)), 3, 25, 'cycle', $x$Bacteria sitting in still water can lose oxygen and start dying, and the filter can hold stale water. Rinsing flushes that out, and testing catches a mini-cycle early.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$A tank set up last week has turned milky white. What is it usually?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A tank set up last week has turned milky white. What is it usually?$q$, $j$["Ammonia poisoning that calls for a 100% water change today", "Fast-growing green algae floating in the water", "A nitrate overdose from the new tap water", "A bacterial bloom that usually clears on its own"]$j$::jsonb, 3, 26, 'cycle', $x$New tanks often get a cloudy bloom of free-floating bacteria while the colony settles. It usually fades in days, so test the water rather than chasing the haze.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A tank set up last week has turned milky white. What is it usually?$q$, array(select jsonb_array_elements_text($j$["Ammonia poisoning that calls for a 100% water change today", "Fast-growing green algae floating in the water", "A nitrate overdose from the new tap water", "A bacterial bloom that usually clears on its own"]$j$::jsonb)), 3, 26, 'cycle', $x$New tanks often get a cloudy bloom of free-floating bacteria while the colony settles. It usually fades in days, so test the water rather than chasing the haze.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$A tank cycled for a year gets 12 new fish at once, and ammonia appears. Why?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A tank cycled for a year gets 12 new fish at once, and ammonia appears. Why?$q$, $j$["Bright lights from the new setup killed the bacteria", "The bacteria colony died of old age after a year", "Waste jumped faster than the bacteria could grow", "New fish make no ammonia, so the test kit must be faulty"]$j$::jsonb, 2, 27, 'cycle', $x$The bacteria colony grows to match the waste it has been getting. A sudden big jump outruns it, causing a mini-cycle until the colony catches up.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A tank cycled for a year gets 12 new fish at once, and ammonia appears. Why?$q$, array(select jsonb_array_elements_text($j$["Bright lights from the new setup killed the bacteria", "The bacteria colony died of old age after a year", "Waste jumped faster than the bacteria could grow", "New fish make no ammonia, so the test kit must be faulty"]$j$::jsonb)), 2, 27, 'cycle', $x$The bacteria colony grows to match the waste it has been getting. A sudden big jump outruns it, causing a mini-cycle until the colony catches up.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is true about most fish you see for sale at a store?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is true about most fish you see for sale at a store?$q$, $j$["Store water slows growth, so they stay small at home", "Fish only grow as big as the tank they are kept in", "Many are juveniles that will grow much larger", "Most are already at or near their full adult size"]$j$::jsonb, 2, 28, 'stocking', $x$Fish are usually sold young because small fish are cheaper to ship. Always look up the adult size before you buy.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is true about most fish you see for sale at a store?$q$, array(select jsonb_array_elements_text($j$["Store water slows growth, so they stay small at home", "Fish only grow as big as the tank they are kept in", "Many are juveniles that will grow much larger", "Most are already at or near their full adult size"]$j$::jsonb)), 2, 28, 'stocking', $x$Fish are usually sold young because small fish are cheaper to ship. Always look up the adult size before you buy.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$About how large can a common pleco grow?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$About how large can a common pleco grow?$q$, $j$["About 6 inches at most", "About 3 to 4 inches", "15 to 18 inches or more", "Only as large as its tank allows"]$j$::jsonb, 2, 29, 'stocking', $x$Common plecos are often sold at 2 to 3 inches but can grow well over a foot, which is far too big for most home tanks.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$About how large can a common pleco grow?$q$, array(select jsonb_array_elements_text($j$["About 6 inches at most", "About 3 to 4 inches", "15 to 18 inches or more", "Only as large as its tank allows"]$j$::jsonb)), 2, 29, 'stocking', $x$Common plecos are often sold at 2 to 3 inches but can grow well over a foot, which is far too big for most home tanks.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which of these fish will outgrow a typical 20-gallon tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which of these fish will outgrow a typical 20-gallon tank?$q$, $j$["Neon tetra", "Pygmy corydoras", "Bala shark", "Harlequin rasbora"]$j$::jsonb, 2, 30, 'stocking', $x$Bala sharks can reach about a foot long and are fast swimmers that need a group, so they need a very large tank. The others stay small.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which of these fish will outgrow a typical 20-gallon tank?$q$, array(select jsonb_array_elements_text($j$["Neon tetra", "Pygmy corydoras", "Bala shark", "Harlequin rasbora"]$j$::jsonb)), 2, 30, 'stocking', $x$Bala sharks can reach about a foot long and are fast swimmers that need a group, so they need a very large tank. The others stay small.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which is an example of the "mouth rule"?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which is an example of the "mouth rule"?$q$, $j$["A nerite snail scraping algae off the glass", "A grown angelfish eating neon tetras", "A betta snapping up flakes at the surface", "Corydoras grazing on leftover sinking food"]$j$::jsonb, 1, 31, 'stocking', $x$The mouth rule says any fish small enough to fit in a tankmate's mouth will likely get eaten. Adult angelfish and neon tetras are the classic example.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which is an example of the "mouth rule"?$q$, array(select jsonb_array_elements_text($j$["A nerite snail scraping algae off the glass", "A grown angelfish eating neon tetras", "A betta snapping up flakes at the surface", "Corydoras grazing on leftover sinking food"]$j$::jsonb)), 1, 31, 'stocking', $x$The mouth rule says any fish small enough to fit in a tankmate's mouth will likely get eaten. Adult angelfish and neon tetras are the classic example.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which pairing is a classic mismatch?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which pairing is a classic mismatch?$q$, $j$["Neon tetras with corydoras", "Tiger barbs with a betta", "Harlequin rasboras with nerite snails", "A honey gourami with harlequin rasboras"]$j$::jsonb, 1, 32, 'stocking', $x$Tiger barbs are known fin-nippers, and a betta's long, slow fins make it an easy target. The other pairings are peaceful community combinations.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which pairing is a classic mismatch?$q$, array(select jsonb_array_elements_text($j$["Neon tetras with corydoras", "Tiger barbs with a betta", "Harlequin rasboras with nerite snails", "A honey gourami with harlequin rasboras"]$j$::jsonb)), 1, 32, 'stocking', $x$Tiger barbs are known fin-nippers, and a betta's long, slow fins make it an easy target. The other pairings are peaceful community combinations.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the smallest group size most schooling fish need?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the smallest group size most schooling fish need?$q$, $j$["Just 1", "At least 3", "At least 2", "At least 6"]$j$::jsonb, 3, 33, 'stocking', $x$Schooling fish like tetras, rasboras and corydoras feel safe in numbers, and groups of 6 or more let them act naturally. Bigger groups are even better.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the smallest group size most schooling fish need?$q$, array(select jsonb_array_elements_text($j$["Just 1", "At least 3", "At least 2", "At least 6"]$j$::jsonb)), 3, 33, 'stocking', $x$Schooling fish like tetras, rasboras and corydoras feel safe in numbers, and groups of 6 or more let them act naturally. Bigger groups are even better.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What usually happens to a schooling fish that is kept alone?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What usually happens to a schooling fish that is kept alone?$q$, $j$["It stays healthy as long as it gets extra food", "It gets stressed, hides and gets sick more easily", "It grows much larger than normal without competition", "It becomes the boldest, most active fish in the tank"]$j$::jsonb, 1, 34, 'stocking', $x$Without a group, these fish feel exposed to predators. Constant stress weakens them, leading to hiding, faded color and illness.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What usually happens to a schooling fish that is kept alone?$q$, array(select jsonb_array_elements_text($j$["It stays healthy as long as it gets extra food", "It gets stressed, hides and gets sick more easily", "It grows much larger than normal without competition", "It becomes the boldest, most active fish in the tank"]$j$::jsonb)), 1, 34, 'stocking', $x$Without a group, these fish feel exposed to predators. Constant stress weakens them, leading to hiding, faded color and illness.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why shouldn't two male bettas share a tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why shouldn't two male bettas share a tank?$q$, $j$["They will breed too quickly and overcrowd the tank", "They will fight, often until one is badly hurt", "They will eat each other's food and slowly starve", "They need very different water temperatures"]$j$::jsonb, 1, 35, 'stocking', $x$Male bettas are highly territorial toward each other. In a shared tank they fight, and the loser can be badly injured or killed.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why shouldn't two male bettas share a tank?$q$, array(select jsonb_array_elements_text($j$["They will breed too quickly and overcrowd the tank", "They will fight, often until one is badly hurt", "They will eat each other's food and slowly starve", "They need very different water temperatures"]$j$::jsonb)), 1, 35, 'stocking', $x$Male bettas are highly territorial toward each other. In a shared tank they fight, and the loser can be badly injured or killed.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which temperature ranges are right?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which temperature ranges are right?$q$, $j$["Both about 60 to 65\u00b0F, since cool water holds more oxygen", "Goldfish about 65 to 72\u00b0F, tropicals about 74 to 80\u00b0F", "Both about 80 to 85\u00b0F, since all fish like warm water", "Goldfish about 80\u00b0F, tropicals about 65\u00b0F"]$j$::jsonb, 1, 36, 'stocking', $x$Goldfish are coldwater fish and tropical fish need steady warmth. Because their ranges barely overlap, the two groups shouldn't share a tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which temperature ranges are right?$q$, array(select jsonb_array_elements_text($j$["Both about 60 to 65\u00b0F, since cool water holds more oxygen", "Goldfish about 65 to 72\u00b0F, tropicals about 74 to 80\u00b0F", "Both about 80 to 85\u00b0F, since all fish like warm water", "Goldfish about 80\u00b0F, tropicals about 65\u00b0F"]$j$::jsonb)), 1, 36, 'stocking', $x$Goldfish are coldwater fish and tropical fish need steady warmth. Because their ranges barely overlap, the two groups shouldn't share a tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which fish naturally needs hard water with a high pH?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which fish naturally needs hard water with a high pH?$q$, $j$["African rift lake cichlids", "South American discus", "Cardinal and neon tetras", "Harlequin rasboras and chili rasboras"]$j$::jsonb, 0, 37, 'stocking', $x$The African rift lakes are naturally hard and alkaline, and their cichlids are adapted to that. Discus, tetras and rasboras come from soft, acidic waters.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which fish naturally needs hard water with a high pH?$q$, array(select jsonb_array_elements_text($j$["African rift lake cichlids", "South American discus", "Cardinal and neon tetras", "Harlequin rasboras and chili rasboras"]$j$::jsonb)), 0, 37, 'stocking', $x$The African rift lakes are naturally hard and alkaline, and their cichlids are adapted to that. Discus, tetras and rasboras come from soft, acidic waters.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the main weakness of the "one inch of fish per gallon" rule?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the main weakness of the "one inch of fish per gallon" rule?$q$, $j$["It counts snails and shrimp but leaves out fish", "It ignores body bulk, so big fish get undercounted", "It is meant only for saltwater tanks, not freshwater ones", "It only works in tanks that have live plants"]$j$::jsonb, 1, 38, 'stocking', $x$Waste depends on body mass, not just length. One thick 10-inch fish produces far more waste than ten slim 1-inch fish.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the main weakness of the "one inch of fish per gallon" rule?$q$, array(select jsonb_array_elements_text($j$["It counts snails and shrimp but leaves out fish", "It ignores body bulk, so big fish get undercounted", "It is meant only for saltwater tanks, not freshwater ones", "It only works in tanks that have live plants"]$j$::jsonb)), 1, 38, 'stocking', $x$Waste depends on body mass, not just length. One thick 10-inch fish produces far more waste than ten slim 1-inch fish.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which of these adds the most bioload to a tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which of these adds the most bioload to a tank?$q$, $j$["A weekly 25% water change", "A thick group of fast-growing live plants", "One nerite snail on the glass", "A pair of large fancy goldfish"]$j$::jsonb, 3, 39, 'stocking', $x$Bioload is the waste a tank has to handle. Big goldfish eat a lot and produce heavy waste, while plants and water changes actually reduce the load.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which of these adds the most bioload to a tank?$q$, array(select jsonb_array_elements_text($j$["A weekly 25% water change", "A thick group of fast-growing live plants", "One nerite snail on the glass", "A pair of large fancy goldfish"]$j$::jsonb)), 3, 39, 'stocking', $x$Bioload is the waste a tank has to handle. Big goldfish eat a lot and produce heavy waste, while plants and water changes actually reduce the load.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the best way to stock a newly cycled tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the best way to stock a newly cycled tank?$q$, $j$["Start with the most delicate fish while the water is fresh and clean", "Add a few hardy fish at a time, a couple of weeks apart", "Add one new fish every single day until it is full", "Add every fish you plan to keep on the same day"]$j$::jsonb, 1, 40, 'stocking', $x$Each new group adds waste. Spacing additions out gives the bacteria time to grow and keep up, and hardy fish handle small bumps better.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the best way to stock a newly cycled tank?$q$, array(select jsonb_array_elements_text($j$["Start with the most delicate fish while the water is fresh and clean", "Add a few hardy fish at a time, a couple of weeks apart", "Add one new fish every single day until it is full", "Add every fish you plan to keep on the same day"]$j$::jsonb)), 1, 40, 'stocking', $x$Each new group adds waste. Spacing additions out gives the bacteria time to grow and keep up, and hardy fish handle small bumps better.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$In a community tank, which fish best fills the "bottom crew" role?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$In a community tank, which fish best fills the "bottom crew" role?$q$, $j$["A group of corydoras", "A single oscar", "A group of neon tetras", "A male betta"]$j$::jsonb, 0, 41, 'stocking', $x$Corydoras spend their time along the bottom, stay small, are peaceful and do well in groups. Neons swim mid-water, and oscars and bettas aren't bottom dwellers.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$In a community tank, which fish best fills the "bottom crew" role?$q$, array(select jsonb_array_elements_text($j$["A group of corydoras", "A single oscar", "A group of neon tetras", "A male betta"]$j$::jsonb)), 0, 41, 'stocking', $x$Corydoras spend their time along the bottom, stay small, are peaceful and do well in groups. Neons swim mid-water, and oscars and bettas aren't bottom dwellers.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What do most fish handle worse?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What do most fish handle worse?$q$, $j$["Soft water that they were raised in", "A steady pH a little off the ideal", "Sudden swings in their water conditions", "Hard water that they were raised in"]$j$::jsonb, 2, 42, 'chemistry', $x$Most farm-raised fish adapt to a wide range of water. Rapid changes force their bodies to readjust quickly, so steady water matters more than a perfect number.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What do most fish handle worse?$q$, array(select jsonb_array_elements_text($j$["Soft water that they were raised in", "A steady pH a little off the ideal", "Sudden swings in their water conditions", "Hard water that they were raised in"]$j$::jsonb)), 2, 42, 'chemistry', $x$Most farm-raised fish adapt to a wide range of water. Rapid changes force their bodies to readjust quickly, so steady water matters more than a perfect number.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Compared with pH 8, water at pH 6 is:$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Compared with pH 8, water at pH 6 is:$q$, $j$["2 times more acidic", "10 times more acidic", "The same; it's just a different number", "100 times more acidic"]$j$::jsonb, 3, 43, 'chemistry', $x$Each whole step on the pH scale is a tenfold change. Two steps is 10 × 10, or 100 times.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Compared with pH 8, water at pH 6 is:$q$, array(select jsonb_array_elements_text($j$["2 times more acidic", "10 times more acidic", "The same; it's just a different number", "100 times more acidic"]$j$::jsonb)), 3, 43, 'chemistry', $x$Each whole step on the pH scale is a tenfold change. Two steps is 10 × 10, or 100 times.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What does a pH above 7 mean?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What does a pH above 7 mean?$q$, $j$["The water is neutral", "The water is soft and low in minerals", "The water is basic (alkaline)", "The water is acidic"]$j$::jsonb, 2, 44, 'chemistry', $x$On the pH scale, below 7 is acidic, 7 is neutral, and above 7 is basic, also called alkaline. pH and softness are separate measurements.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What does a pH above 7 mean?$q$, array(select jsonb_array_elements_text($j$["The water is neutral", "The water is soft and low in minerals", "The water is basic (alkaline)", "The water is acidic"]$j$::jsonb)), 2, 44, 'chemistry', $x$On the pH scale, below 7 is acidic, 7 is neutral, and above 7 is basic, also called alkaline. pH and softness are separate measurements.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Most common community fish do well in about what pH range?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Most common community fish do well in about what pH range?$q$, $j$["Exactly 7.0", "4.0 to 5.0", "6.5 to 7.8", "9.0 to 10.0"]$j$::jsonb, 2, 45, 'chemistry', $x$Most community fish are comfortable between about 6.5 and 7.8. Within that range, keeping pH steady matters more than hitting one exact number.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Most common community fish do well in about what pH range?$q$, array(select jsonb_array_elements_text($j$["Exactly 7.0", "4.0 to 5.0", "6.5 to 7.8", "9.0 to 10.0"]$j$::jsonb)), 2, 45, 'chemistry', $x$Most community fish are comfortable between about 6.5 and 7.8. Within that range, keeping pH steady matters more than hitting one exact number.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why does pH slowly drop in a tank that rarely gets water changes?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why does pH slowly drop in a tank that rarely gets water changes?$q$, $j$["The tank light slowly breaks the water down over time", "Fish breathe out salt, which makes the water acidic", "The gravel slowly dissolves and turns the water sour", "Acids from filter bacteria build up between changes"]$j$::jsonb, 3, 46, 'chemistry', $x$Turning ammonia into nitrate releases acid. Over time that acid uses up the water's buffer and pH falls, and water changes bring fresh buffer back.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why does pH slowly drop in a tank that rarely gets water changes?$q$, array(select jsonb_array_elements_text($j$["The tank light slowly breaks the water down over time", "Fish breathe out salt, which makes the water acidic", "The gravel slowly dissolves and turns the water sour", "Acids from filter bacteria build up between changes"]$j$::jsonb)), 3, 46, 'chemistry', $x$Turning ammonia into nitrate releases acid. Over time that acid uses up the water's buffer and pH falls, and water changes bring fresh buffer back.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is KH's main job in an aquarium?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is KH's main job in an aquarium?$q$, $j$["It kills harmful bacteria in the water", "It buffers pH so it stays steady", "It is the main food source for plants", "It measures dissolved oxygen"]$j$::jsonb, 1, 47, 'chemistry', $x$KH, or carbonate hardness, soaks up acids before they can change the pH. More KH means a steadier pH.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is KH's main job in an aquarium?$q$, array(select jsonb_array_elements_text($j$["It kills harmful bacteria in the water", "It buffers pH so it stays steady", "It is the main food source for plants", "It measures dissolved oxygen"]$j$::jsonb)), 1, 47, 'chemistry', $x$KH, or carbonate hardness, soaks up acids before they can change the pH. More KH means a steadier pH.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your pH keeps crashing between water changes. Which test should you run first?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your pH keeps crashing between water changes. Which test should you run first?$q$, $j$["Temperature", "KH", "Nitrite", "Phosphate"]$j$::jsonb, 1, 48, 'chemistry', $x$Low KH is the most common cause of pH crashes. When the buffer runs out, nothing stops the acids from dragging pH down.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your pH keeps crashing between water changes. Which test should you run first?$q$, array(select jsonb_array_elements_text($j$["Temperature", "KH", "Nitrite", "Phosphate"]$j$::jsonb)), 1, 48, 'chemistry', $x$Low KH is the most common cause of pH crashes. When the buffer runs out, nothing stops the acids from dragging pH down.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What can you add to a filter to raise KH and GH slowly?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What can you add to a filter to raise KH and GH slowly?$q$, $j$["Activated carbon", "Peat moss", "Driftwood", "Crushed coral"]$j$::jsonb, 3, 49, 'chemistry', $x$Crushed coral is made of calcium carbonate, which slowly dissolves and adds hardness. Driftwood and peat release tannins that soften water and lower pH.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What can you add to a filter to raise KH and GH slowly?$q$, array(select jsonb_array_elements_text($j$["Activated carbon", "Peat moss", "Driftwood", "Crushed coral"]$j$::jsonb)), 3, 49, 'chemistry', $x$Crushed coral is made of calcium carbonate, which slowly dissolves and adds hardness. Driftwood and peat release tannins that soften water and lower pH.$x$);
      end if;
  end if;
end
$do$;

select count(*) as mastery_questions_loaded
from public.course_questions q join public.course_sections s on s.id = q.section_id
join public.courses c on c.id = s.course_id
where c.slug = 'foundations-mastery';
