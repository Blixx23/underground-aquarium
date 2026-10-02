-- Five beginner courses: Choosing Your First Fish, Water Chemistry Made Simple,
-- Fish Health 101, Buying Healthy Fish, Live Plants for Beginners.
-- Each: 6 lessons with a branded image and 2 quiz questions, plus a 20-question final exam.
-- Paste into the Supabase SQL Editor and run once. Safe to run again: a course
-- that already exists (by slug) is skipped.
-- Needs course_media.sql (image_url column). course_levels.sql is optional; new
-- courses default to the Beginner level.
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

  -- ==================== Choosing Your First Fish ====================
  if not exists (select 1 from public.courses where slug = $c$choosing-your-first-fish$c$) then
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.courses;
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order)
    values ($c$choosing-your-first-fish$c$, $c$Choosing Your First Fish$c$, $c$Pick fish that fit your tank and get along$c$, $c$Learn how to choose fish that will stay healthy in your tank: how big they really get, how they behave, which ones need friends, and how many your tank can hold. You'll finish by planning a real community tank.$c$, 30, $c$Certified Stocker$c$, $c$/course-media/choosing-your-first-fish/00-course-cover.png$c$, true, next_sort)
    returning id into cid;

    -- 1. Adult size, not store size
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Adult size, not store size$c$, $c$Most fish in a store are babies. They look small and cute in the tank, but many of them keep growing for years. Picking fish by how big they are in the store is one of the most common beginner mistakes.

**Some popular fish that outgrow home tanks:**

- **Common pleco:** often 15 to 18 inches or more
- **Bala shark:** about 12 to 14 inches, and it swims in groups
- **Oscar:** about 12 inches and very heavy-bodied
- **Iridescent shark:** can pass 3 feet long

None of these belong in a 20 or 30 gallon tank, even if they fit today.

**The fix is easy:** before you buy any fish, look up its **adult size** and **minimum tank size**. Every fish in our Species Library lists both. If the adult fish won't fit your tank, pick a different fish.

**A good habit:** take a photo of the fish's name at the store, then look it up before you pay. A few minutes of research saves a fish from a cramped life.$c$, false, null, $c$/course-media/choosing-your-first-fish/01-adult-size.png$c$, 0)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do most fish look small at the store?$q$, $j$["Store water makes fish shrink", "They are sold as babies and keep growing", "They are a special small breed"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do most fish look small at the store?$q$, array(select jsonb_array_elements_text($j$["Store water makes fish shrink", "They are sold as babies and keep growing", "They are a special small breed"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$About how big can a common pleco get?$q$, $j$["4 inches", "15 to 18 inches or more", "8 inches"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$About how big can a common pleco get?$q$, array(select jsonb_array_elements_text($j$["4 inches", "15 to 18 inches or more", "8 inches"]$j$::jsonb)), 1, 1);
    end if;

    -- 2. Temperament: who gets along
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Temperament: who gets along$c$, $c$Fish have personalities. Some are calm, some are pushy, and some will chase or eat their tankmates. Mixing the wrong ones leads to stress, torn fins, and lost fish.

**Three basic types:**

- **Peaceful:** gets along with almost everyone. Examples: neon tetras, harlequin rasboras, corydoras.
- **Semi-aggressive:** fine with fish their own size, but may chase or nip others. Examples: tiger barbs, some gouramis.
- **Aggressive:** best kept alone or with fish chosen carefully. Examples: many large cichlids.

**Fin nippers and long fins don't mix.** Tiger barbs and serpae tetras often nip fins. Keep them away from fish with long, flowing fins like bettas and angelfish.

**The mouth rule:** if a small fish can fit in a bigger fish's mouth, sooner or later it probably will. Angelfish are usually calm with fish their own size, but they will eat neon tetras once they grow.

**Before you mix fish,** check each one's temperament in the Species Library, or let the Tank Builder check your list for you.$c$, false, null, $c$/course-media/choosing-your-first-fish/02-temperament.png$c$, 1)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish is known for nipping long fins?$q$, $j$["Tiger barb", "Corydoras", "Harlequin rasbora"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish is known for nipping long fins?$q$, array(select jsonb_array_elements_text($j$["Tiger barb", "Corydoras", "Harlequin rasbora"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the "mouth rule"?$q$, $j$["A fish that fits in a bigger fish's mouth will probably get eaten", "Fish only eat flakes", "Big fish never eat small fish"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the "mouth rule"?$q$, array(select jsonb_array_elements_text($j$["A fish that fits in a bigger fish's mouth will probably get eaten", "Fish only eat flakes", "Big fish never eat small fish"]$j$::jsonb)), 0, 1);
    end if;

    -- 3. Fish that need friends
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Fish that need friends$c$, $c$Many small fish live in big groups in the wild. Kept alone or in pairs, they get stressed, hide, lose color, and get sick more easily.

**Fish that need a group of at least 6:**

- Tetras, like neons and cardinals
- Rasboras, like harlequins
- Corydoras catfish
- Danios

A bigger group is even better. In a group, these fish swim out in the open, show brighter colors, and act more natural. That makes the tank more fun to watch too.

**Fish that should be kept alone or carefully:**

- **Male bettas** fight other male bettas. Keep one male per tank.
- Some gouramis and cichlids fight with their own kind.

**Plan for the whole group.** When you count how many fish your tank can hold, count the full school, not just one fish. Six neon tetras take up much more space and make much more waste than one.$c$, false, null, $c$/course-media/choosing-your-first-fish/03-schools.png$c$, 2)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the smallest group size most schooling fish need?$q$, $j$["6", "1", "2"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the smallest group size most schooling fish need?$q$, array(select jsonb_array_elements_text($j$["6", "1", "2"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why shouldn't you keep two male bettas together?$q$, $j$["They eat too much", "They will fight", "They need cold water"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why shouldn't you keep two male bettas together?$q$, array(select jsonb_array_elements_text($j$["They eat too much", "They will fight", "They need cold water"]$j$::jsonb)), 1, 1);
    end if;

    -- 4. Matching water and temperature
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Matching water and temperature$c$, $c$Every fish has a range of water it likes. Fish in the same tank need ranges that overlap, because they all share the same water.

**Tropical vs. coldwater fish:**

- **Tropical fish** like tetras, bettas, and gouramis want warm water, about 74 to 80°F. They need a heater.
- **Goldfish** are coldwater fish. They do best around 65 to 72°F and do not need a heater.

Don't keep goldfish with tropical fish. One group will always be too hot or too cold. Goldfish also make a lot of waste and grow much bigger than most people expect.

**pH and hardness:** most fish sold today were raised on fish farms and handle a wide range of water. What matters most is keeping your water **steady**. A few fish, like African cichlids, need hard water with a high pH. Check before you buy.

**Use the Species Library** to compare temperature and pH ranges. Pick fish whose ranges overlap with each other and with your tap water.$c$, false, null, $c$/course-media/choosing-your-first-fish/04-temperature.png$c$, 3)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What temperature do goldfish do best in?$q$, $j$["About 78 to 82\u00b0F", "About 85 to 90\u00b0F", "About 65 to 72\u00b0F"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What temperature do goldfish do best in?$q$, array(select jsonb_array_elements_text($j$["About 78 to 82\u00b0F", "About 85 to 90\u00b0F", "About 65 to 72\u00b0F"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$For most store-bought fish, what matters most about water?$q$, $j$["Making it as soft as possible", "An exact pH number", "Keeping it steady"]$j$::jsonb, 2, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$For most store-bought fish, what matters most about water?$q$, array(select jsonb_array_elements_text($j$["Making it as soft as possible", "An exact pH number", "Keeping it steady"]$j$::jsonb)), 2, 1);
    end if;

    -- 5. How many fish can my tank hold?
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$How many fish can my tank hold?$c$, $c$Every fish makes waste. Your filter and its bacteria can only handle so much. When you add too many fish, ammonia builds up and fish get sick. The amount of waste your fish make is called **bioload**.

**The "one inch per gallon" rule is only a rough guess.** A 10-inch fish makes far more waste than ten 1-inch fish, because it is much bigger around. Use the rule as a starting point at most.

**Things that raise bioload:**

- Big, chunky fish, like goldfish and oscars
- Fish that eat a lot
- Overfeeding

**Things that help:**

- A filter rated for your tank size or a little bigger
- Regular water changes
- Live plants, which use up some of the waste

**Add fish slowly.** Even in a cycled tank, add a few fish at a time and wait a couple of weeks before adding more. This gives your bacteria time to grow and keep up.

**Not sure?** The Tank Builder adds up your fish and warns you before your tank gets too crowded.$c$, false, null, $c$/course-media/choosing-your-first-fish/05-bioload.png$c$, 4)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does "bioload" mean?$q$, $j$["How much waste your fish make", "How bright your light is", "How heavy your tank is"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does "bioload" mean?$q$, array(select jsonb_array_elements_text($j$["How much waste your fish make", "How bright your light is", "How heavy your tank is"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the safest way to add fish to a cycled tank?$q$, $j$["All at once", "A few at a time, a couple of weeks apart"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is the safest way to add fish to a cycled tank?$q$, array(select jsonb_array_elements_text($j$["All at once", "A few at a time, a couple of weeks apart"]$j$::jsonb)), 1, 1);
    end if;

    -- 6. Plan your first community tank
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Plan your first community tank$c$, $c$Now let's put it all together. A good community tank has a few different "jobs" filled by fish that get along and like the same water.

**A simple plan in four parts:**

1. **A centerpiece fish:** one or a few eye-catching fish, like a honey gourami.
2. **A schooling group:** a group of 6 or more small fish that swim in the middle, like harlequin rasboras.
3. **A bottom crew:** a group of fish that live along the bottom, like corydoras.
4. **Cleanup helpers:** a nerite snail or two to graze on algae.

**Example for a 20-gallon tank:**

- 1 honey gourami
- 8 harlequin rasboras
- 6 panda corydoras
- 1 or 2 nerite snails

All of these are peaceful, stay small, and are comfortable in the mid-70s °F.

**Before you buy,** run your list through the Tank Builder. Then add your fish in small groups over a few weeks, starting with the hardiest ones.$c$, false, null, $c$/course-media/choosing-your-first-fish/06-plan.png$c$, 5)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What job do corydoras usually fill in a community tank?$q$, $j$["Algae on the glass only", "Centerpiece fish", "Bottom crew"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What job do corydoras usually fill in a community tank?$q$, array(select jsonb_array_elements_text($j$["Algae on the glass only", "Centerpiece fish", "Bottom crew"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do before buying the fish on your plan?$q$, $j$["Check them in the Tank Builder", "Pick the brightest colors only", "Buy them all on day one"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do before buying the fish on your plan?$q$, array(select jsonb_array_elements_text($j$["Check them in the Tank Builder", "Pick the brightest colors only", "Buy them all on day one"]$j$::jsonb)), 0, 1);
    end if;

    -- Final exam
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, 'Final exam', $c$Twenty questions covering the whole course. Score 80% or better (16 of 20) to pass and earn your **Certified Stocker** certificate and badge.

You'll see your score and the right answers when you finish. If you don't pass, you can take it again.$c$, false, null, $c$/course-media/choosing-your-first-fish/00-course-cover.png$c$, 6)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where can you find a fish's adult size and minimum tank size on Underground Aquarium?$q$, $j$["The events page", "The Species Library", "The classifieds"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where can you find a fish's adult size and minimum tank size on Underground Aquarium?$q$, array(select jsonb_array_elements_text($j$["The events page", "The Species Library", "The classifieds"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these fish grows far too big for a 20-gallon tank?$q$, $j$["Bala shark", "Panda cory", "Harlequin rasbora", "Neon tetra"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these fish grows far too big for a 20-gallon tank?$q$, array(select jsonb_array_elements_text($j$["Bala shark", "Panda cory", "Harlequin rasbora", "Neon tetra"]$j$::jsonb)), 0, 1);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$An iridescent shark can grow to about:$q$, $j$["1 foot", "3 inches", "More than 3 feet"]$j$::jsonb, 2, 2);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$An iridescent shark can grow to about:$q$, array(select jsonb_array_elements_text($j$["1 foot", "3 inches", "More than 3 feet"]$j$::jsonb)), 2, 2);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish is a good example of a peaceful community fish?$q$, $j$["Tiger barb", "Oscar", "Neon tetra"]$j$::jsonb, 2, 3);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish is a good example of a peaceful community fish?$q$, array(select jsonb_array_elements_text($j$["Tiger barb", "Oscar", "Neon tetra"]$j$::jsonb)), 2, 3);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might an angelfish be a problem with neon tetras?$q$, $j$["Neon tetras nip angelfish", "A grown angelfish can eat neon tetras", "Angelfish need cold water"]$j$::jsonb, 1, 4);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might an angelfish be a problem with neon tetras?$q$, array(select jsonb_array_elements_text($j$["Neon tetras nip angelfish", "A grown angelfish can eat neon tetras", "Angelfish need cold water"]$j$::jsonb)), 1, 4);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish should NOT be kept with bettas?$q$, $j$["Nerite snails", "Tiger barbs", "Corydoras"]$j$::jsonb, 1, 5);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish should NOT be kept with bettas?$q$, array(select jsonb_array_elements_text($j$["Nerite snails", "Tiger barbs", "Corydoras"]$j$::jsonb)), 1, 5);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What happens when schooling fish are kept alone?$q$, $j$["Nothing changes", "They grow faster", "They get stressed, hide, and lose color"]$j$::jsonb, 2, 6);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What happens when schooling fish are kept alone?$q$, array(select jsonb_array_elements_text($j$["Nothing changes", "They grow faster", "They get stressed, hide, and lose color"]$j$::jsonb)), 2, 6);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How many male bettas should be kept in one tank?$q$, $j$["As many as fit", "Two", "One"]$j$::jsonb, 2, 7);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How many male bettas should be kept in one tank?$q$, array(select jsonb_array_elements_text($j$["As many as fit", "Two", "One"]$j$::jsonb)), 2, 7);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Tropical fish usually want water around:$q$, $j$["74 to 80\u00b0F", "60 to 65\u00b0F", "85 to 90\u00b0F"]$j$::jsonb, 0, 8);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Tropical fish usually want water around:$q$, array(select jsonb_array_elements_text($j$["74 to 80\u00b0F", "60 to 65\u00b0F", "85 to 90\u00b0F"]$j$::jsonb)), 0, 8);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why shouldn't goldfish share a tank with tropical fish?$q$, $j$["Goldfish need salt water", "They like different temperatures", "Goldfish are too small"]$j$::jsonb, 1, 9);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why shouldn't goldfish share a tank with tropical fish?$q$, array(select jsonb_array_elements_text($j$["Goldfish need salt water", "They like different temperatures", "Goldfish are too small"]$j$::jsonb)), 1, 9);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish needs hard water with a high pH?$q$, $j$["Neon tetras", "Corydoras", "African cichlids"]$j$::jsonb, 2, 10);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fish needs hard water with a high pH?$q$, array(select jsonb_array_elements_text($j$["Neon tetras", "Corydoras", "African cichlids"]$j$::jsonb)), 2, 10);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$The "one inch of fish per gallon" rule is:$q$, $j$["Always exact", "A rough guess at best", "Only for saltwater tanks"]$j$::jsonb, 1, 11);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$The "one inch of fish per gallon" rule is:$q$, array(select jsonb_array_elements_text($j$["Always exact", "A rough guess at best", "Only for saltwater tanks"]$j$::jsonb)), 1, 11);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why does one 10-inch fish make more waste than ten 1-inch fish?$q$, $j$["Small fish don't make waste", "It is much bigger around and eats much more", "It doesn't, they're the same"]$j$::jsonb, 1, 12);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why does one 10-inch fish make more waste than ten 1-inch fish?$q$, array(select jsonb_array_elements_text($j$["Small fish don't make waste", "It is much bigger around and eats much more", "It doesn't, they're the same"]$j$::jsonb)), 1, 12);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these raises bioload?$q$, $j$["Water changes", "Live plants", "Overfeeding"]$j$::jsonb, 2, 13);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these raises bioload?$q$, array(select jsonb_array_elements_text($j$["Water changes", "Live plants", "Overfeeding"]$j$::jsonb)), 2, 13);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these helps your tank handle more waste?$q$, $j$["A filter rated for your tank size or bigger", "Turning off the filter at night", "Feeding twice as much"]$j$::jsonb, 0, 14);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these helps your tank handle more waste?$q$, array(select jsonb_array_elements_text($j$["A filter rated for your tank size or bigger", "Turning off the filter at night", "Feeding twice as much"]$j$::jsonb)), 0, 14);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What tool warns you before your tank gets too crowded?$q$, $j$["The glossary", "Tank Builder", "Water Check"]$j$::jsonb, 1, 15);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What tool warns you before your tank gets too crowded?$q$, array(select jsonb_array_elements_text($j$["The glossary", "Tank Builder", "Water Check"]$j$::jsonb)), 1, 15);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$In a community tank, what is a schooling group?$q$, $j$["One big fish", "Snails on the glass", "6 or more small fish that swim together"]$j$::jsonb, 2, 16);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$In a community tank, what is a schooling group?$q$, array(select jsonb_array_elements_text($j$["One big fish", "Snails on the glass", "6 or more small fish that swim together"]$j$::jsonb)), 2, 16);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which is a good cleanup helper for algae in a community tank?$q$, $j$["Nerite snail", "Goldfish", "Oscar"]$j$::jsonb, 0, 17);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which is a good cleanup helper for algae in a community tank?$q$, array(select jsonb_array_elements_text($j$["Nerite snail", "Goldfish", "Oscar"]$j$::jsonb)), 0, 17);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you look up before buying any fish?$q$, $j$["Only its color", "Its adult size, temperament, and water needs", "Only its price"]$j$::jsonb, 1, 18);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you look up before buying any fish?$q$, array(select jsonb_array_elements_text($j$["Only its color", "Its adult size, temperament, and water needs", "Only its price"]$j$::jsonb)), 1, 18);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When stocking a new community tank, which fish should go in first?$q$, $j$["The hardiest ones, in small groups", "The most delicate ones", "All of them at once"]$j$::jsonb, 0, 19);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When stocking a new community tank, which fish should go in first?$q$, array(select jsonb_array_elements_text($j$["The hardiest ones, in small groups", "The most delicate ones", "All of them at once"]$j$::jsonb)), 0, 19);
    end if;

    raise notice 'Choosing Your First Fish created';
  else
    raise notice 'Choosing Your First Fish already exists, skipped';
  end if;

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

  -- ==================== Buying Healthy Fish ====================
  if not exists (select 1 from public.courses where slug = $c$buying-healthy-fish$c$) then
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.courses;
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order)
    values ($c$buying-healthy-fish$c$, $c$Buying Healthy Fish$c$, $c$Bring home fish that thrive, not problems$c$, $c$Learn how to spot a healthy fish and a good store, what to ask before you buy, how to get fish home safely, and how a simple quarantine keeps your whole tank healthy.$c$, 30, $c$Smart Buyer$c$, $c$/course-media/buying-healthy-fish/00-course-cover.png$c$, true, next_sort)
    returning id into cid;

    -- 1. Spotting a healthy fish
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Spotting a healthy fish$c$, $c$A healthy fish at the store is much more likely to stay healthy at home. Take a few minutes to really look before you buy.

