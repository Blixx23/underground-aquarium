-- step63_lounge_starter_threads.sql
-- Four starter threads in the Shop Owners Lounge, posted as Chris and pinned.
-- Run AFTER step62. Adds four threads and their opening posts; changes nothing
-- else. Safe to run more than once: a thread that already exists is skipped.

do $$
declare
  v_cat    uuid;
  v_author uuid;
  v_thread uuid;
  v_i      int := 0;
  v_t      record;
begin
  select id into v_cat from public.forum_categories where slug = 'shop-owners';
  if v_cat is null then
    raise exception 'Run step62 first: the Shop Owners Lounge does not exist yet.';
  end if;

  -- Chris: the site admin account.
  select id into v_author
  from public.profiles
  where is_admin
  order by (lower(username) in ('chris_lewis', 'salmon868')) desc, created_at
  limit 1;
  if v_author is null then
    raise exception 'No admin account found to post as.';
  end if;

  for v_t in
    select * from (values
      (1,
       'welcome-introduce-yourself',
       'Welcome to the Lounge: introduce yourself',
       E'Hey everyone, Chris here. I built Underground Aquarium, and this corner is just for you: the people who actually run the shops. Nobody else can see it.\n\nLet''s get to know each other. Drop a reply with:\n\n- **Your name and your shop**\n- **Where you are**\n- **How long you''ve been open**\n- **What you''re known for** (reef, plants, bettas, koi, rare cats, whatever it is)\n- **One thing you wish more customers knew**\n\nI''ll start: I''m Chris, I''m in Roseville, CA, and I started this site because I wanted one place where hobbyists could find real local shops instead of big box stores. Glad you''re here.'),
      (2,
       'what-do-you-stock',
       'What do you stock, and what''s selling right now?',
       E'Curious what everyone carries and what''s moving this month.\n\n- **What sells best for you right now?**\n- **Anything that surprised you?** Something you thought would fly off the shelf and didn''t, or the other way around.\n- **What do customers keep asking for that''s hard to get?**\n\nIf another shop is hunting for something you have plenty of, this is a good place to find each other.'),
      (3,
       'marketing-tips-and-ideas',
       'Marketing tips and ideas: what''s bringing people through your door?',
       E'Let''s share what actually works. Small shops don''t have big ad budgets, so the good ideas usually come from each other.\n\n- **What''s your best source of new customers?** Instagram, Facebook groups, word of mouth, clubs, swaps, Google?\n- **Any promo that worked great?** Or one that flopped?\n- **How do you get people to come back?**\n\nA few things on the site that are free and made for this: your shop page posts (restocks with photos, and your followers get notified), the printable posters with your own QR code, and the share card that shows your shop when you post your link. You''ll find all of it under **Promotions** in your shop dashboard.'),
      (4,
       'make-underground-aquarium-better',
       'What would make Underground Aquarium better for your shop?',
       E'This one''s straight to me. Tell me what''s missing, what''s annoying, and what would make your page or dashboard more useful.\n\nNo idea is too small. Most of what''s on your shop page right now came from shop owners telling me what they wanted.')
    ) as t(ord, slug, title, body)
    order by ord
  loop
    v_i := v_i + 1;
    if exists (select 1 from public.forum_threads where category_id = v_cat and slug = v_t.slug) then
      continue;
    end if;

    insert into public.forum_threads (category_id, author_id, slug, title, images, is_seeded, is_pinned,
                                      created_at, last_activity_at)
    values (v_cat, v_author, v_t.slug, v_t.title, '{}', false, true,
            now() - make_interval(mins => v_i), now() - make_interval(mins => v_i))
    returning id into v_thread;

    insert into public.forum_posts (thread_id, author_id, body, is_op, parent_id, created_at)
    values (v_thread, v_author, v_t.body, true, null, now() - make_interval(mins => v_i));
  end loop;
end $$;

-- Check: the four threads, newest first.
select t.title, t.is_pinned, t.reply_count, p.username as posted_by
from public.forum_threads t
join public.forum_categories c on c.id = t.category_id and c.slug = 'shop-owners'
left join public.profiles p on p.id = t.author_id
order by t.created_at desc;
