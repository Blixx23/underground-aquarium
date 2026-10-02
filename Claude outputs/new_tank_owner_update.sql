-- New Fish Tank Owner: lesson images + review fixes.
-- Paste into the Supabase SQL Editor and run. Safe to run more than once.
-- Needs course_media.sql run first (it adds course_sections.image_url).
do $do$
declare
  cid uuid;
  sid uuid;
  opts_type text;
begin
  select id into cid from public.courses where slug = 'new-tank-owner';
  if cid is null then
    raise notice 'Course new-tank-owner not found, nothing changed';
    return;
  end if;

  select udt_name into opts_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'course_questions' and column_name = 'options';

  -- Cover image
  update public.courses
  set cover_image = '/course-media/new-tank-owner/00-course-cover.png'
  where id = cid;

  -- 1. Welcome: image, remove stray *italics* markers (the lesson renderer only does **bold**)
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/01-welcome.png',
      content = replace(content, '*ready*', 'ready')
  where course_id = cid and title = 'Welcome (and the #1 reason beginner fish die)';

  -- 2. Setting up: image instead of an empty "video coming soon" box
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/02-choosing-and-setting-up.png',
      has_video = false,
      video_url = null
  where course_id = cid and title = 'Choosing and setting up your tank' and video_url is null;

  -- 3. Nitrogen cycle: keeps its YouTube video; image is the fallback if the video is removed.
  --    Cycle time matches the Nitrogen Cycle course; fish food is no longer the suggested ammonia source.
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/03-the-nitrogen-cycle.png',
      content = replace(replace(replace(content,
        '*none*', 'none'),
        'roughly **2 to 6 weeks**', 'roughly **4 to 8 weeks** (faster with bottled bacteria or seeded media)'),
        '(bottled ammonia, or a pinch of fish food to rot)', '(bottled ammonia works best; rotting fish food works but is slow and messy)')
  where course_id = cid and title = 'The Nitrogen Cycle (the most important section)'
  returning id into sid;

  if sid is not null then
    if opts_type in ('jsonb', 'json') then
      update public.course_questions
      set options = replace(options::text, '"2 to 6 weeks"', '"4 to 8 weeks"')::jsonb
      where section_id = sid and options::text like '%2 to 6 weeks%';
    else
      update public.course_questions
      set options = array_replace(options, '2 to 6 weeks', '4 to 8 weeks')
      where section_id = sid and '2 to 6 weeks' = any(options);
    end if;
  end if;

  -- 4. Water care: image, stray italics
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/04-water-care-and-water-changes.png',
      content = replace(replace(content, '*people*', 'people'), '*old tank water*', 'old tank water')
  where course_id = cid and title = 'Water care and water changes';

  -- 5. Adding fish: image instead of an empty "video coming soon" box, stray italics
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/05-adding-fish-the-right-way.png',
      has_video = case when video_url is null then false else has_video end,
      content = replace(content, '*adult*', 'adult')
  where course_id = cid and title = 'Adding fish the right way';

  -- 6. Feeding: image, stray italics
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/06-feeding-and-everyday-care.png',
      content = replace(content, '*eye*', 'eye')
  where course_id = cid and title = 'Feeding and everyday care';

  -- 7. Troubleshooting: image; blank line before the golden rules so they show as a numbered list
  update public.course_sections
  set image_url = '/course-media/new-tank-owner/07-troubleshooting.png',
      content = replace(content, E'all in one place:\n1.', E'all in one place:\n\n1.')
  where course_id = cid and title = 'Troubleshooting, and you did it';

  -- Lesson 1 only had 2 quiz questions; every other lesson has 3+. Add a third.
  select id into sid from public.course_sections
  where course_id = cid and title = 'Welcome (and the #1 reason beginner fish die)';
  if sid is not null and (select count(*) from public.course_questions where section_id = sid) < 3 then
    if opts_type in ('jsonb', 'json') then
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, 'What should you do on the day you set up your tank?',
              '["Buy fish and add them that night", "Set it up and let it run without fish", "Add fish but feed them less"]'::jsonb, 1, 2);
    else
      insert into public.course_questions (section_id, prompt, options, correct_index, sort_order)
      values (sid, 'What should you do on the day you set up your tank?',
              array['Buy fish and add them that night', 'Set it up and let it run without fish', 'Add fish but feed them less'], 1, 2);
    end if;
  end if;

  raise notice 'New Fish Tank Owner updated';
end
$do$;

select s.sort_order + 1 as lesson, s.title, s.has_video, s.image_url is not null as has_image,
       (select count(*) from public.course_questions q where q.section_id = s.id) as questions
from public.course_sections s
join public.courses c on c.id = s.course_id
where c.slug = 'new-tank-owner'
order by s.sort_order;
