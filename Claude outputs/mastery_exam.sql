-- Foundations Mastery: the 100-question final exam for the beginner path.
-- Paste into the Supabase SQL Editor and run once. Safe to run again.
--
-- What this does:
--   1. Adds what the exam needs (question topics and explanations, a pass mark per course,
--      server-timed exam sessions, extra fields on exam attempts).
--   2. Locks the answer key: the public can no longer read correct_index or explanations,
--      and can't read the mastery questions at all. Grading already uses the service role.
--   3. Creates the Foundations Mastery course with its 100 questions.

-- 1. Columns and tables ------------------------------------------------------
alter table public.course_questions
  add column if not exists topic text,
  add column if not exists explanation text;

alter table public.courses
  add column if not exists pass_percent integer;

create table if not exists public.course_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  correct integer not null,
  total integer not null,
  score integer not null,
  passed boolean not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.course_exam_attempts enable row level security;
drop policy if exists "exam attempts own read" on public.course_exam_attempts;
create policy "exam attempts own read"
  on public.course_exam_attempts for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

alter table public.course_exam_attempts
  add column if not exists session_id uuid,
  add column if not exists focus_losses integer not null default 0,
  add column if not exists duration_seconds integer;

create table if not exists public.course_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid not null references public.course_sections(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  focus_losses integer not null default 0
);
create index if not exists course_exam_sessions_user_idx
  on public.course_exam_sessions (user_id, section_id, started_at desc);
alter table public.course_exam_sessions enable row level security;
drop policy if exists "exam sessions own read" on public.course_exam_sessions;
create policy "exam sessions own read"
  on public.course_exam_sessions for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- 2. Lock the answer key -----------------------------------------------------
-- Browsers may read only the question text and options, never correct_index or explanation.
revoke select on public.course_questions from anon, authenticated;
grant select (id, section_id, prompt, options, sort_order) on public.course_questions to anon, authenticated;

-- 3. The course --------------------------------------------------------------
do $do$
declare
  cid uuid;
  sid uuid;
  opts_type text;
  has_rls boolean;
