-- Live Plants for Beginners: creates the course with 6 lessons, images, quizzes and a 20-question final exam.
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