**Look at the fish:**

- **Eyes:** clear, not cloudy or bulging
- **Fins:** open and whole, not torn, ragged, or clamped
- **Body:** smooth, no white spots, fuzz, sores, or red streaks
- **Belly:** not sunken in, and not swollen
- **Breathing:** calm and steady, not gasping
- **Behavior:** active and alert, swimming normally

**Look at the whole tank, too.** Fish in the same tank share the same water. If you see any of these, skip that tank for now:

- Dead or dying fish
- Fish with white spots or fuzz
- Several fish hiding with clamped fins

**Ask to see them eat.** A fish that eats eagerly is usually in good shape. A fish that won't eat at all may be sick or stressed.

**Be patient.** If the fish you want don't look their best today, it's fine to come back next week.$c$, false, null, $c$/course-media/buying-healthy-fish/01-healthy.png$c$, 0)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these is a sign of a healthy fish?$q$, $j$["Clear eyes and open fins", "Clamped fins", "Gasping at the surface"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these is a sign of a healthy fish?$q$, array(select jsonb_array_elements_text($j$["Clear eyes and open fins", "Clamped fins", "Gasping at the surface"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$You see a dead fish in the tank you're buying from. What should you do?$q$, $j$["Skip that tank for now", "Buy extra fish", "Buy the fish anyway"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$You see a dead fish in the tank you're buying from. What should you do?$q$, array(select jsonb_array_elements_text($j$["Skip that tank for now", "Buy extra fish", "Buy the fish anyway"]$j$::jsonb)), 0, 1);
    end if;

    -- 2. Finding a good fish store
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Finding a good fish store$c$, $c$A good local fish store can be your best friend in the hobby. A poor one can cost you a lot of fish.

**Signs of a good store:**

- Tanks are clean, and dead fish are removed quickly.
- Staff know the fish and ask about **your** tank before selling to you.
- They'll tell you **no** if a fish isn't right for your setup.
- Fish are labeled with names, and often with adult size.
- They test water for customers or give good advice.
- Many good stores keep new fish for a while before selling them, so problems show up in their tanks, not yours.

**Warning signs:**

- Many dead fish or cloudy, dirty tanks
- Staff who just say "yes" to everything
- Sick fish sold right next to healthy ones

**Independent stores vs. big chains:** independent stores are often run by experienced hobbyists and carry more variety. But every store is different. Judge the store by what you see.

**Find stores near you** in Shops Near Me, and read reviews from other hobbyists. Leave a review of your own after you visit.$c$, false, null, $c$/course-media/buying-healthy-fish/02-store.png$c$, 1)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is a good sign at a fish store?$q$, $j$["Lots of cloudy tanks", "They say yes to everything", "Staff ask about your tank before selling"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is a good sign at a fish store?$q$, array(select jsonb_array_elements_text($j$["Lots of cloudy tanks", "They say yes to everything", "Staff ask about your tank before selling"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where on Underground Aquarium can you find and review local fish stores?$q$, $j$["Water Check", "The glossary", "Shops Near Me"]$j$::jsonb, 2, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where on Underground Aquarium can you find and review local fish stores?$q$, array(select jsonb_array_elements_text($j$["Water Check", "The glossary", "Shops Near Me"]$j$::jsonb)), 2, 1);
    end if;

    -- 3. Questions to ask before you buy
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Questions to ask before you buy$c$, $c$Good stores are happy to answer questions. Here are the ones that matter most:

1. **How long have you had these fish?** Fish that just arrived are often stressed. Fish that have been at the store a week or more have settled in.
2. **Are they eating? What do you feed them?** It helps to start with the same food at home.
3. **How big do they get as adults?** Compare this to your tank.
4. **Are they captive bred or wild caught?** Captive-bred fish are usually hardier and more used to aquarium water.
5. **Will they get along with my fish?** Tell them exactly what you keep.
6. **Can you hold them for me?** Many stores will hold fish for a few days or a week if you pay first. This gives them time to settle and gives you time to get ready.

**Bring your own info:**

- Your tank size
- The fish you already have
- Your latest water test results

This helps the store give you real advice instead of a guess.

**If a store won't answer basic questions, that tells you something too.**$c$, false, null, $c$/course-media/buying-healthy-fish/03-questions.png$c$, 2)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why ask how long a store has had a fish?$q$, $j$["Fish that just arrived are often stressed", "It doesn't matter", "It changes the price"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why ask how long a store has had a fish?$q$, array(select jsonb_array_elements_text($j$["Fish that just arrived are often stressed", "It doesn't matter", "It changes the price"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Captive-bred fish are usually:$q$, $j$["Always sick", "Hardier and used to aquarium water", "Bigger than wild fish"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Captive-bred fish are usually:$q$, array(select jsonb_array_elements_text($j$["Always sick", "Hardier and used to aquarium water", "Bigger than wild fish"]$j$::jsonb)), 1, 1);
    end if;

    -- 4. Getting your fish home safely
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Getting your fish home safely$c$, $c$The trip home is stressful for fish. A few simple steps make it much easier on them.

**Make the fish store your last stop.** Go straight home. Fish in a bag have limited oxygen, and the bag cools down quickly.

**Keep the bag dark and steady:**

- Put the bag in a paper bag or box. Darkness keeps fish calmer.
- In cold weather, use a small cooler to keep the bag warm.
- In hot weather, keep the bag out of a hot car and direct sun.

**At home, acclimate gently:**

1. Turn off your tank light.
2. Float the closed bag in your tank for about 15 minutes so the temperatures match.
3. Add a little tank water to the bag every few minutes for 20 to 30 minutes.
4. Net the fish into the tank. **Don't pour store water into your tank.** It can carry disease.

**For shrimp and sensitive fish, use a drip.** A slow drip of tank water into a container over an hour or more is gentler than the bag method.

**Leave the lights off** for the rest of the day and skip feeding the new fish until tomorrow. This helps them settle in.$c$, false, null, $c$/course-media/buying-healthy-fish/04-trip.png$c$, 3)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why keep the fish bag in a dark box or paper bag?$q$, $j$["It makes the water colder", "Darkness keeps fish calmer", "It adds oxygen"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why keep the fish bag in a dark box or paper bag?$q$, array(select jsonb_array_elements_text($j$["It makes the water colder", "Darkness keeps fish calmer", "It adds oxygen"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do with the store water?$q$, $j$["Leave it behind and net the fish in", "Drink it", "Pour it in your tank"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do with the store water?$q$, array(select jsonb_array_elements_text($j$["Leave it behind and net the fish in", "Drink it", "Pour it in your tank"]$j$::jsonb)), 0, 1);
    end if;

    -- 5. Quarantine: the step most people skip
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Quarantine: the step most people skip$c$, $c$**Quarantine** means keeping new fish in a separate tank for a while before adding them to your main tank. It's the single best way to keep disease out.

**Why it matters:** even healthy-looking fish can carry parasites or bacteria. One sick new fish can spread disease to every fish you own. A few weeks in quarantine lets any problem show up where it's easy to treat.

**How to quarantine:**

1. Set up a small tank with a heater and a **sponge filter** that's been running in your main tank, so it already has good bacteria.
2. Put new fish in the quarantine tank instead of your main tank.
3. Watch them closely for **2 to 4 weeks**. Look for spots, fuzz, clamped fins, and whether they eat.
4. Treat any problems right there.
5. Once they've looked healthy for a couple of weeks, move them to your main tank.

**Plants can bring in hitchhikers too.** Snails, snail eggs, and pests often ride in on new plants. Rinse new plants well and look them over, or keep them in a separate container for a while.

**Don't have room for a quarantine tank?** The same small tank can double as your hospital tank from Fish Health 101.$c$, false, null, $c$/course-media/buying-healthy-fish/05-quarantine.png$c$, 4)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How long should new fish usually stay in quarantine?$q$, $j$["2 to 4 weeks", "6 months", "1 hour"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$How long should new fish usually stay in quarantine?$q$, array(select jsonb_array_elements_text($j$["2 to 4 weeks", "6 months", "1 hour"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What else can bring pests like snails into your tank?$q$, $j$["New plants", "A thermometer", "Fish food"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What else can bring pests like snails into your tank?$q$, array(select jsonb_array_elements_text($j$["New plants", "A thermometer", "Fish food"]$j$::jsonb)), 0, 1);
    end if;

    -- 6. Buying from other hobbyists
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Buying from other hobbyists$c$, $c$Some of the best fish you'll ever buy come from other hobbyists in your area. Many local breeders raise fish that are healthy, well fed, and already used to local tap water.

**Why buy local:**

- Fish are often raised in water like yours, so they adjust easily.
- You can see the tank they came from.
- Breeders usually know their fish well and love to share tips.
- Short trips mean less stress.

**Before you go:**

- Ask what water their fish live in: temperature, pH, and hardness.
- Ask what the fish eat.
- Bring a bucket with a lid or a small cooler, plus bags if they don't have them.

**When you pick up:**

- Look at the fish the same way you would at a store: clear eyes, whole fins, active, eating.
- Look at the seller's tank. Clean, healthy tanks are a good sign.
- Meet in a safe, public place if you're not going to their home.

**Still quarantine.** Even fish from a great breeder should go through quarantine first.

**Find local fish** in our free classifieds, and post your own extras when your fish start breeding.$c$, false, null, $c$/course-media/buying-healthy-fish/06-local.png$c$, 5)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why are fish from local hobbyists often a good choice?$q$, $j$["They never get sick", "They're often raised in water like yours", "They are always free"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why are fish from local hobbyists often a good choice?$q$, array(select jsonb_array_elements_text($j$["They never get sick", "They're often raised in water like yours", "They are always free"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Should fish from a great local breeder still be quarantined?$q$, $j$["Yes", "No"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Should fish from a great local breeder still be quarantined?$q$, array(select jsonb_array_elements_text($j$["Yes", "No"]$j$::jsonb)), 0, 1);
    end if;

    -- Final exam
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, 'Final exam', $c$Twenty questions covering the whole course. Score 80% or better (16 of 20) to pass and earn your **Smart Buyer** certificate and badge.

You'll see your score and the right answers when you finish. If you don't pass, you can take it again.$c$, false, null, $c$/course-media/buying-healthy-fish/00-course-cover.png$c$, 6)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these is a warning sign on a fish at the store?$q$, $j$["Eating eagerly", "Clear eyes", "White spots on the body"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which of these is a warning sign on a fish at the store?$q$, array(select jsonb_array_elements_text($j$["Eating eagerly", "Clear eyes", "White spots on the body"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why does it matter if other fish in the same store tank look sick?$q$, $j$["It doesn't matter", "They all share the same water", "Sick fish are cheaper"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why does it matter if other fish in the same store tank look sick?$q$, array(select jsonb_array_elements_text($j$["It doesn't matter", "They all share the same water", "Sick fish are cheaper"]$j$::jsonb)), 1, 1);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should a healthy fish's belly look like?$q$, $j$["Very thin and sunken", "Very swollen", "Not sunken in and not swollen"]$j$::jsonb, 2, 2);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should a healthy fish's belly look like?$q$, array(select jsonb_array_elements_text($j$["Very thin and sunken", "Very swollen", "Not sunken in and not swollen"]$j$::jsonb)), 2, 2);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why ask to see the fish eat?$q$, $j$["A fish that eats eagerly is usually in good shape", "Fish don't eat at stores", "To check the store's food price"]$j$::jsonb, 0, 3);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why ask to see the fish eat?$q$, array(select jsonb_array_elements_text($j$["A fish that eats eagerly is usually in good shape", "Fish don't eat at stores", "To check the store's food price"]$j$::jsonb)), 0, 3);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which is a sign of a good fish store?$q$, $j$["No labels on tanks", "Dead fish left in tanks", "They'll say no if a fish isn't right for your tank"]$j$::jsonb, 2, 4);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which is a sign of a good fish store?$q$, array(select jsonb_array_elements_text($j$["No labels on tanks", "Dead fish left in tanks", "They'll say no if a fish isn't right for your tank"]$j$::jsonb)), 2, 4);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do many good stores hold new fish before selling them?$q$, $j$["So problems show up in their tanks, not yours", "To raise the price", "To make them grow"]$j$::jsonb, 0, 5);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do many good stores hold new fish before selling them?$q$, array(select jsonb_array_elements_text($j$["So problems show up in their tanks, not yours", "To raise the price", "To make them grow"]$j$::jsonb)), 0, 5);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you bring when shopping for fish?$q$, $j$["Nothing", "Only cash", "Your tank size, current fish, and water test results"]$j$::jsonb, 2, 6);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you bring when shopping for fish?$q$, array(select jsonb_array_elements_text($j$["Nothing", "Only cash", "Your tank size, current fish, and water test results"]$j$::jsonb)), 2, 6);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which question helps you compare a fish to your tank size?$q$, $j$["What's their name?", "How big do they get as adults?", "What color are they?"]$j$::jsonb, 1, 7);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which question helps you compare a fish to your tank size?$q$, array(select jsonb_array_elements_text($j$["What's their name?", "How big do they get as adults?", "What color are they?"]$j$::jsonb)), 1, 7);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might you ask a store to hold fish for you?$q$, $j$["Fish grow faster at stores", "It gives the fish time to settle and you time to get ready", "It's required by law"]$j$::jsonb, 1, 8);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might you ask a store to hold fish for you?$q$, array(select jsonb_array_elements_text($j$["Fish grow faster at stores", "It gives the fish time to settle and you time to get ready", "It's required by law"]$j$::jsonb)), 1, 8);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When buying fish, the fish store should be your:$q$, $j$["Last stop before going home", "It doesn't matter", "First stop of the day"]$j$::jsonb, 0, 9);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When buying fish, the fish store should be your:$q$, array(select jsonb_array_elements_text($j$["Last stop before going home", "It doesn't matter", "First stop of the day"]$j$::jsonb)), 0, 9);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$In cold weather, what helps keep the fish bag warm?$q$, $j$["An open car window", "A small cooler", "Ice"]$j$::jsonb, 1, 10);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$In cold weather, what helps keep the fish bag warm?$q$, array(select jsonb_array_elements_text($j$["An open car window", "A small cooler", "Ice"]$j$::jsonb)), 1, 10);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$About how long should you float the closed bag in your tank?$q$, $j$["1 minute", "About 2 hours", "About 15 minutes"]$j$::jsonb, 2, 11);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$About how long should you float the closed bag in your tank?$q$, array(select jsonb_array_elements_text($j$["1 minute", "About 2 hours", "About 15 minutes"]$j$::jsonb)), 2, 11);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why shouldn't you pour store water into your tank?$q$, $j$["It has too much oxygen", "It is too warm", "It can carry disease"]$j$::jsonb, 2, 12);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why shouldn't you pour store water into your tank?$q$, array(select jsonb_array_elements_text($j$["It has too much oxygen", "It is too warm", "It can carry disease"]$j$::jsonb)), 2, 12);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which method is gentler for shrimp and sensitive fish?$q$, $j$["A slow drip of tank water", "Floating for 1 minute", "Dumping them in"]$j$::jsonb, 0, 13);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which method is gentler for shrimp and sensitive fish?$q$, array(select jsonb_array_elements_text($j$["A slow drip of tank water", "Floating for 1 minute", "Dumping them in"]$j$::jsonb)), 0, 13);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does quarantine mean?$q$, $j$["Turning off the filter", "Feeding fish less", "Keeping new fish in a separate tank for a while"]$j$::jsonb, 2, 14);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What does quarantine mean?$q$, array(select jsonb_array_elements_text($j$["Turning off the filter", "Feeding fish less", "Keeping new fish in a separate tank for a while"]$j$::jsonb)), 2, 14);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why can healthy-looking fish still be risky?$q$, $j$["They can carry parasites or bacteria", "They eat too much", "They change color"]$j$::jsonb, 0, 15);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why can healthy-looking fish still be risky?$q$, array(select jsonb_array_elements_text($j$["They can carry parasites or bacteria", "They eat too much", "They change color"]$j$::jsonb)), 0, 15);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What filter should a quarantine tank use?$q$, $j$["A sponge filter already full of good bacteria", "A brand-new dry filter", "No filter"]$j$::jsonb, 0, 16);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What filter should a quarantine tank use?$q$, array(select jsonb_array_elements_text($j$["A sponge filter already full of good bacteria", "A brand-new dry filter", "No filter"]$j$::jsonb)), 0, 16);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do with new plants?$q$, $j$["Add them straight in without looking", "Boil them", "Rinse and check them for snails and pests"]$j$::jsonb, 2, 17);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do with new plants?$q$, array(select jsonb_array_elements_text($j$["Add them straight in without looking", "Boil them", "Rinse and check them for snails and pests"]$j$::jsonb)), 2, 17);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why are local hobbyist fish often easier to keep?$q$, $j$["They don't need quarantine", "They're often used to similar local water", "They never need food"]$j$::jsonb, 1, 18);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why are local hobbyist fish often easier to keep?$q$, array(select jsonb_array_elements_text($j$["They don't need quarantine", "They're often used to similar local water", "They never need food"]$j$::jsonb)), 1, 18);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where can you find fish from local hobbyists on Underground Aquarium?$q$, $j$["Water Check", "The classifieds", "The glossary"]$j$::jsonb, 1, 19);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where can you find fish from local hobbyists on Underground Aquarium?$q$, array(select jsonb_array_elements_text($j$["Water Check", "The classifieds", "The glossary"]$j$::jsonb)), 1, 19);
    end if;

    raise notice 'Buying Healthy Fish created';
  else
    raise notice 'Buying Healthy Fish already exists, skipped';
  end if;

  -- ==================== Live Plants for Beginners ====================
  if not exists (select 1 from public.courses where slug = $c$live-plants-for-beginners$c$) then
    select coalesce(max(sort_order), 0) + 1 into next_sort from public.courses;
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order)
    values ($c$live-plants-for-beginners$c$, $c$Live Plants for Beginners$c$, $c$Easy plants, simple care, less algae$c$, $c$Grow a healthy planted tank without special gear. Learn which plants are easy, how much light they need, how to feed them, and how to keep algae under control.$c$, 30, $c$Green Thumb$c$, $c$/course-media/live-plants-for-beginners/00-course-cover.png$c$, true, next_sort)
    returning id into cid;

    -- 1. Why live plants help
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Why live plants help$c$, $c$Live plants aren't just pretty. They actually help keep your tank healthy.