begin
  select udt_name into opts_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_questions' and column_name = 'options';

  select id into cid from public.courses where slug = 'foundations-mastery';
  if cid is null then
    insert into public.courses (slug, title, subtitle, description, est_minutes, badge_title, cover_image, is_published, sort_order, pass_percent)
    values (
      'foundations-mastery',
      'Foundations Mastery',
      'The final test of everything a new fish keeper needs to know',
      'A 100-question exam covering every beginner course. Unlocks once you have completed them all. Pass with 90% or better to earn Foundations Master.',
      120,
      'Foundations Master',
      null,
      true,
      1000,
      90
    )
    returning id into cid;

    insert into public.course_sections (course_id, title, content, has_video, video_url, sort_order)
    values (cid, 'Mastery exam', $c$The final test of the beginner path. 100 questions drawn from every beginner course. You have 120 minutes, and you need 90% to pass.

Pass, and you earn **Foundations Master**: a certificate and a mastery emblem on your profile.$c$, false, null, 0)
    returning id into sid;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why is a 20-gallon tank usually easier for a beginner than a 5-gallon tank?$q$, $j$["Larger tanks can run without a filter for the first month or so", "Fish in larger tanks produce less waste for their body size", "More water dilutes mistakes, so conditions change more slowly", "Bigger tanks come already cycled, so fish can go in on day one"]$j$::jsonb, 2, 0, 'setup', $x$More water spreads out waste, heat and mistakes, so temperature and water quality change slowly. Small tanks swing fast, so small errors hit fish harder.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why is a 20-gallon tank usually easier for a beginner than a 5-gallon tank?$q$, array(select jsonb_array_elements_text($j$["Larger tanks can run without a filter for the first month or so", "Fish in larger tanks produce less waste for their body size", "More water dilutes mistakes, so conditions change more slowly", "Bigger tanks come already cycled, so fish can go in on day one"]$j$::jsonb)), 2, 0, 'setup', $x$More water spreads out waste, heat and mistakes, so temperature and water quality change slowly. Small tanks swing fast, so small errors hit fish harder.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Water weighs about how much per gallon, and why does that matter?$q$, $j$["About 2 pounds, so most furniture can hold a filled tank safely", "About 8 pounds, so the stand must hold the full filled weight", "About 4 pounds, so a sturdy desk or dresser is usually strong enough", "About 8 pounds, but the stand only needs to hold the empty glass"]$j$::jsonb, 1, 1, 'setup', $x$Water weighs about 8 pounds per gallon, so a filled 20-gallon tank is well over 160 pounds once you add glass, gravel and rock. Ordinary furniture can crack or tip under that load.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Water weighs about how much per gallon, and why does that matter?$q$, array(select jsonb_array_elements_text($j$["About 2 pounds, so most furniture can hold a filled tank safely", "About 8 pounds, so the stand must hold the full filled weight", "About 4 pounds, so a sturdy desk or dresser is usually strong enough", "About 8 pounds, but the stand only needs to hold the empty glass"]$j$::jsonb)), 1, 1, 'setup', $x$Water weighs about 8 pounds per gallon, so a filled 20-gallon tank is well over 160 pounds once you add glass, gravel and rock. Ordinary furniture can crack or tip under that load.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why should an aquarium be kept out of direct sunlight?$q$, $j$["Natural light confuses fish so they stop eating", "It kills the beneficial bacteria living in the filter media", "It fuels algae and can make the temperature swing", "It makes the pH drop to dangerous levels within a few hours"]$j$::jsonb, 2, 2, 'setup', $x$You can't control sunlight. It feeds algae and warms the water during the day, then lets it cool at night, which stresses fish.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why should an aquarium be kept out of direct sunlight?$q$, array(select jsonb_array_elements_text($j$["Natural light confuses fish so they stop eating", "It kills the beneficial bacteria living in the filter media", "It fuels algae and can make the temperature swing", "It makes the pH drop to dangerous levels within a few hours"]$j$::jsonb)), 2, 2, 'setup', $x$You can't control sunlight. It feeds algae and warms the water during the day, then lets it cool at night, which stresses fish.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What should never touch your aquarium bucket, sponges or decor?$q$, $j$["Old tank water saved from a water change", "Soap or household cleaners", "Dechlorinated tap water", "A clean towel used only for the aquarium"]$j$::jsonb, 1, 3, 'setup', $x$Soap and cleaners leave a residue that is toxic to fish and hard to rinse away. That's why aquarium tools should be used only for the aquarium.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What should never touch your aquarium bucket, sponges or decor?$q$, array(select jsonb_array_elements_text($j$["Old tank water saved from a water change", "Soap or household cleaners", "Dechlorinated tap water", "A clean towel used only for the aquarium"]$j$::jsonb)), 1, 3, 'setup', $x$Soap and cleaners leave a residue that is toxic to fish and hard to rinse away. That's why aquarium tools should be used only for the aquarium.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$You set up a brand-new tank yesterday. What is the right next step?$q$, $j$["Add a full group of fish so the bacteria grow faster", "Run it without fish and start the cycling process", "Add fish, but leave the filter off for the first week", "Change all the water daily until it looks clear"]$j$::jsonb, 1, 4, 'setup', $x$A new tank has almost no beneficial bacteria yet. Cycling it first builds the bacteria that keep ammonia and nitrite from poisoning fish.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$You set up a brand-new tank yesterday. What is the right next step?$q$, array(select jsonb_array_elements_text($j$["Add a full group of fish so the bacteria grow faster", "Run it without fish and start the cycling process", "Add fish, but leave the filter off for the first week", "Change all the water daily until it looks clear"]$j$::jsonb)), 1, 4, 'setup', $x$A new tank has almost no beneficial bacteria yet. Cycling it first builds the bacteria that keep ammonia and nitrite from poisoning fish.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why do you use a gravel siphon during a water change?$q$, $j$["It strips out the bacteria so the gravel stays sterile", "It pushes fresh oxygen down into the gravel bed", "It cools the water before you refill the tank", "It pulls waste out of the gravel while draining water"]$j$::jsonb, 3, 5, 'setup', $x$Uneaten food and waste settle into the gravel, where they rot. The siphon removes that debris in the same step as removing old water.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why do you use a gravel siphon during a water change?$q$, array(select jsonb_array_elements_text($j$["It strips out the bacteria so the gravel stays sterile", "It pushes fresh oxygen down into the gravel bed", "It cools the water before you refill the tank", "It pulls waste out of the gravel while draining water"]$j$::jsonb)), 3, 5, 'setup', $x$Uneaten food and waste settle into the gravel, where they rot. The siphon removes that debris in the same step as removing old water.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which maintenance routine matches what the course recommends for most tanks?$q$, $j$["Just top off the water that evaporates each week", "One complete water change about once a year", "About 25% weekly, using conditioned water", "A 100% water change every day to keep it spotless"]$j$::jsonb, 2, 6, 'setup', $x$Regular partial changes steadily remove nitrate and waste without shocking fish. Huge or rare changes cause big swings in the water.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which maintenance routine matches what the course recommends for most tanks?$q$, array(select jsonb_array_elements_text($j$["Just top off the water that evaporates each week", "One complete water change about once a year", "About 25% weekly, using conditioned water", "A 100% water change every day to keep it spotless"]$j$::jsonb)), 2, 6, 'setup', $x$Regular partial changes steadily remove nitrate and waste without shocking fish. Huge or rare changes cause big swings in the water.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$You top off evaporated water for months but never do a water change. What builds up?$q$, $j$["Nitrate and other dissolved waste", "Extra oxygen from fresh water", "Only chlorine from each top-off", "Nothing, since top-offs replace the water"]$j$::jsonb, 0, 7, 'setup', $x$Only pure water evaporates. Everything dissolved in it stays behind and gets more concentrated until you actually remove water.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$You top off evaporated water for months but never do a water change. What builds up?$q$, array(select jsonb_array_elements_text($j$["Nitrate and other dissolved waste", "Extra oxygen from fresh water", "Only chlorine from each top-off", "Nothing, since top-offs replace the water"]$j$::jsonb)), 0, 7, 'setup', $x$Only pure water evaporates. Everything dissolved in it stays behind and gets more concentrated until you actually remove water.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which acclimation method does the course recommend for most new fish?$q$, $j$["Float about 15 min, mix in tank water 20 to 30 min, then net it in", "Float the bag for 2 minutes, then pour the fish and water in", "Set the bag in a bowl of cold water first so the fish calms down", "Pour the bag straight in so the fish spends less time stressed"]$j$::jsonb, 0, 8, 'setup', $x$Floating matches the temperature, and mixing in tank water lets the fish adjust to your water chemistry slowly. Netting it in keeps store water out of your tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which acclimation method does the course recommend for most new fish?$q$, array(select jsonb_array_elements_text($j$["Float about 15 min, mix in tank water 20 to 30 min, then net it in", "Float the bag for 2 minutes, then pour the fish and water in", "Set the bag in a bowl of cold water first so the fish calms down", "Pour the bag straight in so the fish spends less time stressed"]$j$::jsonb)), 0, 8, 'setup', $x$Floating matches the temperature, and mixing in tank water lets the fish adjust to your water chemistry slowly. Netting it in keeps store water out of your tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why net new fish into your tank instead of pouring in the store water?$q$, $j$["Store water is colder and will chill the whole tank", "Store water holds too much oxygen for a home tank", "Store water can carry disease and waste", "Store water is too clean and will stall your cycle"]$j$::jsonb, 2, 9, 'setup', $x$The store's system may carry parasites, bacteria and ammonia from many fish. Leaving that water behind protects your tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why net new fish into your tank instead of pouring in the store water?$q$, array(select jsonb_array_elements_text($j$["Store water is colder and will chill the whole tank", "Store water holds too much oxygen for a home tank", "Store water can carry disease and waste", "Store water is too clean and will stall your cycle"]$j$::jsonb)), 2, 9, 'setup', $x$The store's system may carry parasites, bacteria and ammonia from many fish. Leaving that water behind protects your tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How much should you feed at one time?$q$, $j$["One large meal on Sunday that lasts the whole week", "As much as they will eat, until they stop on their own", "Only what they finish in about 1 to 2 minutes", "Enough to leave a little on the gravel for later"]$j$::jsonb, 2, 10, 'setup', $x$Food that isn't eaten quickly sinks and rots, which raises ammonia. Fish have small stomachs, so small meals once or twice a day are plenty.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How much should you feed at one time?$q$, array(select jsonb_array_elements_text($j$["One large meal on Sunday that lasts the whole week", "As much as they will eat, until they stop on their own", "Only what they finish in about 1 to 2 minutes", "Enough to leave a little on the gravel for later"]$j$::jsonb)), 2, 10, 'setup', $x$Food that isn't eaten quickly sinks and rots, which raises ammonia. Fish have small stomachs, so small meals once or twice a day are plenty.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your fish are suddenly gasping at the surface. What does that most often point to?$q$, $j$["An ammonia spike or low oxygen in the water", "The heater is set a few degrees too cool for them", "The fish are healthy and simply playing near the light", "The fish are hungry and are begging for more food"]$j$::jsonb, 0, 11, 'setup', $x$Gasping means fish are struggling to breathe, which usually comes from a water problem. Test ammonia and nitrite and make sure the surface is moving to add oxygen.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your fish are suddenly gasping at the surface. What does that most often point to?$q$, array(select jsonb_array_elements_text($j$["An ammonia spike or low oxygen in the water", "The heater is set a few degrees too cool for them", "The fish are healthy and simply playing near the light", "The fish are hungry and are begging for more food"]$j$::jsonb)), 0, 11, 'setup', $x$Gasping means fish are struggling to breathe, which usually comes from a water problem. Test ammonia and nitrite and make sure the surface is moving to add oxygen.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the correct order of the nitrogen cycle?$q$, $j$["Ammonia, then nitrate, and finally nitrite", "Ammonia, then nitrite, then nitrate", "Nitrate, then nitrite, then ammonia", "Nitrite, then ammonia, then nitrate"]$j$::jsonb, 1, 12, 'cycle', $x$Fish waste makes ammonia, and one group of bacteria turns it into nitrite. A second group turns nitrite into nitrate, which is far less harmful.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the correct order of the nitrogen cycle?$q$, array(select jsonb_array_elements_text($j$["Ammonia, then nitrate, and finally nitrite", "Ammonia, then nitrite, then nitrate", "Nitrate, then nitrite, then ammonia", "Nitrite, then ammonia, then nitrate"]$j$::jsonb)), 1, 12, 'cycle', $x$Fish waste makes ammonia, and one group of bacteria turns it into nitrite. A second group turns nitrite into nitrate, which is far less harmful.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Where do most of a tank's beneficial bacteria live?$q$, $j$["Floating freely in the open water", "On surfaces, especially the filter media", "Mostly inside the fish's gut and slime coat", "In the top layer of the water, near the air"]$j$::jsonb, 1, 13, 'cycle', $x$Nitrifying bacteria cling to surfaces instead of floating in the water. Filter media has lots of surface and steady water flow, so it holds the biggest colony.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Where do most of a tank's beneficial bacteria live?$q$, array(select jsonb_array_elements_text($j$["Floating freely in the open water", "On surfaces, especially the filter media", "Mostly inside the fish's gut and slime coat", "In the top layer of the water, near the air"]$j$::jsonb)), 1, 13, 'cycle', $x$Nitrifying bacteria cling to surfaces instead of floating in the water. Filter media has lots of surface and steady water flow, so it holds the biggest colony.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which compound does a cycled tank rely on water changes to remove?$q$, $j$["Dissolved oxygen", "Nitrite", "Nitrate", "Ammonia"]$j$::jsonb, 2, 14, 'cycle', $x$In a cycled tank, bacteria convert ammonia and nitrite for you. Nitrate is the end product, so it keeps building up until water changes or plants remove it.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which compound does a cycled tank rely on water changes to remove?$q$, array(select jsonb_array_elements_text($j$["Dissolved oxygen", "Nitrite", "Nitrate", "Ammonia"]$j$::jsonb)), 2, 14, 'cycle', $x$In a cycled tank, bacteria convert ammonia and nitrite for you. Nitrate is the end product, so it keeps building up until water changes or plants remove it.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How does nitrite harm fish?$q$, $j$["It makes the water too acidic to breathe", "It only damages the edges of their fins", "It slowly dissolves their scales and slime coat", "It keeps their blood from carrying oxygen"]$j$::jsonb, 3, 15, 'cycle', $x$Nitrite gets into the blood and blocks it from carrying oxygen. That's why poisoned fish can gasp even when the water has plenty of oxygen.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How does nitrite harm fish?$q$, array(select jsonb_array_elements_text($j$["It makes the water too acidic to breathe", "It only damages the edges of their fins", "It slowly dissolves their scales and slime coat", "It keeps their blood from carrying oxygen"]$j$::jsonb)), 3, 15, 'cycle', $x$Nitrite gets into the blood and blocks it from carrying oxygen. That's why poisoned fish can gasp even when the water has plenty of oxygen.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$During a fishless cycle, about what ammonia level should you dose to?$q$, $j$["About 0.1 ppm", "About 20 ppm", "None at all", "About 2 ppm"]$j$::jsonb, 3, 16, 'cycle', $x$About 2 ppm gives the bacteria plenty of food. Much higher levels can stall the cycle, and with no ammonia source there's nothing for bacteria to grow on.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$During a fishless cycle, about what ammonia level should you dose to?$q$, array(select jsonb_array_elements_text($j$["About 0.1 ppm", "About 20 ppm", "None at all", "About 2 ppm"]$j$::jsonb)), 3, 16, 'cycle', $x$About 2 ppm gives the bacteria plenty of food. Much higher levels can stall the cycle, and with no ammonia source there's nothing for bacteria to grow on.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which result proves a fishless cycle is finished?$q$, $j$["2 ppm ammonia clears to 0 ammonia and 0 nitrite in 24 hours", "Exactly two weeks have passed since you first added ammonia", "Nitrate reads exactly zero after a full day of testing", "The water turns crystal clear and stays that way for a week"]$j$::jsonb, 0, 17, 'cycle', $x$Clear water and time passing don't prove anything. The tank is ready when its bacteria can process a full dose of ammonia, and the nitrite it creates, within a day.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which result proves a fishless cycle is finished?$q$, array(select jsonb_array_elements_text($j$["2 ppm ammonia clears to 0 ammonia and 0 nitrite in 24 hours", "Exactly two weeks have passed since you first added ammonia", "Nitrate reads exactly zero after a full day of testing", "The water turns crystal clear and stays that way for a week"]$j$::jsonb)), 0, 17, 'cycle', $x$Clear water and time passing don't prove anything. The tank is ready when its bacteria can process a full dose of ammonia, and the nitrite it creates, within a day.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your fishless cycle has stalled for two weeks and pH reads 6.0. What is the most likely fix?$q$, $j$["Raise the pH with a water change or a little baking soda", "Turn the filter off for a few days to let bacteria settle", "Dose much more ammonia so the bacteria have extra food", "Lower the temperature to 65\u00b0F so the bacteria can rest"]$j$::jsonb, 0, 18, 'cycle', $x$Nitrifying bacteria slow down sharply once pH falls below about 6.5. Fresh water or a little baking soda restores the buffer and brings the pH back up so they can work again.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your fishless cycle has stalled for two weeks and pH reads 6.0. What is the most likely fix?$q$, array(select jsonb_array_elements_text($j$["Raise the pH with a water change or a little baking soda", "Turn the filter off for a few days to let bacteria settle", "Dose much more ammonia so the bacteria have extra food", "Lower the temperature to 65\u00b0F so the bacteria can rest"]$j$::jsonb)), 0, 18, 'cycle', $x$Nitrifying bacteria slow down sharply once pH falls below about 6.5. Fresh water or a little baking soda restores the buffer and brings the pH back up so they can work again.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why do a large water change right before adding fish to a freshly cycled tank?$q$, $j$["To add fresh ammonia so the bacteria have food", "To drop the pH as low as possible for new fish", "To remove the bacteria so the fish can add their own", "To lower the nitrate that built up during cycling"]$j$::jsonb, 3, 19, 'cycle', $x$Weeks of dosing ammonia leave a lot of nitrate behind. A 50 to 75% change resets it, and the bacteria stay safe on the filter and surfaces.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why do a large water change right before adding fish to a freshly cycled tank?$q$, array(select jsonb_array_elements_text($j$["To add fresh ammonia so the bacteria have food", "To drop the pH as low as possible for new fish", "To remove the bacteria so the fish can add their own", "To lower the nitrate that built up during cycling"]$j$::jsonb)), 3, 19, 'cycle', $x$Weeks of dosing ammonia leave a lot of nitrate behind. A 50 to 75% change resets it, and the bacteria stay safe on the filter and surfaces.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$During a fish-in cycle, what level should you keep ammonia plus nitrite at or below?$q$, $j$["2 ppm each", "0.5 ppm combined", "5 ppm combined", "Any level, as long as the fish look fine"]$j$::jsonb, 1, 20, 'cycle', $x$At or under 0.5 ppm total, the fish stay reasonably safe while the bacteria still get enough food to grow. Fish can be harmed before they look sick.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$During a fish-in cycle, what level should you keep ammonia plus nitrite at or below?$q$, array(select jsonb_array_elements_text($j$["2 ppm each", "0.5 ppm combined", "5 ppm combined", "Any level, as long as the fish look fine"]$j$::jsonb)), 1, 20, 'cycle', $x$At or under 0.5 ppm total, the fish stay reasonably safe while the bacteria still get enough food to grow. Fish can be harmed before they look sick.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your test shows ammonia 0, nitrite 1.5 ppm and nitrate 10 ppm. Where is the cycle?$q$, $j$["It is fully cycled, because nitrate is now showing up", "It has not started yet, because ammonia bacteria haven't appeared", "Late stage; nitrite-eating bacteria are still catching up", "It has crashed, and the bacteria have all died off"]$j$::jsonb, 2, 21, 'cycle', $x$Zero ammonia and some nitrate mean the first bacteria are working. Nitrite still showing means the second group isn't big enough yet, so the cycle is close but not done.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your test shows ammonia 0, nitrite 1.5 ppm and nitrate 10 ppm. Where is the cycle?$q$, array(select jsonb_array_elements_text($j$["It is fully cycled, because nitrate is now showing up", "It has not started yet, because ammonia bacteria haven't appeared", "Late stage; nitrite-eating bacteria are still catching up", "It has crashed, and the bacteria have all died off"]$j$::jsonb)), 2, 21, 'cycle', $x$Zero ammonia and some nitrate mean the first bacteria are working. Nitrite still showing means the second group isn't big enough yet, so the cycle is close but not done.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$When is the same ammonia reading most dangerous to fish?$q$, $j$["When pH and temperature are both low", "Right after live plants have been added", "When the lights have been off for hours", "When pH and temperature are high"]$j$::jsonb, 3, 22, 'cycle', $x$In warm, alkaline water more of the ammonia is in its toxic form, so the same test reading does more harm. In cool, acidic water more of it is the milder form.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$When is the same ammonia reading most dangerous to fish?$q$, array(select jsonb_array_elements_text($j$["When pH and temperature are both low", "Right after live plants have been added", "When the lights have been off for hours", "When pH and temperature are high"]$j$::jsonb)), 3, 22, 'cycle', $x$In warm, alkaline water more of the ammonia is in its toxic form, so the same test reading does more harm. In cool, acidic water more of it is the milder form.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the most effective real shortcut for cycling a new tank?$q$, $j$["Adding a pinch of flake food every day and waiting it out", "Seeded filter media from an established, healthy tank", "Doing a 100% water change every day for two weeks", "Letting the empty tank sit and run for a full month"]$j$::jsonb, 1, 23, 'cycle', $x$Used media already carries a working bacteria colony, so the new tank starts partly cycled. An empty tank with no ammonia grows nothing, and rotting food is slow and messy.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the most effective real shortcut for cycling a new tank?$q$, array(select jsonb_array_elements_text($j$["Adding a pinch of flake food every day and waiting it out", "Seeded filter media from an established, healthy tank", "Doing a 100% water change every day for two weeks", "Letting the empty tank sit and run for a full month"]$j$::jsonb)), 1, 23, 'cycle', $x$Used media already carries a working bacteria colony, so the new tank starts partly cycled. An empty tank with no ammonia grows nothing, and rotting food is slow and messy.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the safest way to clean filter media?$q$, $j$["Soak it in a weak bleach mix, then rinse it", "Swirl it in old tank water from a water change", "Replace all of it with brand-new media every month", "Rinse it well under hot tap water until clean"]$j$::jsonb, 1, 24, 'cycle', $x$Old tank water removes gunk without harming the bacteria. Chlorine and heat kill them, and replacing all the media throws the colony away.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the safest way to clean filter media?$q$, array(select jsonb_array_elements_text($j$["Soak it in a weak bleach mix, then rinse it", "Swirl it in old tank water from a water change", "Replace all of it with brand-new media every month", "Rinse it well under hot tap water until clean"]$j$::jsonb)), 1, 24, 'cycle', $x$Old tank water removes gunk without harming the bacteria. Chlorine and heat kill them, and replacing all the media throws the colony away.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$The power was out for 4 hours. What should you do before restarting the filter?$q$, $j$["Restart it right away; a few hours is too short to matter", "Feed extra for a few days to help the bacteria recover", "Throw away the old media and start the whole cycle over from scratch", "Rinse media in tank water, restart, then test for a few days"]$j$::jsonb, 3, 25, 'cycle', $x$Bacteria sitting in still water can lose oxygen and start dying, and the filter can hold stale water. Rinsing flushes that out, and testing catches a mini-cycle early.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$The power was out for 4 hours. What should you do before restarting the filter?$q$, array(select jsonb_array_elements_text($j$["Restart it right away; a few hours is too short to matter", "Feed extra for a few days to help the bacteria recover", "Throw away the old media and start the whole cycle over from scratch", "Rinse media in tank water, restart, then test for a few days"]$j$::jsonb)), 3, 25, 'cycle', $x$Bacteria sitting in still water can lose oxygen and start dying, and the filter can hold stale water. Rinsing flushes that out, and testing catches a mini-cycle early.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A tank set up last week has turned milky white. What is it usually?$q$, $j$["Ammonia poisoning that calls for a 100% water change today", "Fast-growing green algae floating in the water", "A nitrate overdose from the new tap water", "A bacterial bloom that usually clears on its own"]$j$::jsonb, 3, 26, 'cycle', $x$New tanks often get a cloudy bloom of free-floating bacteria while the colony settles. It usually fades in days, so test the water rather than chasing the haze.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A tank set up last week has turned milky white. What is it usually?$q$, array(select jsonb_array_elements_text($j$["Ammonia poisoning that calls for a 100% water change today", "Fast-growing green algae floating in the water", "A nitrate overdose from the new tap water", "A bacterial bloom that usually clears on its own"]$j$::jsonb)), 3, 26, 'cycle', $x$New tanks often get a cloudy bloom of free-floating bacteria while the colony settles. It usually fades in days, so test the water rather than chasing the haze.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A tank cycled for a year gets 12 new fish at once, and ammonia appears. Why?$q$, $j$["Bright lights from the new setup killed the bacteria", "The bacteria colony died of old age after a year", "Waste jumped faster than the bacteria could grow", "New fish make no ammonia, so the test kit must be faulty"]$j$::jsonb, 2, 27, 'cycle', $x$The bacteria colony grows to match the waste it has been getting. A sudden big jump outruns it, causing a mini-cycle until the colony catches up.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A tank cycled for a year gets 12 new fish at once, and ammonia appears. Why?$q$, array(select jsonb_array_elements_text($j$["Bright lights from the new setup killed the bacteria", "The bacteria colony died of old age after a year", "Waste jumped faster than the bacteria could grow", "New fish make no ammonia, so the test kit must be faulty"]$j$::jsonb)), 2, 27, 'cycle', $x$The bacteria colony grows to match the waste it has been getting. A sudden big jump outruns it, causing a mini-cycle until the colony catches up.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is true about most fish you see for sale at a store?$q$, $j$["Store water slows growth, so they stay small at home", "Fish only grow as big as the tank they are kept in", "Many are juveniles that will grow much larger", "Most are already at or near their full adult size"]$j$::jsonb, 2, 28, 'stocking', $x$Fish are usually sold young because small fish are cheaper to ship. Always look up the adult size before you buy.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is true about most fish you see for sale at a store?$q$, array(select jsonb_array_elements_text($j$["Store water slows growth, so they stay small at home", "Fish only grow as big as the tank they are kept in", "Many are juveniles that will grow much larger", "Most are already at or near their full adult size"]$j$::jsonb)), 2, 28, 'stocking', $x$Fish are usually sold young because small fish are cheaper to ship. Always look up the adult size before you buy.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$About how large can a common pleco grow?$q$, $j$["About 6 inches at most", "About 3 to 4 inches", "15 to 18 inches or more", "Only as large as its tank allows"]$j$::jsonb, 2, 29, 'stocking', $x$Common plecos are often sold at 2 to 3 inches but can grow well over a foot, which is far too big for most home tanks.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$About how large can a common pleco grow?$q$, array(select jsonb_array_elements_text($j$["About 6 inches at most", "About 3 to 4 inches", "15 to 18 inches or more", "Only as large as its tank allows"]$j$::jsonb)), 2, 29, 'stocking', $x$Common plecos are often sold at 2 to 3 inches but can grow well over a foot, which is far too big for most home tanks.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which of these fish will outgrow a typical 20-gallon tank?$q$, $j$["Neon tetra", "Pygmy corydoras", "Bala shark", "Harlequin rasbora"]$j$::jsonb, 2, 30, 'stocking', $x$Bala sharks can reach about a foot long and are fast swimmers that need a group, so they need a very large tank. The others stay small.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which of these fish will outgrow a typical 20-gallon tank?$q$, array(select jsonb_array_elements_text($j$["Neon tetra", "Pygmy corydoras", "Bala shark", "Harlequin rasbora"]$j$::jsonb)), 2, 30, 'stocking', $x$Bala sharks can reach about a foot long and are fast swimmers that need a group, so they need a very large tank. The others stay small.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which is an example of the "mouth rule"?$q$, $j$["A nerite snail scraping algae off the glass", "A grown angelfish eating neon tetras", "A betta snapping up flakes at the surface", "Corydoras grazing on leftover sinking food"]$j$::jsonb, 1, 31, 'stocking', $x$The mouth rule says any fish small enough to fit in a tankmate's mouth will likely get eaten. Adult angelfish and neon tetras are the classic example.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which is an example of the "mouth rule"?$q$, array(select jsonb_array_elements_text($j$["A nerite snail scraping algae off the glass", "A grown angelfish eating neon tetras", "A betta snapping up flakes at the surface", "Corydoras grazing on leftover sinking food"]$j$::jsonb)), 1, 31, 'stocking', $x$The mouth rule says any fish small enough to fit in a tankmate's mouth will likely get eaten. Adult angelfish and neon tetras are the classic example.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which pairing is a classic mismatch?$q$, $j$["Neon tetras with corydoras", "Tiger barbs with a betta", "Harlequin rasboras with nerite snails", "A honey gourami with harlequin rasboras"]$j$::jsonb, 1, 32, 'stocking', $x$Tiger barbs are known fin-nippers, and a betta's long, slow fins make it an easy target. The other pairings are peaceful community combinations.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which pairing is a classic mismatch?$q$, array(select jsonb_array_elements_text($j$["Neon tetras with corydoras", "Tiger barbs with a betta", "Harlequin rasboras with nerite snails", "A honey gourami with harlequin rasboras"]$j$::jsonb)), 1, 32, 'stocking', $x$Tiger barbs are known fin-nippers, and a betta's long, slow fins make it an easy target. The other pairings are peaceful community combinations.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the smallest group size most schooling fish need?$q$, $j$["Just 1", "At least 3", "At least 2", "At least 6"]$j$::jsonb, 3, 33, 'stocking', $x$Schooling fish like tetras, rasboras and corydoras feel safe in numbers, and groups of 6 or more let them act naturally. Bigger groups are even better.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the smallest group size most schooling fish need?$q$, array(select jsonb_array_elements_text($j$["Just 1", "At least 3", "At least 2", "At least 6"]$j$::jsonb)), 3, 33, 'stocking', $x$Schooling fish like tetras, rasboras and corydoras feel safe in numbers, and groups of 6 or more let them act naturally. Bigger groups are even better.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What usually happens to a schooling fish that is kept alone?$q$, $j$["It stays healthy as long as it gets extra food", "It gets stressed, hides and gets sick more easily", "It grows much larger than normal without competition", "It becomes the boldest, most active fish in the tank"]$j$::jsonb, 1, 34, 'stocking', $x$Without a group, these fish feel exposed to predators. Constant stress weakens them, leading to hiding, faded color and illness.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What usually happens to a schooling fish that is kept alone?$q$, array(select jsonb_array_elements_text($j$["It stays healthy as long as it gets extra food", "It gets stressed, hides and gets sick more easily", "It grows much larger than normal without competition", "It becomes the boldest, most active fish in the tank"]$j$::jsonb)), 1, 34, 'stocking', $x$Without a group, these fish feel exposed to predators. Constant stress weakens them, leading to hiding, faded color and illness.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why shouldn't two male bettas share a tank?$q$, $j$["They will breed too quickly and overcrowd the tank", "They will fight, often until one is badly hurt", "They will eat each other's food and slowly starve", "They need very different water temperatures"]$j$::jsonb, 1, 35, 'stocking', $x$Male bettas are highly territorial toward each other. In a shared tank they fight, and the loser can be badly injured or killed.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why shouldn't two male bettas share a tank?$q$, array(select jsonb_array_elements_text($j$["They will breed too quickly and overcrowd the tank", "They will fight, often until one is badly hurt", "They will eat each other's food and slowly starve", "They need very different water temperatures"]$j$::jsonb)), 1, 35, 'stocking', $x$Male bettas are highly territorial toward each other. In a shared tank they fight, and the loser can be badly injured or killed.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which temperature ranges are right?$q$, $j$["Both about 60 to 65\u00b0F, since cool water holds more oxygen", "Goldfish about 65 to 72\u00b0F, tropicals about 74 to 80\u00b0F", "Both about 80 to 85\u00b0F, since all fish like warm water", "Goldfish about 80\u00b0F, tropicals about 65\u00b0F"]$j$::jsonb, 1, 36, 'stocking', $x$Goldfish are coldwater fish and tropical fish need steady warmth. Because their ranges barely overlap, the two groups shouldn't share a tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which temperature ranges are right?$q$, array(select jsonb_array_elements_text($j$["Both about 60 to 65\u00b0F, since cool water holds more oxygen", "Goldfish about 65 to 72\u00b0F, tropicals about 74 to 80\u00b0F", "Both about 80 to 85\u00b0F, since all fish like warm water", "Goldfish about 80\u00b0F, tropicals about 65\u00b0F"]$j$::jsonb)), 1, 36, 'stocking', $x$Goldfish are coldwater fish and tropical fish need steady warmth. Because their ranges barely overlap, the two groups shouldn't share a tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which fish naturally needs hard water with a high pH?$q$, $j$["African rift lake cichlids", "South American discus", "Cardinal and neon tetras", "Harlequin rasboras and chili rasboras"]$j$::jsonb, 0, 37, 'stocking', $x$The African rift lakes are naturally hard and alkaline, and their cichlids are adapted to that. Discus, tetras and rasboras come from soft, acidic waters.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which fish naturally needs hard water with a high pH?$q$, array(select jsonb_array_elements_text($j$["African rift lake cichlids", "South American discus", "Cardinal and neon tetras", "Harlequin rasboras and chili rasboras"]$j$::jsonb)), 0, 37, 'stocking', $x$The African rift lakes are naturally hard and alkaline, and their cichlids are adapted to that. Discus, tetras and rasboras come from soft, acidic waters.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the main weakness of the "one inch of fish per gallon" rule?$q$, $j$["It counts snails and shrimp but leaves out fish", "It ignores body bulk, so big fish get undercounted", "It is meant only for saltwater tanks, not freshwater ones", "It only works in tanks that have live plants"]$j$::jsonb, 1, 38, 'stocking', $x$Waste depends on body mass, not just length. One thick 10-inch fish produces far more waste than ten slim 1-inch fish.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the main weakness of the "one inch of fish per gallon" rule?$q$, array(select jsonb_array_elements_text($j$["It counts snails and shrimp but leaves out fish", "It ignores body bulk, so big fish get undercounted", "It is meant only for saltwater tanks, not freshwater ones", "It only works in tanks that have live plants"]$j$::jsonb)), 1, 38, 'stocking', $x$Waste depends on body mass, not just length. One thick 10-inch fish produces far more waste than ten slim 1-inch fish.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which of these adds the most bioload to a tank?$q$, $j$["A weekly 25% water change", "A thick group of fast-growing live plants", "One nerite snail on the glass", "A pair of large fancy goldfish"]$j$::jsonb, 3, 39, 'stocking', $x$Bioload is the waste a tank has to handle. Big goldfish eat a lot and produce heavy waste, while plants and water changes actually reduce the load.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which of these adds the most bioload to a tank?$q$, array(select jsonb_array_elements_text($j$["A weekly 25% water change", "A thick group of fast-growing live plants", "One nerite snail on the glass", "A pair of large fancy goldfish"]$j$::jsonb)), 3, 39, 'stocking', $x$Bioload is the waste a tank has to handle. Big goldfish eat a lot and produce heavy waste, while plants and water changes actually reduce the load.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the best way to stock a newly cycled tank?$q$, $j$["Start with the most delicate fish while the water is fresh and clean", "Add a few hardy fish at a time, a couple of weeks apart", "Add one new fish every single day until it is full", "Add every fish you plan to keep on the same day"]$j$::jsonb, 1, 40, 'stocking', $x$Each new group adds waste. Spacing additions out gives the bacteria time to grow and keep up, and hardy fish handle small bumps better.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the best way to stock a newly cycled tank?$q$, array(select jsonb_array_elements_text($j$["Start with the most delicate fish while the water is fresh and clean", "Add a few hardy fish at a time, a couple of weeks apart", "Add one new fish every single day until it is full", "Add every fish you plan to keep on the same day"]$j$::jsonb)), 1, 40, 'stocking', $x$Each new group adds waste. Spacing additions out gives the bacteria time to grow and keep up, and hardy fish handle small bumps better.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$In a community tank, which fish best fills the "bottom crew" role?$q$, $j$["A group of corydoras", "A single oscar", "A group of neon tetras", "A male betta"]$j$::jsonb, 0, 41, 'stocking', $x$Corydoras spend their time along the bottom, stay small, are peaceful and do well in groups. Neons swim mid-water, and oscars and bettas aren't bottom dwellers.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$In a community tank, which fish best fills the "bottom crew" role?$q$, array(select jsonb_array_elements_text($j$["A group of corydoras", "A single oscar", "A group of neon tetras", "A male betta"]$j$::jsonb)), 0, 41, 'stocking', $x$Corydoras spend their time along the bottom, stay small, are peaceful and do well in groups. Neons swim mid-water, and oscars and bettas aren't bottom dwellers.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What do most fish handle worse?$q$, $j$["Soft water that they were raised in", "A steady pH a little off the ideal", "Sudden swings in their water conditions", "Hard water that they were raised in"]$j$::jsonb, 2, 42, 'chemistry', $x$Most farm-raised fish adapt to a wide range of water. Rapid changes force their bodies to readjust quickly, so steady water matters more than a perfect number.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What do most fish handle worse?$q$, array(select jsonb_array_elements_text($j$["Soft water that they were raised in", "A steady pH a little off the ideal", "Sudden swings in their water conditions", "Hard water that they were raised in"]$j$::jsonb)), 2, 42, 'chemistry', $x$Most farm-raised fish adapt to a wide range of water. Rapid changes force their bodies to readjust quickly, so steady water matters more than a perfect number.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Compared with pH 8, water at pH 6 is:$q$, $j$["2 times more acidic", "10 times more acidic", "The same; it's just a different number", "100 times more acidic"]$j$::jsonb, 3, 43, 'chemistry', $x$Each whole step on the pH scale is a tenfold change. Two steps is 10 × 10, or 100 times.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Compared with pH 8, water at pH 6 is:$q$, array(select jsonb_array_elements_text($j$["2 times more acidic", "10 times more acidic", "The same; it's just a different number", "100 times more acidic"]$j$::jsonb)), 3, 43, 'chemistry', $x$Each whole step on the pH scale is a tenfold change. Two steps is 10 × 10, or 100 times.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What does a pH above 7 mean?$q$, $j$["The water is neutral", "The water is soft and low in minerals", "The water is basic (alkaline)", "The water is acidic"]$j$::jsonb, 2, 44, 'chemistry', $x$On the pH scale, below 7 is acidic, 7 is neutral, and above 7 is basic, also called alkaline. pH and softness are separate measurements.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What does a pH above 7 mean?$q$, array(select jsonb_array_elements_text($j$["The water is neutral", "The water is soft and low in minerals", "The water is basic (alkaline)", "The water is acidic"]$j$::jsonb)), 2, 44, 'chemistry', $x$On the pH scale, below 7 is acidic, 7 is neutral, and above 7 is basic, also called alkaline. pH and softness are separate measurements.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Most common community fish do well in about what pH range?$q$, $j$["Exactly 7.0", "4.0 to 5.0", "6.5 to 7.8", "9.0 to 10.0"]$j$::jsonb, 2, 45, 'chemistry', $x$Most community fish are comfortable between about 6.5 and 7.8. Within that range, keeping pH steady matters more than hitting one exact number.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Most common community fish do well in about what pH range?$q$, array(select jsonb_array_elements_text($j$["Exactly 7.0", "4.0 to 5.0", "6.5 to 7.8", "9.0 to 10.0"]$j$::jsonb)), 2, 45, 'chemistry', $x$Most community fish are comfortable between about 6.5 and 7.8. Within that range, keeping pH steady matters more than hitting one exact number.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why does pH slowly drop in a tank that rarely gets water changes?$q$, $j$["The tank light slowly breaks the water down over time", "Fish breathe out salt, which makes the water acidic", "The gravel slowly dissolves and turns the water sour", "Acids from filter bacteria build up between changes"]$j$::jsonb, 3, 46, 'chemistry', $x$Turning ammonia into nitrate releases acid. Over time that acid uses up the water's buffer and pH falls, and water changes bring fresh buffer back.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why does pH slowly drop in a tank that rarely gets water changes?$q$, array(select jsonb_array_elements_text($j$["The tank light slowly breaks the water down over time", "Fish breathe out salt, which makes the water acidic", "The gravel slowly dissolves and turns the water sour", "Acids from filter bacteria build up between changes"]$j$::jsonb)), 3, 46, 'chemistry', $x$Turning ammonia into nitrate releases acid. Over time that acid uses up the water's buffer and pH falls, and water changes bring fresh buffer back.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is KH's main job in an aquarium?$q$, $j$["It kills harmful bacteria in the water", "It buffers pH so it stays steady", "It is the main food source for plants", "It measures dissolved oxygen"]$j$::jsonb, 1, 47, 'chemistry', $x$KH, or carbonate hardness, soaks up acids before they can change the pH. More KH means a steadier pH.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is KH's main job in an aquarium?$q$, array(select jsonb_array_elements_text($j$["It kills harmful bacteria in the water", "It buffers pH so it stays steady", "It is the main food source for plants", "It measures dissolved oxygen"]$j$::jsonb)), 1, 47, 'chemistry', $x$KH, or carbonate hardness, soaks up acids before they can change the pH. More KH means a steadier pH.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your pH keeps crashing between water changes. Which test should you run first?$q$, $j$["Temperature", "KH", "Nitrite", "Phosphate"]$j$::jsonb, 1, 48, 'chemistry', $x$Low KH is the most common cause of pH crashes. When the buffer runs out, nothing stops the acids from dragging pH down.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your pH keeps crashing between water changes. Which test should you run first?$q$, array(select jsonb_array_elements_text($j$["Temperature", "KH", "Nitrite", "Phosphate"]$j$::jsonb)), 1, 48, 'chemistry', $x$Low KH is the most common cause of pH crashes. When the buffer runs out, nothing stops the acids from dragging pH down.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What can you add to a filter to raise KH and GH slowly?$q$, $j$["Activated carbon", "Peat moss", "Driftwood", "Crushed coral"]$j$::jsonb, 3, 49, 'chemistry', $x$Crushed coral is made of calcium carbonate, which slowly dissolves and adds hardness. Driftwood and peat release tannins that soften water and lower pH.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What can you add to a filter to raise KH and GH slowly?$q$, array(select jsonb_array_elements_text($j$["Activated carbon", "Peat moss", "Driftwood", "Crushed coral"]$j$::jsonb)), 3, 49, 'chemistry', $x$Crushed coral is made of calcium carbonate, which slowly dissolves and adds hardness. Driftwood and peat release tannins that soften water and lower pH.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What does GH mostly measure?$q$, $j$["Calcium and magnesium", "Ammonia and nitrite", "Chlorine and chloramine", "Sodium and potassium"]$j$::jsonb, 0, 50, 'chemistry', $x$GH, or general hardness, measures dissolved calcium and magnesium. Fish, snails and plants all use these minerals.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What does GH mostly measure?$q$, array(select jsonb_array_elements_text($j$["Calcium and magnesium", "Ammonia and nitrite", "Chlorine and chloramine", "Sodium and potassium"]$j$::jsonb)), 0, 50, 'chemistry', $x$GH, or general hardness, measures dissolved calcium and magnesium. Fish, snails and plants all use these minerals.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why do snails need enough GH in the water?$q$, $j$["It stops them from climbing out of the tank", "It helps them see in dim light", "They use calcium to build their shells", "They need it in the water to breathe"]$j$::jsonb, 2, 51, 'chemistry', $x$Snail shells are built from calcium. In very soft water, shells can become thin, pitted or cracked.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why do snails need enough GH in the water?$q$, array(select jsonb_array_elements_text($j$["It stops them from climbing out of the tank", "It helps them see in dim light", "They use calcium to build their shells", "They need it in the water to breathe"]$j$::jsonb)), 2, 51, 'chemistry', $x$Snail shells are built from calcium. In very soft water, shells can become thin, pitted or cracked.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Guppies, mollies and platies naturally prefer:$q$, $j$["Harder water", "Acidic blackwater", "Pure distilled water", "Very soft water"]$j$::jsonb, 0, 52, 'chemistry', $x$Livebearers come from mineral-rich, harder water. Most farm-raised ones adapt, but they do best with some hardness.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Guppies, mollies and platies naturally prefer:$q$, array(select jsonb_array_elements_text($j$["Harder water", "Acidic blackwater", "Pure distilled water", "Very soft water"]$j$::jsonb)), 0, 52, 'chemistry', $x$Livebearers come from mineral-rich, harder water. Most farm-raised ones adapt, but they do best with some hardness.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is a common guideline for sizing an aquarium heater?$q$, $j$["About 50 watts for every gallon", "None; room temperature is warm enough", "About 1 watt for every 10 gallons", "About 3 to 5 watts per gallon"]$j$::jsonb, 3, 53, 'chemistry', $x$About 3 to 5 watts per gallon can hold most tanks at tropical temperatures, depending on how cool the room gets. A thermometer confirms it's working.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is a common guideline for sizing an aquarium heater?$q$, array(select jsonb_array_elements_text($j$["About 50 watts for every gallon", "None; room temperature is warm enough", "About 1 watt for every 10 gallons", "About 3 to 5 watts per gallon"]$j$::jsonb)), 3, 53, 'chemistry', $x$About 3 to 5 watts per gallon can hold most tanks at tropical temperatures, depending on how cool the room gets. A thermometer confirms it's working.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why might fish gasp at the surface on a very hot day?$q$, $j$["Bright summer light hurts their eyes", "The heat makes them hungrier than usual", "Warm water holds extra chlorine gas", "Warm water holds less dissolved oxygen"]$j$::jsonb, 3, 54, 'chemistry', $x$As water warms it holds less dissolved oxygen, while fish need more. Extra surface movement helps put oxygen back in.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why might fish gasp at the surface on a very hot day?$q$, array(select jsonb_array_elements_text($j$["Bright summer light hurts their eyes", "The heat makes them hungrier than usual", "Warm water holds extra chlorine gas", "Warm water holds less dissolved oxygen"]$j$::jsonb)), 3, 54, 'chemistry', $x$As water warms it holds less dissolved oxygen, while fish need more. Extra surface movement helps put oxygen back in.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What happens when a water conditioner treats chloramine?$q$, $j$["It turns the chloramine straight into harmless nitrate", "Nothing; water conditioners only work on plain chlorine, not chloramine", "It makes the chloramine gas off over a few days", "It splits it, leaving some ammonia that many products bind"]$j$::jsonb, 3, 55, 'chemistry', $x$Chloramine is chlorine bonded to ammonia. Breaking the bond removes the chlorine, and the leftover ammonia is held by many conditioners until filter bacteria use it.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What happens when a water conditioner treats chloramine?$q$, array(select jsonb_array_elements_text($j$["It turns the chloramine straight into harmless nitrate", "Nothing; water conditioners only work on plain chlorine, not chloramine", "It makes the chloramine gas off over a few days", "It splits it, leaving some ammonia that many products bind"]$j$::jsonb)), 3, 55, 'chemistry', $x$Chloramine is chlorine bonded to ammonia. Breaking the bond removes the chlorine, and the leftover ammonia is held by many conditioners until filter bacteria use it.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why isn't water from a home water softener a good fit for most aquariums?$q$, $j$["It adds extra chlorine to keep the pipes clean", "It adds ammonia from the softener's resin", "It strips out nearly all the dissolved oxygen", "It swaps calcium and magnesium for sodium"]$j$::jsonb, 3, 56, 'chemistry', $x$Softeners remove hardness by trading calcium and magnesium for sodium. Fish lose the minerals they need and get extra sodium they don't.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why isn't water from a home water softener a good fit for most aquariums?$q$, array(select jsonb_array_elements_text($j$["It adds extra chlorine to keep the pipes clean", "It adds ammonia from the softener's resin", "It strips out nearly all the dissolved oxygen", "It swaps calcium and magnesium for sodium"]$j$::jsonb)), 3, 56, 'chemistry', $x$Softeners remove hardness by trading calcium and magnesium for sodium. Fish lose the minerals they need and get extra sodium they don't.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is true about RO (reverse osmosis) water?$q$, $j$["It is ready for fish straight from the RO unit", "It's nearly pure, so minerals must be added back", "It is the same as tap water, just with chlorine removed", "It is much higher in minerals than tap water"]$j$::jsonb, 1, 57, 'chemistry', $x$RO strips out almost everything, including the minerals fish and plants need. It must be remineralized or mixed with tap water before use.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is true about RO (reverse osmosis) water?$q$, array(select jsonb_array_elements_text($j$["It is ready for fish straight from the RO unit", "It's nearly pure, so minerals must be added back", "It is the same as tap water, just with chlorine removed", "It is much higher in minerals than tap water"]$j$::jsonb)), 1, 57, 'chemistry', $x$RO strips out almost everything, including the minerals fish and plants need. It must be remineralized or mixed with tap water before use.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the main purpose of a daily look at your tank?$q$, $j$["It replaces the need for weekly water testing", "It's required before you can feed them each day", "To catch problems early, while they're easy to fix", "It trains your fish to recognize you as their owner"]$j$::jsonb, 2, 58, 'health', $x$Problems like a sick fish or a broken heater are much easier to fix in the first day than a few days later. A quick daily check catches them early.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the main purpose of a daily look at your tank?$q$, array(select jsonb_array_elements_text($j$["It replaces the need for weekly water testing", "It's required before you can feed them each day", "To catch problems early, while they're easy to fix", "It trains your fish to recognize you as their owner"]$j$::jsonb)), 2, 58, 'health', $x$Problems like a sick fish or a broken heater are much easier to fix in the first day than a few days later. A quick daily check catches them early.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is "flashing"?$q$, $j$["Flaring gills and fins to show off to fish of the same kind", "Jumping partway out of the water at the surface", "Rubbing or scraping against objects, often from irritation", "Changing color quickly at night while resting"]$j$::jsonb, 2, 59, 'health', $x$Fish flash to scratch irritated skin or gills. Parasites such as ich and poor water quality are common causes.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is "flashing"?$q$, array(select jsonb_array_elements_text($j$["Flaring gills and fins to show off to fish of the same kind", "Jumping partway out of the water at the surface", "Rubbing or scraping against objects, often from irritation", "Changing color quickly at night while resting"]$j$::jsonb)), 2, 59, 'health', $x$Fish flash to scratch irritated skin or gills. Parasites such as ich and poor water quality are common causes.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A fish looks sick. What should you do first?$q$, $j$["Test the water", "Add aquarium salt", "Move it to a bowl", "Add medicine"]$j$::jsonb, 0, 60, 'health', $x$Most fish illness starts with or is worsened by water problems. Testing first tells you what you're dealing with before you change anything.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A fish looks sick. What should you do first?$q$, array(select jsonb_array_elements_text($j$["Test the water", "Add aquarium salt", "Move it to a bowl", "Add medicine"]$j$::jsonb)), 0, 60, 'health', $x$Most fish illness starts with or is worsened by water problems. Testing first tells you what you're dealing with before you change anything.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Ammonia reads 1 ppm and a fish looks sick. What should come first?$q$, $j$["A water change to bring the ammonia down", "Add aquarium salt and wait a week to see", "Start an antibiotic so the fish fights it off", "Feed more often so the fish regains strength"]$j$::jsonb, 0, 61, 'health', $x$Ammonia burns gills and weakens fish, so medicine can't help until it is lowered. Many medicines also stress the filter bacteria, which would make ammonia worse.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Ammonia reads 1 ppm and a fish looks sick. What should come first?$q$, array(select jsonb_array_elements_text($j$["A water change to bring the ammonia down", "Add aquarium salt and wait a week to see", "Start an antibiotic so the fish fights it off", "Feed more often so the fish regains strength"]$j$::jsonb)), 0, 61, 'health', $x$Ammonia burns gills and weakens fish, so medicine can't help until it is lowered. Many medicines also stress the filter bacteria, which would make ammonia worse.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What does ich look like?$q$, $j$["Red streaks running through the fins and tail", "White cotton-like tufts on the body", "Scales sticking out like a pinecone", "Small white dots like grains of salt"]$j$::jsonb, 3, 62, 'health', $x$Ich shows up as tiny white spots, like sprinkled salt, on the body, fins and gills. Each spot is a parasite under the skin.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What does ich look like?$q$, array(select jsonb_array_elements_text($j$["Red streaks running through the fins and tail", "White cotton-like tufts on the body", "Scales sticking out like a pinecone", "Small white dots like grains of salt"]$j$::jsonb)), 3, 62, 'health', $x$Ich shows up as tiny white spots, like sprinkled salt, on the body, fins and gills. Each spot is a parasite under the skin.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which stage of the ich parasite do medicines actually kill?$q$, $j$["The free-swimming stage in the water", "The stage under the skin, as white spots", "Every stage equally, all at once", "Eggs carried inside the fish's body"]$j$::jsonb, 0, 63, 'health', $x$While the parasite sits under the fish's skin, it is protected from medicine. Treatment works on the young parasites swimming free in the water looking for a host.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which stage of the ich parasite do medicines actually kill?$q$, array(select jsonb_array_elements_text($j$["The free-swimming stage in the water", "The stage under the skin, as white spots", "Every stage equally, all at once", "Eggs carried inside the fish's body"]$j$::jsonb)), 0, 63, 'health', $x$While the parasite sits under the fish's skin, it is protected from medicine. Treatment works on the young parasites swimming free in the water looking for a host.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why keep treating ich for several days after the last spot disappears?$q$, $j$["It keeps the pH from dropping after treatment", "Leftover medicine prevents algae from growing back", "Extra medicine helps the fish heal its damaged skin and fins faster", "Unseen parasites off the fish can start a new wave"]$j$::jsonb, 3, 64, 'health', $x$When spots vanish, parasites may still be multiplying in cysts on the gravel and glass. Stopping early lets the next batch hatch and reinfect the fish.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why keep treating ich for several days after the last spot disappears?$q$, array(select jsonb_array_elements_text($j$["It keeps the pH from dropping after treatment", "Leftover medicine prevents algae from growing back", "Extra medicine helps the fish heal its damaged skin and fins faster", "Unseen parasites off the fish can start a new wave"]$j$::jsonb)), 3, 64, 'health', $x$When spots vanish, parasites may still be multiplying in cysts on the gravel and glass. Stopping early lets the next batch hatch and reinfect the fish.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why slowly raise the temperature to about 82 to 86°F when treating ich, if your fish can handle it?$q$, $j$["Heat kills all the bacteria in the tank", "Warm water lowers the pH, which harms the ich", "It makes the fish eat more and heal on its own", "It speeds up the parasite's life cycle"]$j$::jsonb, 3, 65, 'health', $x$Warmth moves the parasite to its free-swimming stage faster, so medicine reaches it sooner. Warm water holds less oxygen, so add surface movement too.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why slowly raise the temperature to about 82 to 86°F when treating ich, if your fish can handle it?$q$, array(select jsonb_array_elements_text($j$["Heat kills all the bacteria in the tank", "Warm water lowers the pH, which harms the ich", "It makes the fish eat more and heal on its own", "It speeds up the parasite's life cycle"]$j$::jsonb)), 3, 65, 'health', $x$Warmth moves the parasite to its free-swimming stage faster, so medicine reaches it sooner. Warm water holds less oxygen, so add surface movement too.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$When treating ich, which fish should you treat?$q$, $j$["None; ich clears by itself", "Only the newest fish added", "Only the fish with spots", "Every fish in the tank"]$j$::jsonb, 3, 66, 'health', $x$Every fish shares the same water, so all of them have been exposed even if spots haven't shown up yet.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$When treating ich, which fish should you treat?$q$, array(select jsonb_array_elements_text($j$["None; ich clears by itself", "Only the newest fish added", "Only the fish with spots", "Every fish in the tank"]$j$::jsonb)), 3, 66, 'health', $x$Every fish shares the same water, so all of them have been exposed even if spots haven't shown up yet.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Many ich medicines can harm which tank residents?$q$, $j$["Shrimp and snails", "Floating plants only", "Nothing in the tank", "Algae-eating fish only"]$j$::jsonb, 0, 67, 'health', $x$Some ich medicines contain ingredients like copper that are toxic to invertebrates. Read the label before dosing a tank with shrimp or snails.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Many ich medicines can harm which tank residents?$q$, array(select jsonb_array_elements_text($j$["Shrimp and snails", "Floating plants only", "Nothing in the tank", "Algae-eating fish only"]$j$::jsonb)), 0, 67, 'health', $x$Some ich medicines contain ingredients like copper that are toxic to invertebrates. Read the label before dosing a tank with shrimp or snails.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What usually triggers fin rot?$q$, $j$["Too much light over the tank", "Feeding flakes instead of pellets", "Poor water quality or stress", "Too many live plants"]$j$::jsonb, 2, 68, 'health', $x$Fin rot is a bacterial infection that takes hold when a fish's defenses are down. Poor water is the most common cause of that stress.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What usually triggers fin rot?$q$, array(select jsonb_array_elements_text($j$["Too much light over the tank", "Feeding flakes instead of pellets", "Poor water quality or stress", "Too many live plants"]$j$::jsonb)), 2, 68, 'health', $x$Fin rot is a bacterial infection that takes hold when a fish's defenses are down. Poor water is the most common cause of that stress.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A fish has white cottony tufts that don't improve after a few days of antifungal medicine. What could it be?$q$, $j$["Advanced ich, where the white spots have grown together", "Normal slime coat that's thicker than usual", "Algae that has started growing on the fish", "Columnaris, a bacteria that looks like fungus"]$j$::jsonb, 3, 69, 'health', $x$Columnaris is a bacterial infection that can look almost exactly like fungus. Antifungals don't work on bacteria, so it needs a different treatment.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A fish has white cottony tufts that don't improve after a few days of antifungal medicine. What could it be?$q$, array(select jsonb_array_elements_text($j$["Advanced ich, where the white spots have grown together", "Normal slime coat that's thicker than usual", "Algae that has started growing on the fish", "Columnaris, a bacteria that looks like fungus"]$j$::jsonb)), 3, 69, 'health', $x$Columnaris is a bacterial infection that can look almost exactly like fungus. Antifungals don't work on bacteria, so it needs a different treatment.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the warning sign of dropsy?$q$, $j$["Fast breathing and a pale color right after feeding", "Small white dots scattered across the fins and body", "Swollen belly with scales raised like a pinecone", "Ragged, torn fin edges that look slowly eaten away"]$j$::jsonb, 2, 70, 'health', $x$Fluid builds up inside the body and pushes the scales outward. It signals serious internal illness, such as organ failure, and many fish don't recover.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the warning sign of dropsy?$q$, array(select jsonb_array_elements_text($j$["Fast breathing and a pale color right after feeding", "Small white dots scattered across the fins and body", "Swollen belly with scales raised like a pinecone", "Ragged, torn fin edges that look slowly eaten away"]$j$::jsonb)), 2, 70, 'health', $x$Fluid builds up inside the body and pushes the scales outward. It signals serious internal illness, such as organ failure, and many fish don't recover.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your betta is bloated after being overfed. What is the best first step?$q$, $j$["Feed it a cooked, shelled pea right away", "Raise the temperature to about 90\u00b0F for a day", "Fast it 1 to 2 days, then feed smaller meals", "Feed it twice as much to keep its strength up"]$j$::jsonb, 2, 71, 'health', $x$A short fast gives its gut time to clear, and smaller meals prevent a repeat. Bettas are meat-eaters, so the pea trick used for plant-eating fish isn't a good fit.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your betta is bloated after being overfed. What is the best first step?$q$, array(select jsonb_array_elements_text($j$["Feed it a cooked, shelled pea right away", "Raise the temperature to about 90\u00b0F for a day", "Fast it 1 to 2 days, then feed smaller meals", "Feed it twice as much to keep its strength up"]$j$::jsonb)), 2, 71, 'health', $x$A short fast gives its gut time to clear, and smaller meals prevent a repeat. Bettas are meat-eaters, so the pea trick used for plant-eating fish isn't a good fit.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why remove activated carbon from the filter while medicating?$q$, $j$["Carbon heats the water when medicine is added", "Carbon pulls the medicine out of the water", "Carbon releases ammonia when it gets wet", "Carbon makes the medicine dangerously strong"]$j$::jsonb, 1, 72, 'health', $x$Activated carbon absorbs many chemicals, including medicines. Left in, it soaks up the dose before it can help the fish.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why remove activated carbon from the filter while medicating?$q$, array(select jsonb_array_elements_text($j$["Carbon heats the water when medicine is added", "Carbon pulls the medicine out of the water", "Carbon releases ammonia when it gets wet", "Carbon makes the medicine dangerously strong"]$j$::jsonb)), 1, 72, 'health', $x$Activated carbon absorbs many chemicals, including medicines. Left in, it soaks up the dose before it can help the fish.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How should you dose medicine in a hospital tank?$q$, $j$["By the actual amount of water in it", "By how many fish are being treated", "By the gallon size printed on the box", "Add extra beyond the label to be safe"]$j$::jsonb, 0, 73, 'health', $x$Gravel, decor and an unfilled top mean a tank holds less water than its label says. Dosing by the real volume prevents an accidental overdose.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How should you dose medicine in a hospital tank?$q$, array(select jsonb_array_elements_text($j$["By the actual amount of water in it", "By how many fish are being treated", "By the gallon size printed on the box", "Add extra beyond the label to be safe"]$j$::jsonb)), 0, 73, 'health', $x$Gravel, decor and an unfilled top mean a tank holds less water than its label says. Dosing by the real volume prevents an accidental overdose.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which is a sign of a healthy fish at the store?$q$, $j$["Hovering motionless near the surface", "Slightly cloudy eyes but a strong appetite", "Fins held tight and close against the body", "Clear eyes, open fins and eating eagerly"]$j$::jsonb, 3, 74, 'buying', $x$Healthy fish are alert, active and eager to eat. Clamped fins, cloudy eyes and listless hovering are all common signs of stress or illness.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which is a sign of a healthy fish at the store?$q$, array(select jsonb_array_elements_text($j$["Hovering motionless near the surface", "Slightly cloudy eyes but a strong appetite", "Fins held tight and close against the body", "Clear eyes, open fins and eating eagerly"]$j$::jsonb)), 3, 74, 'buying', $x$Healthy fish are alert, active and eager to eat. Clamped fins, cloudy eyes and listless hovering are all common signs of stress or illness.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$You notice a dead fish in the tank you want to buy from. What should you do?$q$, $j$["Ask for a discount and buy from it anyway", "Buy only the biggest and strongest-looking fish from that tank", "Buy quickly, before the others in it get sick too", "Skip that tank, since all its fish share the water"]$j$::jsonb, 3, 75, 'buying', $x$Whatever killed that fish may already be in the others, even the ones that look fine. Wait and check back later, or buy from a different tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$You notice a dead fish in the tank you want to buy from. What should you do?$q$, array(select jsonb_array_elements_text($j$["Ask for a discount and buy from it anyway", "Buy only the biggest and strongest-looking fish from that tank", "Buy quickly, before the others in it get sick too", "Skip that tank, since all its fish share the water"]$j$::jsonb)), 3, 75, 'buying', $x$Whatever killed that fish may already be in the others, even the ones that look fine. Wait and check back later, or buy from a different tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which is a good sign at a fish store?$q$, $j$["Staff happily sell you anything you point at, no questions asked", "Several tanks have cloudy water but low prices", "Staff ask about your tank and will say no to a bad fit", "No tanks are labeled, so you can ask about each one"]$j$::jsonb, 2, 76, 'buying', $x$A store that will turn down a sale to protect a fish cares about the fish surviving, not just about the sale.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which is a good sign at a fish store?$q$, array(select jsonb_array_elements_text($j$["Staff happily sell you anything you point at, no questions asked", "Several tanks have cloudy water but low prices", "Staff ask about your tank and will say no to a bad fit", "No tanks are labeled, so you can ask about each one"]$j$::jsonb)), 2, 76, 'buying', $x$A store that will turn down a sale to protect a fish cares about the fish surviving, not just about the sale.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why ask how long the store has had a fish?$q$, $j$["Fish expire after two weeks in store tanks", "Fish that just arrived are fresher and healthier than older stock", "New arrivals are stressed; settled fish are safer to buy", "Older stock is usually marked down"]$j$::jsonb, 2, 77, 'buying', $x$Shipping is hard on fish. After a week or more at the store, hidden problems have had time to show up there instead of in your tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why ask how long the store has had a fish?$q$, array(select jsonb_array_elements_text($j$["Fish expire after two weeks in store tanks", "Fish that just arrived are fresher and healthier than older stock", "New arrivals are stressed; settled fish are safer to buy", "Older stock is usually marked down"]$j$::jsonb)), 2, 77, 'buying', $x$Shipping is hard on fish. After a week or more at the store, hidden problems have had time to show up there instead of in your tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How do captive-bred fish usually compare with wild-caught fish?$q$, $j$["They grow much bigger than their wild relatives", "There's no real difference between the two", "They're usually hardier and used to tank water", "They usually carry more parasites than wild fish"]$j$::jsonb, 2, 78, 'buying', $x$Captive-bred fish have spent their whole lives in aquariums and eating prepared food, so they usually adapt more easily.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How do captive-bred fish usually compare with wild-caught fish?$q$, array(select jsonb_array_elements_text($j$["They grow much bigger than their wild relatives", "There's no real difference between the two", "They're usually hardier and used to tank water", "They usually carry more parasites than wild fish"]$j$::jsonb)), 2, 78, 'buying', $x$Captive-bred fish have spent their whole lives in aquariums and eating prepared food, so they usually adapt more easily.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the best plan for the trip home with new fish?$q$, $j$["Keep the bag on the dashboard where it stays warm", "Open the bag a little so the fish can breathe", "Run other errands first so the fish can settle", "Make it your last stop and keep the bag dark"]$j$::jsonb, 3, 79, 'buying', $x$A sealed bag has limited oxygen and changes temperature fast, so the trip should be short. Darkness keeps fish calm.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the best plan for the trip home with new fish?$q$, array(select jsonb_array_elements_text($j$["Keep the bag on the dashboard where it stays warm", "Open the bag a little so the fish can breathe", "Run other errands first so the fish can settle", "Make it your last stop and keep the bag dark"]$j$::jsonb)), 3, 79, 'buying', $x$A sealed bag has limited oxygen and changes temperature fast, so the trip should be short. Darkness keeps fish calm.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which acclimation method is gentlest for shrimp and sensitive fish?$q$, $j$["A slow drip of tank water over an hour or more", "A quick dip in cooler water to calm them", "Floating the bag for a single minute, then netting them out", "Pouring them in quickly to cut the stress"]$j$::jsonb, 0, 80, 'buying', $x$Dripping changes the water chemistry very gradually. Shrimp and sensitive fish can be harmed by even modest sudden changes.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which acclimation method is gentlest for shrimp and sensitive fish?$q$, array(select jsonb_array_elements_text($j$["A slow drip of tank water over an hour or more", "A quick dip in cooler water to calm them", "Floating the bag for a single minute, then netting them out", "Pouring them in quickly to cut the stress"]$j$::jsonb)), 0, 80, 'buying', $x$Dripping changes the water chemistry very gradually. Shrimp and sensitive fish can be harmed by even modest sudden changes.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How long should new fish usually stay in quarantine?$q$, $j$["About 1 hour", "About 1 to 2 days", "About 6 months or more", "About 2 to 4 weeks"]$j$::jsonb, 3, 81, 'buying', $x$Many diseases take days or weeks to show signs. Two to four weeks gives them time to appear in a tank where they're easy to treat.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How long should new fish usually stay in quarantine?$q$, array(select jsonb_array_elements_text($j$["About 1 hour", "About 1 to 2 days", "About 6 months or more", "About 2 to 4 weeks"]$j$::jsonb)), 3, 81, 'buying', $x$Many diseases take days or weeks to show signs. Two to four weeks gives them time to appear in a tank where they're easy to treat.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why quarantine fish that already look healthy?$q$, $j$["Most store fish are secretly sick", "Quarantine helps young fish grow faster", "Hidden parasites or bacteria may not show yet", "It's a legal requirement for home aquariums"]$j$::jsonb, 2, 82, 'buying', $x$A fish can carry a disease before it shows any signs. Quarantine lets that show up away from your main tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why quarantine fish that already look healthy?$q$, array(select jsonb_array_elements_text($j$["Most store fish are secretly sick", "Quarantine helps young fish grow faster", "Hidden parasites or bacteria may not show yet", "It's a legal requirement for home aquariums"]$j$::jsonb)), 2, 82, 'buying', $x$A fish can carry a disease before it shows any signs. Quarantine lets that show up away from your main tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What filter is best for a quarantine tank?$q$, $j$["No filter, so medicine stays in the water longer", "A sponge filter that has been running in your main tank", "A filter holding only activated carbon to clean the water", "A brand-new filter, still dry, straight out of the box"]$j$::jsonb, 1, 83, 'buying', $x$A sponge that has run in your main tank already carries beneficial bacteria, so the quarantine tank is cycled from day one. Sponges are also gentle and easy to clean.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What filter is best for a quarantine tank?$q$, array(select jsonb_array_elements_text($j$["No filter, so medicine stays in the water longer", "A sponge filter that has been running in your main tank", "A filter holding only activated carbon to clean the water", "A brand-new filter, still dry, straight out of the box"]$j$::jsonb)), 1, 83, 'buying', $x$A sponge that has run in your main tank already carries beneficial bacteria, so the quarantine tank is cycled from day one. Sponges are also gentle and easy to clean.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the main risk of adding new plants without checking them?$q$, $j$["Snails and other pests can hitchhike in", "New plants use up all the oxygen in a day", "Store plants make the water cloudy for months", "New plants can push the pH up to around 10"]$j$::jsonb, 0, 84, 'buying', $x$Pest snails, eggs and other hitchhikers often ride in on plants. Rinsing and inspecting them first keeps those out of your tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the main risk of adding new plants without checking them?$q$, array(select jsonb_array_elements_text($j$["Snails and other pests can hitchhike in", "New plants use up all the oxygen in a day", "Store plants make the water cloudy for months", "New plants can push the pH up to around 10"]$j$::jsonb)), 0, 84, 'buying', $x$Pest snails, eggs and other hitchhikers often ride in on plants. Rinsing and inspecting them first keeps those out of your tank.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why are fish from a local hobbyist often a good choice?$q$, $j$["Their fish are often raised in water like yours", "Their fish are free and come with a guarantee", "Their fish are immune to common diseases", "Their fish can safely skip quarantine since they're local"]$j$::jsonb, 0, 85, 'buying', $x$Fish raised on similar local tap water have less to adjust to. They should still be quarantined, since any fish can carry disease.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Why are fish from a local hobbyist often a good choice?$q$, array(select jsonb_array_elements_text($j$["Their fish are often raised in water like yours", "Their fish are free and come with a guarantee", "Their fish are immune to common diseases", "Their fish can safely skip quarantine since they're local"]$j$::jsonb)), 0, 85, 'buying', $x$Fish raised on similar local tap water have less to adjust to. They should still be quarantined, since any fish can carry disease.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How do live plants help water quality?$q$, $j$["They turn nitrate back into nitrite", "They add helpful ammonia to the water", "They raise oxygen enough to replace the filter", "They use ammonia and nitrate as food"]$j$::jsonb, 3, 86, 'plants', $x$Plants take up nitrogen waste as fertilizer, which helps keep the water cleaner between water changes.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How do live plants help water quality?$q$, array(select jsonb_array_elements_text($j$["They turn nitrate back into nitrite", "They add helpful ammonia to the water", "They raise oxygen enough to replace the filter", "They use ammonia and nitrate as food"]$j$::jsonb)), 3, 86, 'plants', $x$Plants take up nitrogen waste as fertilizer, which helps keep the water cleaner between water changes.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What do aquarium plants do at night?$q$, $j$["They make extra oxygen to store for day", "They stop all activity until lights come on", "They use a little oxygen, like fish do", "They release ammonia into the water"]$j$::jsonb, 2, 87, 'plants', $x$Plants make oxygen only when they have light. In the dark they keep living and breathing, so they use a small amount of oxygen.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What do aquarium plants do at night?$q$, array(select jsonb_array_elements_text($j$["They make extra oxygen to store for day", "They stop all activity until lights come on", "They use a little oxygen, like fish do", "They release ammonia into the water"]$j$::jsonb)), 2, 87, 'plants', $x$Plants make oxygen only when they have light. In the dark they keep living and breathing, so they use a small amount of oxygen.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How should java fern and anubias be planted?$q$, $j$["Tie them to wood or rock; don't bury the rhizome", "Let them float freely at the surface", "Plant the rhizome under the gravel with root tabs", "Bury the whole plant deep in the gravel"]$j$::jsonb, 0, 88, 'plants', $x$The rhizome is the thick stem the leaves grow from, and it can rot when buried. Attached to decor, the plant grows well.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$How should java fern and anubias be planted?$q$, array(select jsonb_array_elements_text($j$["Tie them to wood or rock; don't bury the rhizome", "Let them float freely at the surface", "Plant the rhizome under the gravel with root tabs", "Bury the whole plant deep in the gravel"]$j$::jsonb)), 0, 88, 'plants', $x$The rhizome is the thick stem the leaves grow from, and it can rot when buried. Attached to decor, the plant grows well.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your new cryptocoryne loses most of its leaves a week after planting. What is happening?$q$, $j$["A plant disease that will spread to every plant", "Crypt melt; it usually regrows from the roots", "The plant is dead and should be thrown away", "Fertilizer burn that the plant can't recover from"]$j$::jsonb, 1, 89, 'plants', $x$Crypts often drop their leaves when moved to new water conditions. If you leave the roots in place, new leaves usually grow back.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your new cryptocoryne loses most of its leaves a week after planting. What is happening?$q$, array(select jsonb_array_elements_text($j$["A plant disease that will spread to every plant", "Crypt melt; it usually regrows from the roots", "The plant is dead and should be thrown away", "Fertilizer burn that the plant can't recover from"]$j$::jsonb)), 1, 89, 'plants', $x$Crypts often drop their leaves when moved to new water conditions. If you leave the roots in place, new leaves usually grow back.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What can happen if floating plants cover the entire surface?$q$, $j$["Nothing; full cover only helps the tank", "They block light from the plants below", "They release toxins that harm small fish", "They raise ammonia as their roots grow"]$j$::jsonb, 1, 90, 'plants', $x$Floaters soak up nitrate, but a solid mat shades out everything underneath and can reduce surface gas exchange. Thin them out regularly.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What can happen if floating plants cover the entire surface?$q$, array(select jsonb_array_elements_text($j$["Nothing; full cover only helps the tank", "They block light from the plants below", "They release toxins that harm small fish", "They raise ammonia as their roots grow"]$j$::jsonb)), 1, 90, 'plants', $x$Floaters soak up nitrate, but a solid mat shades out everything underneath and can reduce surface gas exchange. Thin them out regularly.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$About how long should a planted tank's light be on each day?$q$, $j$["About 14 to 16 hours, like summer sun", "All 24 hours, so plants keep growing", "About 1 hour, to keep algae away", "About 6 to 8 hours, on a timer"]$j$::jsonb, 3, 91, 'plants', $x$Six to eight hours is enough for easy plants without giving algae extra time to grow. A timer keeps the schedule steady.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$About how long should a planted tank's light be on each day?$q$, array(select jsonb_array_elements_text($j$["About 14 to 16 hours, like summer sun", "All 24 hours, so plants keep growing", "About 1 hour, to keep algae away", "About 6 to 8 hours, on a timer"]$j$::jsonb)), 3, 91, 'plants', $x$Six to eight hours is enough for easy plants without giving algae extra time to grow. A timer keeps the schedule steady.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your plants are growing tall, thin and pale. What does that usually mean?$q$, $j$["They aren't getting enough light", "There is too much CO2 in the water", "There are too many fish for the plants", "They are getting far too much light"]$j$::jsonb, 0, 92, 'plants', $x$Plants stretch toward the light when there isn't enough of it, which makes them leggy and pale.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Your plants are growing tall, thin and pale. What does that usually mean?$q$, array(select jsonb_array_elements_text($j$["They aren't getting enough light", "There is too much CO2 in the water", "There are too many fish for the plants", "They are getting far too much light"]$j$::jsonb)), 0, 92, 'plants', $x$Plants stretch toward the light when there isn't enough of it, which makes them leggy and pale.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which group of plants feeds mostly through its roots?$q$, $j$["Java fern, anubias and java moss", "Hornwort, java moss and anacharis", "Floating frogbit, salvinia and red root floaters", "Amazon sword, cryptocorynes and vallisneria"]$j$::jsonb, 3, 93, 'plants', $x$Swords, crypts and vals pull most of their food from the substrate. The others take most of their nutrients from the water.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which group of plants feeds mostly through its roots?$q$, array(select jsonb_array_elements_text($j$["Java fern, anubias and java moss", "Hornwort, java moss and anacharis", "Floating frogbit, salvinia and red root floaters", "Amazon sword, cryptocorynes and vallisneria"]$j$::jsonb)), 3, 93, 'plants', $x$Swords, crypts and vals pull most of their food from the substrate. The others take most of their nutrients from the water.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What are root tabs?$q$, $j$["Slow-release tablets that kill algae around plant roots", "Small weights that hold new plants down", "Fertilizer capsules pushed into the substrate", "Sinking food tablets for bottom fish"]$j$::jsonb, 2, 94, 'plants', $x$Root tabs release nutrients into the substrate where root-feeding plants can reach them, even in plain gravel.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What are root tabs?$q$, array(select jsonb_array_elements_text($j$["Slow-release tablets that kill algae around plant roots", "Small weights that hold new plants down", "Fertilizer capsules pushed into the substrate", "Sinking food tablets for bottom fish"]$j$::jsonb)), 2, 94, 'plants', $x$Root tabs release nutrients into the substrate where root-feeding plants can reach them, even in plain gravel.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$When do you usually need to add CO2?$q$, $j$["For fast-growing plants under strong light", "For java fern and anubias in low light", "Whenever the tank holds more than a handful of fish", "For every planted tank, always"]$j$::jsonb, 0, 95, 'plants', $x$Strong light makes plants grow fast and use CO2 quickly. Easy, low-light plants get enough from fish and the air.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$When do you usually need to add CO2?$q$, array(select jsonb_array_elements_text($j$["For fast-growing plants under strong light", "For java fern and anubias in low light", "Whenever the tank holds more than a handful of fish", "For every planted tank, always"]$j$::jsonb)), 0, 95, 'plants', $x$Strong light makes plants grow fast and use CO2 quickly. Easy, low-light plants get enough from fish and the air.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Older plant leaves are turning yellow. What does that usually point to?$q$, $j$["The plant is short on nutrients", "There is far too much CO2", "The plant is healthy and growing", "The water is a little too cold"]$j$::jsonb, 0, 96, 'plants', $x$When a plant runs short on some nutrients, it pulls them from older leaves to feed new growth, so the old leaves yellow first.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Older plant leaves are turning yellow. What does that usually point to?$q$, array(select jsonb_array_elements_text($j$["The plant is short on nutrients", "There is far too much CO2", "The plant is healthy and growing", "The water is a little too cold"]$j$::jsonb)), 0, 96, 'plants', $x$When a plant runs short on some nutrients, it pulls them from older leaves to feed new growth, so the old leaves yellow first.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A three-week-old tank has brown dust on the glass and decor. What is it?$q$, $j$["Green spot algae from too much light", "Black beard algae that needs chemical treatment", "Diatoms, which usually fade on their own", "A fish disease shed from the gills"]$j$::jsonb, 2, 97, 'plants', $x$Diatoms are a brown film that is very common in new tanks. They usually disappear within the first month or two as the tank settles.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$A three-week-old tank has brown dust on the glass and decor. What is it?$q$, array(select jsonb_array_elements_text($j$["Green spot algae from too much light", "Black beard algae that needs chemical treatment", "Diatoms, which usually fade on their own", "A fish disease shed from the gills"]$j$::jsonb)), 2, 97, 'plants', $x$Diatoms are a brown film that is very common in new tanks. They usually disappear within the first month or two as the tank settles.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which tank resident is best known for eating hair algae?$q$, $j$["Fancy goldfish", "Amano shrimp", "Oscar", "Betta"]$j$::jsonb, 1, 98, 'plants', $x$Amano shrimp graze constantly and are among the best cleaners of hair algae. The others are not algae eaters.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$Which tank resident is best known for eating hair algae?$q$, array(select jsonb_array_elements_text($j$["Fancy goldfish", "Amano shrimp", "Oscar", "Betta"]$j$::jsonb)), 1, 98, 'plants', $x$Amano shrimp graze constantly and are among the best cleaners of hair algae. The others are not algae eaters.$x$);
    end if;
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the right way to fix an algae problem?$q$, $j$["Change light, feeding and fertilizer all at once to fix it fast", "Dose an algae chemical every single day", "Turn off the filter so algae can't spread", "Change one thing at a time and wait a week or two"]$j$::jsonb, 3, 99, 'plants', $x$Algae responds slowly. Changing one thing at a time shows you what actually worked and avoids shocking the tank.$x$);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
      values (sid, $q$What is the right way to fix an algae problem?$q$, array(select jsonb_array_elements_text($j$["Change light, feeding and fertilizer all at once to fix it fast", "Dose an algae chemical every single day", "Turn off the filter so algae can't spread", "Change one thing at a time and wait a week or two"]$j$::jsonb)), 3, 99, 'plants', $x$Algae responds slowly. Changing one thing at a time shows you what actually worked and avoids shocking the tank.$x$);
    end if;

    raise notice 'Foundations Mastery created';
  else
    raise notice 'Foundations Mastery already exists, questions left as they are';
  end if;

  -- Mastery questions are invisible to the public; the exam page reads them
  -- server-side only once a member has unlocked the exam.
  select relrowsecurity into has_rls from pg_class where oid = 'public.course_questions'::regclass;
  if has_rls then
    execute 'drop policy if exists "hide mastery questions" on public.course_questions';
    execute $p$
      create policy "hide mastery questions" on public.course_questions
      as restrictive for select to anon, authenticated
      using (section_id not in (
        select s.id from public.course_sections s
        join public.courses c on c.id = s.course_id
        where c.slug = 'foundations-mastery'
      ))
    $p$;
  end if;
end
$do$;

select c.title, c.pass_percent,
       (select count(*) from public.course_questions q join public.course_sections s on s.id = q.section_id where s.course_id = c.id) as questions
from public.courses c
where c.slug = 'foundations-mastery';
