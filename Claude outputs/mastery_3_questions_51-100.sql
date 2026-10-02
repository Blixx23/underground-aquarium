-- STEP 3 of 3. Foundations Mastery questions 51 to 100. Run after step 1. Safe to run again.
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

  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What does GH mostly measure?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What does GH mostly measure?$q$, $j$["Calcium and magnesium", "Ammonia and nitrite", "Chlorine and chloramine", "Sodium and potassium"]$j$::jsonb, 0, 50, 'chemistry', $x$GH, or general hardness, measures dissolved calcium and magnesium. Fish, snails and plants all use these minerals.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What does GH mostly measure?$q$, array(select jsonb_array_elements_text($j$["Calcium and magnesium", "Ammonia and nitrite", "Chlorine and chloramine", "Sodium and potassium"]$j$::jsonb)), 0, 50, 'chemistry', $x$GH, or general hardness, measures dissolved calcium and magnesium. Fish, snails and plants all use these minerals.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why do snails need enough GH in the water?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why do snails need enough GH in the water?$q$, $j$["It stops them from climbing out of the tank", "It helps them see in dim light", "They use calcium to build their shells", "They need it in the water to breathe"]$j$::jsonb, 2, 51, 'chemistry', $x$Snail shells are built from calcium. In very soft water, shells can become thin, pitted or cracked.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why do snails need enough GH in the water?$q$, array(select jsonb_array_elements_text($j$["It stops them from climbing out of the tank", "It helps them see in dim light", "They use calcium to build their shells", "They need it in the water to breathe"]$j$::jsonb)), 2, 51, 'chemistry', $x$Snail shells are built from calcium. In very soft water, shells can become thin, pitted or cracked.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Guppies, mollies and platies naturally prefer:$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Guppies, mollies and platies naturally prefer:$q$, $j$["Harder water", "Acidic blackwater", "Pure distilled water", "Very soft water"]$j$::jsonb, 0, 52, 'chemistry', $x$Livebearers come from mineral-rich, harder water. Most farm-raised ones adapt, but they do best with some hardness.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Guppies, mollies and platies naturally prefer:$q$, array(select jsonb_array_elements_text($j$["Harder water", "Acidic blackwater", "Pure distilled water", "Very soft water"]$j$::jsonb)), 0, 52, 'chemistry', $x$Livebearers come from mineral-rich, harder water. Most farm-raised ones adapt, but they do best with some hardness.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is a common guideline for sizing an aquarium heater?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is a common guideline for sizing an aquarium heater?$q$, $j$["About 50 watts for every gallon", "None; room temperature is warm enough", "About 1 watt for every 10 gallons", "About 3 to 5 watts per gallon"]$j$::jsonb, 3, 53, 'chemistry', $x$About 3 to 5 watts per gallon can hold most tanks at tropical temperatures, depending on how cool the room gets. A thermometer confirms it's working.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is a common guideline for sizing an aquarium heater?$q$, array(select jsonb_array_elements_text($j$["About 50 watts for every gallon", "None; room temperature is warm enough", "About 1 watt for every 10 gallons", "About 3 to 5 watts per gallon"]$j$::jsonb)), 3, 53, 'chemistry', $x$About 3 to 5 watts per gallon can hold most tanks at tropical temperatures, depending on how cool the room gets. A thermometer confirms it's working.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why might fish gasp at the surface on a very hot day?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why might fish gasp at the surface on a very hot day?$q$, $j$["Bright summer light hurts their eyes", "The heat makes them hungrier than usual", "Warm water holds extra chlorine gas", "Warm water holds less dissolved oxygen"]$j$::jsonb, 3, 54, 'chemistry', $x$As water warms it holds less dissolved oxygen, while fish need more. Extra surface movement helps put oxygen back in.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why might fish gasp at the surface on a very hot day?$q$, array(select jsonb_array_elements_text($j$["Bright summer light hurts their eyes", "The heat makes them hungrier than usual", "Warm water holds extra chlorine gas", "Warm water holds less dissolved oxygen"]$j$::jsonb)), 3, 54, 'chemistry', $x$As water warms it holds less dissolved oxygen, while fish need more. Extra surface movement helps put oxygen back in.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What happens when a water conditioner treats chloramine?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What happens when a water conditioner treats chloramine?$q$, $j$["It turns the chloramine straight into harmless nitrate", "Nothing; water conditioners only work on plain chlorine, not chloramine", "It makes the chloramine gas off over a few days", "It splits it, leaving some ammonia that many products bind"]$j$::jsonb, 3, 55, 'chemistry', $x$Chloramine is chlorine bonded to ammonia. Breaking the bond removes the chlorine, and the leftover ammonia is held by many conditioners until filter bacteria use it.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What happens when a water conditioner treats chloramine?$q$, array(select jsonb_array_elements_text($j$["It turns the chloramine straight into harmless nitrate", "Nothing; water conditioners only work on plain chlorine, not chloramine", "It makes the chloramine gas off over a few days", "It splits it, leaving some ammonia that many products bind"]$j$::jsonb)), 3, 55, 'chemistry', $x$Chloramine is chlorine bonded to ammonia. Breaking the bond removes the chlorine, and the leftover ammonia is held by many conditioners until filter bacteria use it.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why isn't water from a home water softener a good fit for most aquariums?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why isn't water from a home water softener a good fit for most aquariums?$q$, $j$["It adds extra chlorine to keep the pipes clean", "It adds ammonia from the softener's resin", "It strips out nearly all the dissolved oxygen", "It swaps calcium and magnesium for sodium"]$j$::jsonb, 3, 56, 'chemistry', $x$Softeners remove hardness by trading calcium and magnesium for sodium. Fish lose the minerals they need and get extra sodium they don't.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why isn't water from a home water softener a good fit for most aquariums?$q$, array(select jsonb_array_elements_text($j$["It adds extra chlorine to keep the pipes clean", "It adds ammonia from the softener's resin", "It strips out nearly all the dissolved oxygen", "It swaps calcium and magnesium for sodium"]$j$::jsonb)), 3, 56, 'chemistry', $x$Softeners remove hardness by trading calcium and magnesium for sodium. Fish lose the minerals they need and get extra sodium they don't.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is true about RO (reverse osmosis) water?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is true about RO (reverse osmosis) water?$q$, $j$["It is ready for fish straight from the RO unit", "It's nearly pure, so minerals must be added back", "It is the same as tap water, just with chlorine removed", "It is much higher in minerals than tap water"]$j$::jsonb, 1, 57, 'chemistry', $x$RO strips out almost everything, including the minerals fish and plants need. It must be remineralized or mixed with tap water before use.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is true about RO (reverse osmosis) water?$q$, array(select jsonb_array_elements_text($j$["It is ready for fish straight from the RO unit", "It's nearly pure, so minerals must be added back", "It is the same as tap water, just with chlorine removed", "It is much higher in minerals than tap water"]$j$::jsonb)), 1, 57, 'chemistry', $x$RO strips out almost everything, including the minerals fish and plants need. It must be remineralized or mixed with tap water before use.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the main purpose of a daily look at your tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the main purpose of a daily look at your tank?$q$, $j$["It replaces the need for weekly water testing", "It's required before you can feed them each day", "To catch problems early, while they're easy to fix", "It trains your fish to recognize you as their owner"]$j$::jsonb, 2, 58, 'health', $x$Problems like a sick fish or a broken heater are much easier to fix in the first day than a few days later. A quick daily check catches them early.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the main purpose of a daily look at your tank?$q$, array(select jsonb_array_elements_text($j$["It replaces the need for weekly water testing", "It's required before you can feed them each day", "To catch problems early, while they're easy to fix", "It trains your fish to recognize you as their owner"]$j$::jsonb)), 2, 58, 'health', $x$Problems like a sick fish or a broken heater are much easier to fix in the first day than a few days later. A quick daily check catches them early.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is "flashing"?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is "flashing"?$q$, $j$["Flaring gills and fins to show off to fish of the same kind", "Jumping partway out of the water at the surface", "Rubbing or scraping against objects, often from irritation", "Changing color quickly at night while resting"]$j$::jsonb, 2, 59, 'health', $x$Fish flash to scratch irritated skin or gills. Parasites such as ich and poor water quality are common causes.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is "flashing"?$q$, array(select jsonb_array_elements_text($j$["Flaring gills and fins to show off to fish of the same kind", "Jumping partway out of the water at the surface", "Rubbing or scraping against objects, often from irritation", "Changing color quickly at night while resting"]$j$::jsonb)), 2, 59, 'health', $x$Fish flash to scratch irritated skin or gills. Parasites such as ich and poor water quality are common causes.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$A fish looks sick. What should you do first?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A fish looks sick. What should you do first?$q$, $j$["Test the water", "Add aquarium salt", "Move it to a bowl", "Add medicine"]$j$::jsonb, 0, 60, 'health', $x$Most fish illness starts with or is worsened by water problems. Testing first tells you what you're dealing with before you change anything.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A fish looks sick. What should you do first?$q$, array(select jsonb_array_elements_text($j$["Test the water", "Add aquarium salt", "Move it to a bowl", "Add medicine"]$j$::jsonb)), 0, 60, 'health', $x$Most fish illness starts with or is worsened by water problems. Testing first tells you what you're dealing with before you change anything.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Ammonia reads 1 ppm and a fish looks sick. What should come first?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Ammonia reads 1 ppm and a fish looks sick. What should come first?$q$, $j$["A water change to bring the ammonia down", "Add aquarium salt and wait a week to see", "Start an antibiotic so the fish fights it off", "Feed more often so the fish regains strength"]$j$::jsonb, 0, 61, 'health', $x$Ammonia burns gills and weakens fish, so medicine can't help until it is lowered. Many medicines also stress the filter bacteria, which would make ammonia worse.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Ammonia reads 1 ppm and a fish looks sick. What should come first?$q$, array(select jsonb_array_elements_text($j$["A water change to bring the ammonia down", "Add aquarium salt and wait a week to see", "Start an antibiotic so the fish fights it off", "Feed more often so the fish regains strength"]$j$::jsonb)), 0, 61, 'health', $x$Ammonia burns gills and weakens fish, so medicine can't help until it is lowered. Many medicines also stress the filter bacteria, which would make ammonia worse.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What does ich look like?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What does ich look like?$q$, $j$["Red streaks running through the fins and tail", "White cotton-like tufts on the body", "Scales sticking out like a pinecone", "Small white dots like grains of salt"]$j$::jsonb, 3, 62, 'health', $x$Ich shows up as tiny white spots, like sprinkled salt, on the body, fins and gills. Each spot is a parasite under the skin.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What does ich look like?$q$, array(select jsonb_array_elements_text($j$["Red streaks running through the fins and tail", "White cotton-like tufts on the body", "Scales sticking out like a pinecone", "Small white dots like grains of salt"]$j$::jsonb)), 3, 62, 'health', $x$Ich shows up as tiny white spots, like sprinkled salt, on the body, fins and gills. Each spot is a parasite under the skin.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which stage of the ich parasite do medicines actually kill?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which stage of the ich parasite do medicines actually kill?$q$, $j$["The free-swimming stage in the water", "The stage under the skin, as white spots", "Every stage equally, all at once", "Eggs carried inside the fish's body"]$j$::jsonb, 0, 63, 'health', $x$While the parasite sits under the fish's skin, it is protected from medicine. Treatment works on the young parasites swimming free in the water looking for a host.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which stage of the ich parasite do medicines actually kill?$q$, array(select jsonb_array_elements_text($j$["The free-swimming stage in the water", "The stage under the skin, as white spots", "Every stage equally, all at once", "Eggs carried inside the fish's body"]$j$::jsonb)), 0, 63, 'health', $x$While the parasite sits under the fish's skin, it is protected from medicine. Treatment works on the young parasites swimming free in the water looking for a host.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why keep treating ich for several days after the last spot disappears?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why keep treating ich for several days after the last spot disappears?$q$, $j$["It keeps the pH from dropping after treatment", "Leftover medicine prevents algae from growing back", "Extra medicine helps the fish heal its damaged skin and fins faster", "Unseen parasites off the fish can start a new wave"]$j$::jsonb, 3, 64, 'health', $x$When spots vanish, parasites may still be multiplying in cysts on the gravel and glass. Stopping early lets the next batch hatch and reinfect the fish.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why keep treating ich for several days after the last spot disappears?$q$, array(select jsonb_array_elements_text($j$["It keeps the pH from dropping after treatment", "Leftover medicine prevents algae from growing back", "Extra medicine helps the fish heal its damaged skin and fins faster", "Unseen parasites off the fish can start a new wave"]$j$::jsonb)), 3, 64, 'health', $x$When spots vanish, parasites may still be multiplying in cysts on the gravel and glass. Stopping early lets the next batch hatch and reinfect the fish.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why slowly raise the temperature to about 82 to 86°F when treating ich, if your fish can handle it?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why slowly raise the temperature to about 82 to 86°F when treating ich, if your fish can handle it?$q$, $j$["Heat kills all the bacteria in the tank", "Warm water lowers the pH, which harms the ich", "It makes the fish eat more and heal on its own", "It speeds up the parasite's life cycle"]$j$::jsonb, 3, 65, 'health', $x$Warmth moves the parasite to its free-swimming stage faster, so medicine reaches it sooner. Warm water holds less oxygen, so add surface movement too.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why slowly raise the temperature to about 82 to 86°F when treating ich, if your fish can handle it?$q$, array(select jsonb_array_elements_text($j$["Heat kills all the bacteria in the tank", "Warm water lowers the pH, which harms the ich", "It makes the fish eat more and heal on its own", "It speeds up the parasite's life cycle"]$j$::jsonb)), 3, 65, 'health', $x$Warmth moves the parasite to its free-swimming stage faster, so medicine reaches it sooner. Warm water holds less oxygen, so add surface movement too.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$When treating ich, which fish should you treat?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$When treating ich, which fish should you treat?$q$, $j$["None; ich clears by itself", "Only the newest fish added", "Only the fish with spots", "Every fish in the tank"]$j$::jsonb, 3, 66, 'health', $x$Every fish shares the same water, so all of them have been exposed even if spots haven't shown up yet.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$When treating ich, which fish should you treat?$q$, array(select jsonb_array_elements_text($j$["None; ich clears by itself", "Only the newest fish added", "Only the fish with spots", "Every fish in the tank"]$j$::jsonb)), 3, 66, 'health', $x$Every fish shares the same water, so all of them have been exposed even if spots haven't shown up yet.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Many ich medicines can harm which tank residents?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Many ich medicines can harm which tank residents?$q$, $j$["Shrimp and snails", "Floating plants only", "Nothing in the tank", "Algae-eating fish only"]$j$::jsonb, 0, 67, 'health', $x$Some ich medicines contain ingredients like copper that are toxic to invertebrates. Read the label before dosing a tank with shrimp or snails.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Many ich medicines can harm which tank residents?$q$, array(select jsonb_array_elements_text($j$["Shrimp and snails", "Floating plants only", "Nothing in the tank", "Algae-eating fish only"]$j$::jsonb)), 0, 67, 'health', $x$Some ich medicines contain ingredients like copper that are toxic to invertebrates. Read the label before dosing a tank with shrimp or snails.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What usually triggers fin rot?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What usually triggers fin rot?$q$, $j$["Too much light over the tank", "Feeding flakes instead of pellets", "Poor water quality or stress", "Too many live plants"]$j$::jsonb, 2, 68, 'health', $x$Fin rot is a bacterial infection that takes hold when a fish's defenses are down. Poor water is the most common cause of that stress.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What usually triggers fin rot?$q$, array(select jsonb_array_elements_text($j$["Too much light over the tank", "Feeding flakes instead of pellets", "Poor water quality or stress", "Too many live plants"]$j$::jsonb)), 2, 68, 'health', $x$Fin rot is a bacterial infection that takes hold when a fish's defenses are down. Poor water is the most common cause of that stress.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$A fish has white cottony tufts that don't improve after a few days of antifungal medicine. What could it be?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A fish has white cottony tufts that don't improve after a few days of antifungal medicine. What could it be?$q$, $j$["Advanced ich, where the white spots have grown together", "Normal slime coat that's thicker than usual", "Algae that has started growing on the fish", "Columnaris, a bacteria that looks like fungus"]$j$::jsonb, 3, 69, 'health', $x$Columnaris is a bacterial infection that can look almost exactly like fungus. Antifungals don't work on bacteria, so it needs a different treatment.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A fish has white cottony tufts that don't improve after a few days of antifungal medicine. What could it be?$q$, array(select jsonb_array_elements_text($j$["Advanced ich, where the white spots have grown together", "Normal slime coat that's thicker than usual", "Algae that has started growing on the fish", "Columnaris, a bacteria that looks like fungus"]$j$::jsonb)), 3, 69, 'health', $x$Columnaris is a bacterial infection that can look almost exactly like fungus. Antifungals don't work on bacteria, so it needs a different treatment.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the warning sign of dropsy?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the warning sign of dropsy?$q$, $j$["Fast breathing and a pale color right after feeding", "Small white dots scattered across the fins and body", "Swollen belly with scales raised like a pinecone", "Ragged, torn fin edges that look slowly eaten away"]$j$::jsonb, 2, 70, 'health', $x$Fluid builds up inside the body and pushes the scales outward. It signals serious internal illness, such as organ failure, and many fish don't recover.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the warning sign of dropsy?$q$, array(select jsonb_array_elements_text($j$["Fast breathing and a pale color right after feeding", "Small white dots scattered across the fins and body", "Swollen belly with scales raised like a pinecone", "Ragged, torn fin edges that look slowly eaten away"]$j$::jsonb)), 2, 70, 'health', $x$Fluid builds up inside the body and pushes the scales outward. It signals serious internal illness, such as organ failure, and many fish don't recover.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your betta is bloated after being overfed. What is the best first step?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your betta is bloated after being overfed. What is the best first step?$q$, $j$["Feed it a cooked, shelled pea right away", "Raise the temperature to about 90\u00b0F for a day", "Fast it 1 to 2 days, then feed smaller meals", "Feed it twice as much to keep its strength up"]$j$::jsonb, 2, 71, 'health', $x$A short fast gives its gut time to clear, and smaller meals prevent a repeat. Bettas are meat-eaters, so the pea trick used for plant-eating fish isn't a good fit.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your betta is bloated after being overfed. What is the best first step?$q$, array(select jsonb_array_elements_text($j$["Feed it a cooked, shelled pea right away", "Raise the temperature to about 90\u00b0F for a day", "Fast it 1 to 2 days, then feed smaller meals", "Feed it twice as much to keep its strength up"]$j$::jsonb)), 2, 71, 'health', $x$A short fast gives its gut time to clear, and smaller meals prevent a repeat. Bettas are meat-eaters, so the pea trick used for plant-eating fish isn't a good fit.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why remove activated carbon from the filter while medicating?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why remove activated carbon from the filter while medicating?$q$, $j$["Carbon heats the water when medicine is added", "Carbon pulls the medicine out of the water", "Carbon releases ammonia when it gets wet", "Carbon makes the medicine dangerously strong"]$j$::jsonb, 1, 72, 'health', $x$Activated carbon absorbs many chemicals, including medicines. Left in, it soaks up the dose before it can help the fish.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why remove activated carbon from the filter while medicating?$q$, array(select jsonb_array_elements_text($j$["Carbon heats the water when medicine is added", "Carbon pulls the medicine out of the water", "Carbon releases ammonia when it gets wet", "Carbon makes the medicine dangerously strong"]$j$::jsonb)), 1, 72, 'health', $x$Activated carbon absorbs many chemicals, including medicines. Left in, it soaks up the dose before it can help the fish.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How should you dose medicine in a hospital tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How should you dose medicine in a hospital tank?$q$, $j$["By the actual amount of water in it", "By how many fish are being treated", "By the gallon size printed on the box", "Add extra beyond the label to be safe"]$j$::jsonb, 0, 73, 'health', $x$Gravel, decor and an unfilled top mean a tank holds less water than its label says. Dosing by the real volume prevents an accidental overdose.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How should you dose medicine in a hospital tank?$q$, array(select jsonb_array_elements_text($j$["By the actual amount of water in it", "By how many fish are being treated", "By the gallon size printed on the box", "Add extra beyond the label to be safe"]$j$::jsonb)), 0, 73, 'health', $x$Gravel, decor and an unfilled top mean a tank holds less water than its label says. Dosing by the real volume prevents an accidental overdose.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which is a sign of a healthy fish at the store?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which is a sign of a healthy fish at the store?$q$, $j$["Hovering motionless near the surface", "Slightly cloudy eyes but a strong appetite", "Fins held tight and close against the body", "Clear eyes, open fins and eating eagerly"]$j$::jsonb, 3, 74, 'buying', $x$Healthy fish are alert, active and eager to eat. Clamped fins, cloudy eyes and listless hovering are all common signs of stress or illness.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which is a sign of a healthy fish at the store?$q$, array(select jsonb_array_elements_text($j$["Hovering motionless near the surface", "Slightly cloudy eyes but a strong appetite", "Fins held tight and close against the body", "Clear eyes, open fins and eating eagerly"]$j$::jsonb)), 3, 74, 'buying', $x$Healthy fish are alert, active and eager to eat. Clamped fins, cloudy eyes and listless hovering are all common signs of stress or illness.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$You notice a dead fish in the tank you want to buy from. What should you do?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$You notice a dead fish in the tank you want to buy from. What should you do?$q$, $j$["Ask for a discount and buy from it anyway", "Buy only the biggest and strongest-looking fish from that tank", "Buy quickly, before the others in it get sick too", "Skip that tank, since all its fish share the water"]$j$::jsonb, 3, 75, 'buying', $x$Whatever killed that fish may already be in the others, even the ones that look fine. Wait and check back later, or buy from a different tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$You notice a dead fish in the tank you want to buy from. What should you do?$q$, array(select jsonb_array_elements_text($j$["Ask for a discount and buy from it anyway", "Buy only the biggest and strongest-looking fish from that tank", "Buy quickly, before the others in it get sick too", "Skip that tank, since all its fish share the water"]$j$::jsonb)), 3, 75, 'buying', $x$Whatever killed that fish may already be in the others, even the ones that look fine. Wait and check back later, or buy from a different tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which is a good sign at a fish store?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which is a good sign at a fish store?$q$, $j$["Staff happily sell you anything you point at, no questions asked", "Several tanks have cloudy water but low prices", "Staff ask about your tank and will say no to a bad fit", "No tanks are labeled, so you can ask about each one"]$j$::jsonb, 2, 76, 'buying', $x$A store that will turn down a sale to protect a fish cares about the fish surviving, not just about the sale.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which is a good sign at a fish store?$q$, array(select jsonb_array_elements_text($j$["Staff happily sell you anything you point at, no questions asked", "Several tanks have cloudy water but low prices", "Staff ask about your tank and will say no to a bad fit", "No tanks are labeled, so you can ask about each one"]$j$::jsonb)), 2, 76, 'buying', $x$A store that will turn down a sale to protect a fish cares about the fish surviving, not just about the sale.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why ask how long the store has had a fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why ask how long the store has had a fish?$q$, $j$["Fish expire after two weeks in store tanks", "Fish that just arrived are fresher and healthier than older stock", "New arrivals are stressed; settled fish are safer to buy", "Older stock is usually marked down"]$j$::jsonb, 2, 77, 'buying', $x$Shipping is hard on fish. After a week or more at the store, hidden problems have had time to show up there instead of in your tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why ask how long the store has had a fish?$q$, array(select jsonb_array_elements_text($j$["Fish expire after two weeks in store tanks", "Fish that just arrived are fresher and healthier than older stock", "New arrivals are stressed; settled fish are safer to buy", "Older stock is usually marked down"]$j$::jsonb)), 2, 77, 'buying', $x$Shipping is hard on fish. After a week or more at the store, hidden problems have had time to show up there instead of in your tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How do captive-bred fish usually compare with wild-caught fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How do captive-bred fish usually compare with wild-caught fish?$q$, $j$["They grow much bigger than their wild relatives", "There's no real difference between the two", "They're usually hardier and used to tank water", "They usually carry more parasites than wild fish"]$j$::jsonb, 2, 78, 'buying', $x$Captive-bred fish have spent their whole lives in aquariums and eating prepared food, so they usually adapt more easily.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How do captive-bred fish usually compare with wild-caught fish?$q$, array(select jsonb_array_elements_text($j$["They grow much bigger than their wild relatives", "There's no real difference between the two", "They're usually hardier and used to tank water", "They usually carry more parasites than wild fish"]$j$::jsonb)), 2, 78, 'buying', $x$Captive-bred fish have spent their whole lives in aquariums and eating prepared food, so they usually adapt more easily.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the best plan for the trip home with new fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the best plan for the trip home with new fish?$q$, $j$["Keep the bag on the dashboard where it stays warm", "Open the bag a little so the fish can breathe", "Run other errands first so the fish can settle", "Make it your last stop and keep the bag dark"]$j$::jsonb, 3, 79, 'buying', $x$A sealed bag has limited oxygen and changes temperature fast, so the trip should be short. Darkness keeps fish calm.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the best plan for the trip home with new fish?$q$, array(select jsonb_array_elements_text($j$["Keep the bag on the dashboard where it stays warm", "Open the bag a little so the fish can breathe", "Run other errands first so the fish can settle", "Make it your last stop and keep the bag dark"]$j$::jsonb)), 3, 79, 'buying', $x$A sealed bag has limited oxygen and changes temperature fast, so the trip should be short. Darkness keeps fish calm.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which acclimation method is gentlest for shrimp and sensitive fish?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which acclimation method is gentlest for shrimp and sensitive fish?$q$, $j$["A slow drip of tank water over an hour or more", "A quick dip in cooler water to calm them", "Floating the bag for a single minute, then netting them out", "Pouring them in quickly to cut the stress"]$j$::jsonb, 0, 80, 'buying', $x$Dripping changes the water chemistry very gradually. Shrimp and sensitive fish can be harmed by even modest sudden changes.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which acclimation method is gentlest for shrimp and sensitive fish?$q$, array(select jsonb_array_elements_text($j$["A slow drip of tank water over an hour or more", "A quick dip in cooler water to calm them", "Floating the bag for a single minute, then netting them out", "Pouring them in quickly to cut the stress"]$j$::jsonb)), 0, 80, 'buying', $x$Dripping changes the water chemistry very gradually. Shrimp and sensitive fish can be harmed by even modest sudden changes.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How long should new fish usually stay in quarantine?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How long should new fish usually stay in quarantine?$q$, $j$["About 1 hour", "About 1 to 2 days", "About 6 months or more", "About 2 to 4 weeks"]$j$::jsonb, 3, 81, 'buying', $x$Many diseases take days or weeks to show signs. Two to four weeks gives them time to appear in a tank where they're easy to treat.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How long should new fish usually stay in quarantine?$q$, array(select jsonb_array_elements_text($j$["About 1 hour", "About 1 to 2 days", "About 6 months or more", "About 2 to 4 weeks"]$j$::jsonb)), 3, 81, 'buying', $x$Many diseases take days or weeks to show signs. Two to four weeks gives them time to appear in a tank where they're easy to treat.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why quarantine fish that already look healthy?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why quarantine fish that already look healthy?$q$, $j$["Most store fish are secretly sick", "Quarantine helps young fish grow faster", "Hidden parasites or bacteria may not show yet", "It's a legal requirement for home aquariums"]$j$::jsonb, 2, 82, 'buying', $x$A fish can carry a disease before it shows any signs. Quarantine lets that show up away from your main tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why quarantine fish that already look healthy?$q$, array(select jsonb_array_elements_text($j$["Most store fish are secretly sick", "Quarantine helps young fish grow faster", "Hidden parasites or bacteria may not show yet", "It's a legal requirement for home aquariums"]$j$::jsonb)), 2, 82, 'buying', $x$A fish can carry a disease before it shows any signs. Quarantine lets that show up away from your main tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What filter is best for a quarantine tank?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What filter is best for a quarantine tank?$q$, $j$["No filter, so medicine stays in the water longer", "A sponge filter that has been running in your main tank", "A filter holding only activated carbon to clean the water", "A brand-new filter, still dry, straight out of the box"]$j$::jsonb, 1, 83, 'buying', $x$A sponge that has run in your main tank already carries beneficial bacteria, so the quarantine tank is cycled from day one. Sponges are also gentle and easy to clean.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What filter is best for a quarantine tank?$q$, array(select jsonb_array_elements_text($j$["No filter, so medicine stays in the water longer", "A sponge filter that has been running in your main tank", "A filter holding only activated carbon to clean the water", "A brand-new filter, still dry, straight out of the box"]$j$::jsonb)), 1, 83, 'buying', $x$A sponge that has run in your main tank already carries beneficial bacteria, so the quarantine tank is cycled from day one. Sponges are also gentle and easy to clean.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the main risk of adding new plants without checking them?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the main risk of adding new plants without checking them?$q$, $j$["Snails and other pests can hitchhike in", "New plants use up all the oxygen in a day", "Store plants make the water cloudy for months", "New plants can push the pH up to around 10"]$j$::jsonb, 0, 84, 'buying', $x$Pest snails, eggs and other hitchhikers often ride in on plants. Rinsing and inspecting them first keeps those out of your tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the main risk of adding new plants without checking them?$q$, array(select jsonb_array_elements_text($j$["Snails and other pests can hitchhike in", "New plants use up all the oxygen in a day", "Store plants make the water cloudy for months", "New plants can push the pH up to around 10"]$j$::jsonb)), 0, 84, 'buying', $x$Pest snails, eggs and other hitchhikers often ride in on plants. Rinsing and inspecting them first keeps those out of your tank.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Why are fish from a local hobbyist often a good choice?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why are fish from a local hobbyist often a good choice?$q$, $j$["Their fish are often raised in water like yours", "Their fish are free and come with a guarantee", "Their fish are immune to common diseases", "Their fish can safely skip quarantine since they're local"]$j$::jsonb, 0, 85, 'buying', $x$Fish raised on similar local tap water have less to adjust to. They should still be quarantined, since any fish can carry disease.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Why are fish from a local hobbyist often a good choice?$q$, array(select jsonb_array_elements_text($j$["Their fish are often raised in water like yours", "Their fish are free and come with a guarantee", "Their fish are immune to common diseases", "Their fish can safely skip quarantine since they're local"]$j$::jsonb)), 0, 85, 'buying', $x$Fish raised on similar local tap water have less to adjust to. They should still be quarantined, since any fish can carry disease.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How do live plants help water quality?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How do live plants help water quality?$q$, $j$["They turn nitrate back into nitrite", "They add helpful ammonia to the water", "They raise oxygen enough to replace the filter", "They use ammonia and nitrate as food"]$j$::jsonb, 3, 86, 'plants', $x$Plants take up nitrogen waste as fertilizer, which helps keep the water cleaner between water changes.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How do live plants help water quality?$q$, array(select jsonb_array_elements_text($j$["They turn nitrate back into nitrite", "They add helpful ammonia to the water", "They raise oxygen enough to replace the filter", "They use ammonia and nitrate as food"]$j$::jsonb)), 3, 86, 'plants', $x$Plants take up nitrogen waste as fertilizer, which helps keep the water cleaner between water changes.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What do aquarium plants do at night?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What do aquarium plants do at night?$q$, $j$["They make extra oxygen to store for day", "They stop all activity until lights come on", "They use a little oxygen, like fish do", "They release ammonia into the water"]$j$::jsonb, 2, 87, 'plants', $x$Plants make oxygen only when they have light. In the dark they keep living and breathing, so they use a small amount of oxygen.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What do aquarium plants do at night?$q$, array(select jsonb_array_elements_text($j$["They make extra oxygen to store for day", "They stop all activity until lights come on", "They use a little oxygen, like fish do", "They release ammonia into the water"]$j$::jsonb)), 2, 87, 'plants', $x$Plants make oxygen only when they have light. In the dark they keep living and breathing, so they use a small amount of oxygen.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$How should java fern and anubias be planted?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How should java fern and anubias be planted?$q$, $j$["Tie them to wood or rock; don't bury the rhizome", "Let them float freely at the surface", "Plant the rhizome under the gravel with root tabs", "Bury the whole plant deep in the gravel"]$j$::jsonb, 0, 88, 'plants', $x$The rhizome is the thick stem the leaves grow from, and it can rot when buried. Attached to decor, the plant grows well.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$How should java fern and anubias be planted?$q$, array(select jsonb_array_elements_text($j$["Tie them to wood or rock; don't bury the rhizome", "Let them float freely at the surface", "Plant the rhizome under the gravel with root tabs", "Bury the whole plant deep in the gravel"]$j$::jsonb)), 0, 88, 'plants', $x$The rhizome is the thick stem the leaves grow from, and it can rot when buried. Attached to decor, the plant grows well.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your new cryptocoryne loses most of its leaves a week after planting. What is happening?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your new cryptocoryne loses most of its leaves a week after planting. What is happening?$q$, $j$["A plant disease that will spread to every plant", "Crypt melt; it usually regrows from the roots", "The plant is dead and should be thrown away", "Fertilizer burn that the plant can't recover from"]$j$::jsonb, 1, 89, 'plants', $x$Crypts often drop their leaves when moved to new water conditions. If you leave the roots in place, new leaves usually grow back.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your new cryptocoryne loses most of its leaves a week after planting. What is happening?$q$, array(select jsonb_array_elements_text($j$["A plant disease that will spread to every plant", "Crypt melt; it usually regrows from the roots", "The plant is dead and should be thrown away", "Fertilizer burn that the plant can't recover from"]$j$::jsonb)), 1, 89, 'plants', $x$Crypts often drop their leaves when moved to new water conditions. If you leave the roots in place, new leaves usually grow back.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What can happen if floating plants cover the entire surface?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What can happen if floating plants cover the entire surface?$q$, $j$["Nothing; full cover only helps the tank", "They block light from the plants below", "They release toxins that harm small fish", "They raise ammonia as their roots grow"]$j$::jsonb, 1, 90, 'plants', $x$Floaters soak up nitrate, but a solid mat shades out everything underneath and can reduce surface gas exchange. Thin them out regularly.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What can happen if floating plants cover the entire surface?$q$, array(select jsonb_array_elements_text($j$["Nothing; full cover only helps the tank", "They block light from the plants below", "They release toxins that harm small fish", "They raise ammonia as their roots grow"]$j$::jsonb)), 1, 90, 'plants', $x$Floaters soak up nitrate, but a solid mat shades out everything underneath and can reduce surface gas exchange. Thin them out regularly.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$About how long should a planted tank's light be on each day?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$About how long should a planted tank's light be on each day?$q$, $j$["About 14 to 16 hours, like summer sun", "All 24 hours, so plants keep growing", "About 1 hour, to keep algae away", "About 6 to 8 hours, on a timer"]$j$::jsonb, 3, 91, 'plants', $x$Six to eight hours is enough for easy plants without giving algae extra time to grow. A timer keeps the schedule steady.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$About how long should a planted tank's light be on each day?$q$, array(select jsonb_array_elements_text($j$["About 14 to 16 hours, like summer sun", "All 24 hours, so plants keep growing", "About 1 hour, to keep algae away", "About 6 to 8 hours, on a timer"]$j$::jsonb)), 3, 91, 'plants', $x$Six to eight hours is enough for easy plants without giving algae extra time to grow. A timer keeps the schedule steady.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Your plants are growing tall, thin and pale. What does that usually mean?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your plants are growing tall, thin and pale. What does that usually mean?$q$, $j$["They aren't getting enough light", "There is too much CO2 in the water", "There are too many fish for the plants", "They are getting far too much light"]$j$::jsonb, 0, 92, 'plants', $x$Plants stretch toward the light when there isn't enough of it, which makes them leggy and pale.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Your plants are growing tall, thin and pale. What does that usually mean?$q$, array(select jsonb_array_elements_text($j$["They aren't getting enough light", "There is too much CO2 in the water", "There are too many fish for the plants", "They are getting far too much light"]$j$::jsonb)), 0, 92, 'plants', $x$Plants stretch toward the light when there isn't enough of it, which makes them leggy and pale.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which group of plants feeds mostly through its roots?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which group of plants feeds mostly through its roots?$q$, $j$["Java fern, anubias and java moss", "Hornwort, java moss and anacharis", "Floating frogbit, salvinia and red root floaters", "Amazon sword, cryptocorynes and vallisneria"]$j$::jsonb, 3, 93, 'plants', $x$Swords, crypts and vals pull most of their food from the substrate. The others take most of their nutrients from the water.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which group of plants feeds mostly through its roots?$q$, array(select jsonb_array_elements_text($j$["Java fern, anubias and java moss", "Hornwort, java moss and anacharis", "Floating frogbit, salvinia and red root floaters", "Amazon sword, cryptocorynes and vallisneria"]$j$::jsonb)), 3, 93, 'plants', $x$Swords, crypts and vals pull most of their food from the substrate. The others take most of their nutrients from the water.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What are root tabs?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What are root tabs?$q$, $j$["Slow-release tablets that kill algae around plant roots", "Small weights that hold new plants down", "Fertilizer capsules pushed into the substrate", "Sinking food tablets for bottom fish"]$j$::jsonb, 2, 94, 'plants', $x$Root tabs release nutrients into the substrate where root-feeding plants can reach them, even in plain gravel.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What are root tabs?$q$, array(select jsonb_array_elements_text($j$["Slow-release tablets that kill algae around plant roots", "Small weights that hold new plants down", "Fertilizer capsules pushed into the substrate", "Sinking food tablets for bottom fish"]$j$::jsonb)), 2, 94, 'plants', $x$Root tabs release nutrients into the substrate where root-feeding plants can reach them, even in plain gravel.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$When do you usually need to add CO2?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$When do you usually need to add CO2?$q$, $j$["For fast-growing plants under strong light", "For java fern and anubias in low light", "Whenever the tank holds more than a handful of fish", "For every planted tank, always"]$j$::jsonb, 0, 95, 'plants', $x$Strong light makes plants grow fast and use CO2 quickly. Easy, low-light plants get enough from fish and the air.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$When do you usually need to add CO2?$q$, array(select jsonb_array_elements_text($j$["For fast-growing plants under strong light", "For java fern and anubias in low light", "Whenever the tank holds more than a handful of fish", "For every planted tank, always"]$j$::jsonb)), 0, 95, 'plants', $x$Strong light makes plants grow fast and use CO2 quickly. Easy, low-light plants get enough from fish and the air.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Older plant leaves are turning yellow. What does that usually point to?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Older plant leaves are turning yellow. What does that usually point to?$q$, $j$["The plant is short on nutrients", "There is far too much CO2", "The plant is healthy and growing", "The water is a little too cold"]$j$::jsonb, 0, 96, 'plants', $x$When a plant runs short on some nutrients, it pulls them from older leaves to feed new growth, so the old leaves yellow first.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Older plant leaves are turning yellow. What does that usually point to?$q$, array(select jsonb_array_elements_text($j$["The plant is short on nutrients", "There is far too much CO2", "The plant is healthy and growing", "The water is a little too cold"]$j$::jsonb)), 0, 96, 'plants', $x$When a plant runs short on some nutrients, it pulls them from older leaves to feed new growth, so the old leaves yellow first.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$A three-week-old tank has brown dust on the glass and decor. What is it?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A three-week-old tank has brown dust on the glass and decor. What is it?$q$, $j$["Green spot algae from too much light", "Black beard algae that needs chemical treatment", "Diatoms, which usually fade on their own", "A fish disease shed from the gills"]$j$::jsonb, 2, 97, 'plants', $x$Diatoms are a brown film that is very common in new tanks. They usually disappear within the first month or two as the tank settles.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$A three-week-old tank has brown dust on the glass and decor. What is it?$q$, array(select jsonb_array_elements_text($j$["Green spot algae from too much light", "Black beard algae that needs chemical treatment", "Diatoms, which usually fade on their own", "A fish disease shed from the gills"]$j$::jsonb)), 2, 97, 'plants', $x$Diatoms are a brown film that is very common in new tanks. They usually disappear within the first month or two as the tank settles.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$Which tank resident is best known for eating hair algae?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which tank resident is best known for eating hair algae?$q$, $j$["Fancy goldfish", "Amano shrimp", "Oscar", "Betta"]$j$::jsonb, 1, 98, 'plants', $x$Amano shrimp graze constantly and are among the best cleaners of hair algae. The others are not algae eaters.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$Which tank resident is best known for eating hair algae?$q$, array(select jsonb_array_elements_text($j$["Fancy goldfish", "Amano shrimp", "Oscar", "Betta"]$j$::jsonb)), 1, 98, 'plants', $x$Amano shrimp graze constantly and are among the best cleaners of hair algae. The others are not algae eaters.$x$);
      end if;
  end if;
  if not exists (select 1 from public.course_questions where section_id = sid and prompt = $q$What is the right way to fix an algae problem?$q$) then
      if opts_type in ('jsonb', 'json') then
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the right way to fix an algae problem?$q$, $j$["Change light, feeding and fertilizer all at once to fix it fast", "Dose an algae chemical every single day", "Turn off the filter so algae can't spread", "Change one thing at a time and wait a week or two"]$j$::jsonb, 3, 99, 'plants', $x$Algae responds slowly. Changing one thing at a time shows you what actually worked and avoids shocking the tank.$x$);
      else
        insert into public.course_questions (section_id, prompt, options, correct_index, sort_order, topic, explanation)
        values (sid, $q$What is the right way to fix an algae problem?$q$, array(select jsonb_array_elements_text($j$["Change light, feeding and fertilizer all at once to fix it fast", "Dose an algae chemical every single day", "Turn off the filter so algae can't spread", "Change one thing at a time and wait a week or two"]$j$::jsonb)), 3, 99, 'plants', $x$Algae responds slowly. Changing one thing at a time shows you what actually worked and avoids shocking the tank.$x$);
      end if;
  end if;
end
$do$;

select count(*) as mastery_questions_loaded
from public.course_questions q join public.course_sections s on s.id = q.section_id
join public.courses c on c.id = s.course_id
where c.slug = 'foundations-mastery';
