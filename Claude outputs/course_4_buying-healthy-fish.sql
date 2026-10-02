-- Buying Healthy Fish: creates the course with 6 lessons, images, quizzes and a 20-question final exam.
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

end
$do$;

select c.sort_order, c.title,
       (select count(*) from public.course_sections s where s.course_id = c.id) as lessons,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
order by c.sort_order;
