-- Choosing Your First Fish: creates the course with 6 lessons, images, quizzes and a 20-question final exam.
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

end
$do$;

select c.sort_order, c.title,
       (select count(*) from public.course_sections s where s.course_id = c.id) as lessons,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
order by c.sort_order;