**What plants do for your tank:**

- **Use up waste.** Plants take in ammonia and nitrate as food. That means cleaner water between water changes.
- **Fight algae.** Plants and algae want the same food. Healthy plants leave less for algae.
- **Add oxygen.** During the day, plants make oxygen with light. (At night, they use a little oxygen, like fish do.)
- **Give fish cover.** Shy fish feel safer with plants to hide in, so they come out more.
- **Feed some fish and shrimp.** Many fish and shrimp graze on the tiny life that grows on plant leaves.

**Do I need special gear?** No. Many great plants grow fine with a normal aquarium light and no extra equipment. This course sticks to those easy plants.

**Start small.** A few easy plants are better than a lot of hard ones. As you get comfortable, you can add more.$c$, false, null, $c$/course-media/live-plants-for-beginners/01-why.png$c$, 0)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What do live plants use as food?$q$, $j$["Gravel", "Fish flakes only", "Ammonia and nitrate"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What do live plants use as food?$q$, array(select jsonb_array_elements_text($j$["Gravel", "Fish flakes only", "Ammonia and nitrate"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do healthy plants help fight algae?$q$, $j$["They make the water cold", "They scare algae away", "They use the same food algae needs"]$j$::jsonb, 2, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do healthy plants help fight algae?$q$, array(select jsonb_array_elements_text($j$["They make the water cold", "They scare algae away", "They use the same food algae needs"]$j$::jsonb)), 2, 1);
    end if;

    -- 2. Easy plants to start with
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Easy plants to start with$c$, $c$These plants are hardy, grow in most tanks, and don't need special lights or equipment.

**Plants you attach (don't bury these):**

- **Java fern** and **anubias** grow from a thick stem called a **rhizome**. If you bury the rhizome, it can rot. Tie or glue them to rocks or driftwood instead. Most fish leave them alone.

**Plants you plant in the substrate:**

- **Cryptocoryne ("crypts"):** come in many colors and sizes. They often "melt" (lose leaves) after you plant them. Don't panic, they usually grow back from the roots.
- **Amazon sword:** a big background plant that feeds mostly through its roots.
- **Vallisneria:** tall, grass-like leaves that spread by sending out runners.

**Easy extras:**

- **Java moss:** attaches to almost anything and is great cover for baby fish and shrimp.
- **Floating plants** like frogbit and salvinia: grow fast and soak up lots of nitrate. Don't let them cover the whole surface, or plants below won't get light.
- **Hornwort:** grows quickly, either floating or planted.

**Buying tip:** many plants are grown above water at the farm. They may drop some leaves as they switch to underwater leaves. That's normal.$c$, false, null, $c$/course-media/live-plants-for-beginners/02-easy.png$c$, 1)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you NOT do with java fern and anubias?$q$, $j$["Glue them to rocks", "Tie them to wood", "Bury the rhizome"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you NOT do with java fern and anubias?$q$, array(select jsonb_array_elements_text($j$["Glue them to rocks", "Tie them to wood", "Bury the rhizome"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is "crypt melt"?$q$, $j$["A disease that kills all plants", "Crypts losing leaves after planting, then regrowing", "A kind of fertilizer"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is "crypt melt"?$q$, array(select jsonb_array_elements_text($j$["A disease that kills all plants", "Crypts losing leaves after planting, then regrowing", "A kind of fertilizer"]$j$::jsonb)), 1, 1);
    end if;

    -- 3. Light: how much and how long
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Light: how much and how long$c$, $c$Plants use light to make food. Too little light and they slowly fade. Too much light and you grow algae.

**How long to leave the light on:**

- Most planted tanks do well with about **6 to 8 hours** of light a day.
- Use a **timer** so it's the same every day. Plants and fish both like a steady schedule.

**Low-light vs. high-light tanks:**

- **Low-light tanks** use a normal aquarium light. Java fern, anubias, crypts, java moss, and floating plants all grow well here.
- **High-light tanks** use stronger lights. They grow plants faster but usually need added CO2 and more fertilizer to keep algae away. Save this for later.

**The balance rule:** more light means plants need more food. If you add a lot of light without more nutrients, algae takes over.

**Watch for these signs:**

- **Plants getting tall, thin, and pale:** probably not enough light.
- **Algae growing quickly:** probably too much light, or the light is on too long. Try cutting back an hour or two.

**Keep the tank out of direct sunlight.** Sunlight is hard to control and often causes algae blooms.$c$, false, null, $c$/course-media/live-plants-for-beginners/03-light.png$c$, 2)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$About how many hours of light do most planted tanks need?$q$, $j$["6 to 8 hours", "24 hours", "2 hours"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$About how many hours of light do most planted tanks need?$q$, array(select jsonb_array_elements_text($j$["6 to 8 hours", "24 hours", "2 hours"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Plants getting tall, thin, and pale usually means:$q$, $j$["Not enough light", "Too much light", "Too many fish"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Plants getting tall, thin, and pale usually means:$q$, array(select jsonb_array_elements_text($j$["Not enough light", "Too much light", "Too many fish"]$j$::jsonb)), 0, 1);
    end if;

    -- 4. Substrate and roots
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Substrate and roots$c$, $c$Some plants feed mostly through their roots. Others feed mostly through their leaves. Knowing which is which makes plant care much easier.

**Root feeders:**

- Amazon swords
- Cryptocorynes
- Vallisneria

These grow best when there are nutrients down in the substrate.

**Leaf feeders (water column feeders):**

- Java fern and anubias
- Java moss
- Floating plants and hornwort

These pull their food from the water and don't need nutrients in the gravel at all.

**Your substrate options:**

- **Plain gravel or sand:** works fine. Add **root tabs** (small fertilizer capsules) near root-feeding plants every few months.
- **Plant substrate:** special soil-like substrate that has nutrients built in. Great for planted tanks, but it often needs root tabs added after a year or so.

**Planting tips:**

- Push the roots down gently, but keep the crown (where leaves meet roots) just above the substrate.
- Keep gravel vacuuming light around plant roots so you don't pull them up.$c$, false, null, $c$/course-media/live-plants-for-beginners/04-roots.png$c$, 3)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which plant feeds mostly through its roots?$q$, $j$["Amazon sword", "Frogbit", "Java moss"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which plant feeds mostly through its roots?$q$, array(select jsonb_array_elements_text($j$["Amazon sword", "Frogbit", "Java moss"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What are root tabs?$q$, $j$["Plant clips", "A type of fish food", "Fertilizer capsules pushed into the substrate"]$j$::jsonb, 2, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What are root tabs?$q$, array(select jsonb_array_elements_text($j$["Plant clips", "A type of fish food", "Fertilizer capsules pushed into the substrate"]$j$::jsonb)), 2, 1);
    end if;

    -- 5. Feeding your plants
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Feeding your plants$c$, $c$Plants need food just like fish. Fish waste gives them some, but most planted tanks grow better with a little fertilizer.

**Two kinds of fertilizer:**

- **Liquid fertilizer:** you add it to the water. It feeds leaf feeders and floating plants. An "all-in-one" liquid is the easiest place to start.
- **Root tabs:** small capsules you push into the substrate near root feeders like swords and crypts.

**Follow the label, and start small.** Too much fertilizer can feed algae. It's easier to add a bit more later than to fix an algae outbreak.

**What about CO2?** Plants use carbon dioxide (CO2) to grow. Fish breathe it out, so there's always some in the water. Easy, low-light plants grow fine **without** added CO2. You only need extra CO2 for fast-growing plants under strong lights.

**Signs a plant is hungry:**

- **Yellow leaves,** especially older ones
- **Small holes** in leaves
- **Very slow growth**

**Trim dead leaves.** Brown or rotting leaves don't come back. Pinch or cut them off so they don't break down in the tank and add waste.$c$, false, null, $c$/course-media/live-plants-for-beginners/05-feeding.png$c$, 4)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Do easy, low-light plants need added CO2?$q$, $j$["No", "Yes, always"]$j$::jsonb, 0, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Do easy, low-light plants need added CO2?$q$, array(select jsonb_array_elements_text($j$["No", "Yes, always"]$j$::jsonb)), 0, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Yellow older leaves often mean a plant is:$q$, $j$["Hungry for nutrients", "Perfectly healthy", "Getting too much CO2"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Yellow older leaves often mean a plant is:$q$, array(select jsonb_array_elements_text($j$["Hungry for nutrients", "Perfectly healthy", "Getting too much CO2"]$j$::jsonb)), 0, 1);
    end if;

    -- 6. Keeping algae under control
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, $c$Keeping algae under control$c$, $c$Every tank has a little algae. That's normal and even healthy. Problems start when there's more light and food than your plants can use.

**Common types of algae:**

- **Brown algae (diatoms):** brown dust on glass and decor. Very common in new tanks. It usually fades on its own after the first month or two.
- **Green spot algae:** small, hard green dots on glass and slow-growing leaves. Often linked to too much light, or too little of a plant nutrient called phosphate.
- **Hair algae:** long green threads. Usually too much light or extra nutrients.
- **Black beard algae:** dark, fuzzy tufts on edges of leaves and decor. Often tied to unsteady CO2 and older tanks.

**How to keep algae down:**

1. Keep the light on 6 to 8 hours with a timer.
2. Don't overfeed fish or overdose fertilizer.
3. Keep up with water changes.
4. Add more fast-growing plants, like floating plants, to use up extra nutrients.
5. Scrub glass and remove algae by hand when you see it.

**A cleanup crew helps:**

- **Nerite snails** eat many algae types, including green spot. They lay small white eggs that won't hatch in fresh water.
- **Amano shrimp** are great at eating hair algae.
- **Otocinclus** (small catfish) eat brown diatoms. Keep them in groups, and add them only after your tank has been running for a few months.

**Don't overreact.** Change one thing at a time and give it a week or two before changing something else.$c$, false, null, $c$/course-media/live-plants-for-beginners/06-algae.png$c$, 5)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Brown dusty algae in a brand-new tank is usually:$q$, $j$["A sign of disease", "Black beard algae", "Diatoms that fade on their own"]$j$::jsonb, 2, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Brown dusty algae in a brand-new tank is usually:$q$, array(select jsonb_array_elements_text($j$["A sign of disease", "Black beard algae", "Diatoms that fade on their own"]$j$::jsonb)), 2, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which animal is great at eating hair algae?$q$, $j$["Goldfish", "Amano shrimp", "Betta"]$j$::jsonb, 1, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which animal is great at eating hair algae?$q$, array(select jsonb_array_elements_text($j$["Goldfish", "Amano shrimp", "Betta"]$j$::jsonb)), 1, 1);
    end if;

    -- Final exam
    insert into public.course_sections (course_id, title, content, has_video, video_url, image_url, sort_order)
    values (cid, 'Final exam', $c$Twenty questions covering the whole course. Score 80% or better (16 of 20) to pass and earn your **Green Thumb** certificate and badge.

You'll see your score and the right answers when you finish. If you don't pass, you can take it again.$c$, false, null, $c$/course-media/live-plants-for-beginners/00-course-cover.png$c$, 6)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What do plants make during the day using light?$q$, $j$["Ammonia", "Oxygen", "Nitrite"]$j$::jsonb, 1, 0);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What do plants make during the day using light?$q$, array(select jsonb_array_elements_text($j$["Ammonia", "Oxygen", "Nitrite"]$j$::jsonb)), 1, 0);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do shy fish come out more in a planted tank?$q$, $j$["They feel safer with places to hide", "Plants feed them flakes", "Plants warm the water"]$j$::jsonb, 0, 1);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why do shy fish come out more in a planted tank?$q$, array(select jsonb_array_elements_text($j$["They feel safer with places to hide", "Plants feed them flakes", "Plants warm the water"]$j$::jsonb)), 0, 1);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Do you need special equipment to grow easy plants?$q$, $j$["No, a normal aquarium light works", "Yes, always"]$j$::jsonb, 0, 2);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Do you need special equipment to grow easy plants?$q$, array(select jsonb_array_elements_text($j$["No, a normal aquarium light works", "Yes, always"]$j$::jsonb)), 0, 2);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is a rhizome?$q$, $j$["A thick stem that java fern and anubias grow from", "A fish disease", "A type of algae"]$j$::jsonb, 0, 3);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What is a rhizome?$q$, array(select jsonb_array_elements_text($j$["A thick stem that java fern and anubias grow from", "A fish disease", "A type of algae"]$j$::jsonb)), 0, 3);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where should you attach java fern?$q$, $j$["To rocks or driftwood", "Buried deep in gravel", "Floating only"]$j$::jsonb, 0, 4);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Where should you attach java fern?$q$, array(select jsonb_array_elements_text($j$["To rocks or driftwood", "Buried deep in gravel", "Floating only"]$j$::jsonb)), 0, 4);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which plant is good cover for baby fish and shrimp?$q$, $j$["None of them", "Amazon sword", "Java moss"]$j$::jsonb, 2, 5);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which plant is good cover for baby fish and shrimp?$q$, array(select jsonb_array_elements_text($j$["None of them", "Amazon sword", "Java moss"]$j$::jsonb)), 2, 5);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can happen if floating plants cover the whole surface?$q$, $j$["Nothing", "Plants below don't get enough light", "Fish grow too fast"]$j$::jsonb, 1, 6);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What can happen if floating plants cover the whole surface?$q$, array(select jsonb_array_elements_text($j$["Nothing", "Plants below don't get enough light", "Fish grow too fast"]$j$::jsonb)), 1, 6);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might new plants drop leaves after you buy them?$q$, $j$["Many were grown above water and are switching to underwater leaves", "They are always dying", "The fish are eating them"]$j$::jsonb, 0, 7);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why might new plants drop leaves after you buy them?$q$, array(select jsonb_array_elements_text($j$["Many were grown above water and are switching to underwater leaves", "They are always dying", "The fish are eating them"]$j$::jsonb)), 0, 7);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why use a timer on your light?$q$, $j$["Plants and fish like a steady schedule", "It makes the light brighter", "It saves fish food"]$j$::jsonb, 0, 8);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why use a timer on your light?$q$, array(select jsonb_array_elements_text($j$["Plants and fish like a steady schedule", "It makes the light brighter", "It saves fish food"]$j$::jsonb)), 0, 8);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Algae is growing quickly. What's a good first thing to try?$q$, $j$["Add more fertilizer", "Leave the light on all day", "Cut back the light an hour or two"]$j$::jsonb, 2, 9);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Algae is growing quickly. What's a good first thing to try?$q$, array(select jsonb_array_elements_text($j$["Add more fertilizer", "Leave the light on all day", "Cut back the light an hour or two"]$j$::jsonb)), 2, 9);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why should you keep a tank out of direct sunlight?$q$, $j$["Fish can't see in sunlight", "Sunlight cools the water", "Sunlight is hard to control and causes algae"]$j$::jsonb, 2, 10);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why should you keep a tank out of direct sunlight?$q$, array(select jsonb_array_elements_text($j$["Fish can't see in sunlight", "Sunlight cools the water", "Sunlight is hard to control and causes algae"]$j$::jsonb)), 2, 10);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which plant feeds mostly from the water, not its roots?$q$, $j$["Cryptocoryne", "Java fern", "Amazon sword"]$j$::jsonb, 1, 11);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which plant feeds mostly from the water, not its roots?$q$, array(select jsonb_array_elements_text($j$["Cryptocoryne", "Java fern", "Amazon sword"]$j$::jsonb)), 1, 11);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Can you grow root feeders in plain gravel?$q$, $j$["Yes, with root tabs", "No, never"]$j$::jsonb, 0, 12);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Can you grow root feeders in plain gravel?$q$, array(select jsonb_array_elements_text($j$["Yes, with root tabs", "No, never"]$j$::jsonb)), 0, 12);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When planting, where should the crown of the plant sit?$q$, $j$["Floating", "Just above the substrate", "Buried deep"]$j$::jsonb, 1, 13);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When planting, where should the crown of the plant sit?$q$, array(select jsonb_array_elements_text($j$["Floating", "Just above the substrate", "Buried deep"]$j$::jsonb)), 1, 13);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fertilizer feeds floating plants and leaf feeders?$q$, $j$["Root tabs only", "Fish flakes", "Liquid fertilizer"]$j$::jsonb, 2, 14);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which fertilizer feeds floating plants and leaf feeders?$q$, array(select jsonb_array_elements_text($j$["Root tabs only", "Fish flakes", "Liquid fertilizer"]$j$::jsonb)), 2, 14);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why is it smart to start with a small amount of fertilizer?$q$, $j$["It makes water cloudy forever", "Too much can feed algae", "Plants hate fertilizer"]$j$::jsonb, 1, 15);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Why is it smart to start with a small amount of fertilizer?$q$, array(select jsonb_array_elements_text($j$["It makes water cloudy forever", "Too much can feed algae", "Plants hate fertilizer"]$j$::jsonb)), 1, 15);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When do you usually need to add extra CO2?$q$, $j$["For java fern in low light", "Never for any tank", "For fast-growing plants under strong lights"]$j$::jsonb, 2, 16);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When do you usually need to add extra CO2?$q$, array(select jsonb_array_elements_text($j$["For java fern in low light", "Never for any tank", "For fast-growing plants under strong lights"]$j$::jsonb)), 2, 16);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do with brown, rotting plant leaves?$q$, $j$["Trim them off", "Add fertilizer to them", "Leave them to grow back"]$j$::jsonb, 0, 17);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$What should you do with brown, rotting plant leaves?$q$, array(select jsonb_array_elements_text($j$["Trim them off", "Add fertilizer to them", "Leave them to grow back"]$j$::jsonb)), 0, 17);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which small catfish eats brown diatoms?$q$, $j$["Oscar", "Pleco only", "Otocinclus"]$j$::jsonb, 2, 18);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$Which small catfish eats brown diatoms?$q$, array(select jsonb_array_elements_text($j$["Oscar", "Pleco only", "Otocinclus"]$j$::jsonb)), 2, 18);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When fixing an algae problem, you should:$q$, $j$["Change everything at once", "Add chemicals daily", "Change one thing at a time and wait a week or two"]$j$::jsonb, 2, 19);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, $q$When fixing an algae problem, you should:$q$, array(select jsonb_array_elements_text($j$["Change everything at once", "Add chemicals daily", "Change one thing at a time and wait a week or two"]$j$::jsonb)), 2, 19);
    end if;

    raise notice 'Live Plants for Beginners created';
  else
    raise notice 'Live Plants for Beginners already exists, skipped';
  end if;
end
$do$;

select c.sort_order, c.title,
       (select count(*) from public.course_sections s where s.course_id = c.id) as lessons,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
order by c.sort_order;
