-- step66_link_water_check.sql
-- Turns "Water Check" in the sick fish thread into a link to /water-check.
-- Only changes that one post's text. Safe to run more than once.

update public.forum_posts p
set body = replace(p.body, '**Water Check** tool', '[Water Check](/water-check) tool')
from public.forum_threads t
where t.id = p.thread_id
  and p.is_op
  and t.slug = 'my-fish-is-sick-and-i-dont-know-why-what-do-i-do'
  and p.body like '%**Water Check** tool%';

-- Check: should show the link.
select substring(p.body from position('Water Check' in p.body) - 1 for 45) as now_reads
from public.forum_posts p
join public.forum_threads t on t.id = p.thread_id
where p.is_op and t.slug = 'my-fish-is-sick-and-i-dont-know-why-what-do-i-do';
