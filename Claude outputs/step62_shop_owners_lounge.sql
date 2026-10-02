-- step62_shop_owners_lounge.sql
-- A private forum for people who manage a shop (and site admins).
--
-- What this does:
--   1. Adds forum_categories.owners_only (false for every existing category).
--   2. Adds a helper that answers "does this person manage a shop, or are they an admin?"
--   3. Tightens the read/post rules so threads and posts in an owners-only
--      category can only be seen or written by shop owners and admins.
--      Every other category behaves exactly as before.
--   4. Creates the "Shop Owners Lounge" category (not public, owners only).
--
-- Changes no existing threads, posts or categories. Safe to run more than once.

-- 1. The flag
alter table public.forum_categories
  add column if not exists owners_only boolean not null default false;

-- 2. Who counts as a shop owner: anyone who manages a claimed shop, plus admins.
create or replace function public.is_shop_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.fish_stores s where s.claimed_by = auth.uid())
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
$$;

-- Can the current person see this category's threads? Everything except
-- owners-only categories stays open, exactly as before.
create or replace function public.forum_category_open(p_category uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select not c.owners_only or public.is_shop_owner_or_admin()
     from public.forum_categories c where c.id = p_category),
    true);
$$;

create or replace function public.forum_thread_open(p_thread uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select public.forum_category_open(t.category_id)
     from public.forum_threads t where t.id = p_thread),
    true);
$$;

grant execute on function public.is_shop_owner_or_admin() to anon, authenticated;
grant execute on function public.forum_category_open(uuid) to anon, authenticated;
grant execute on function public.forum_thread_open(uuid) to anon, authenticated;

-- 3. Rules. Same as before, plus the owners-only check.
drop policy if exists forum_categories_read on public.forum_categories;
create policy forum_categories_read on public.forum_categories
  for select using (is_public or (owners_only and public.is_shop_owner_or_admin()));

drop policy if exists forum_threads_read on public.forum_threads;
create policy forum_threads_read on public.forum_threads
  for select using (hidden_at is null and public.forum_category_open(category_id));

drop policy if exists forum_threads_insert on public.forum_threads;
create policy forum_threads_insert on public.forum_threads
  for insert with check (auth.uid() = author_id and public.forum_category_open(category_id));

drop policy if exists forum_posts_read on public.forum_posts;
create policy forum_posts_read on public.forum_posts
  for select using (hidden_at is null and public.forum_thread_open(thread_id));

drop policy if exists forum_posts_insert on public.forum_posts;
create policy forum_posts_insert on public.forum_posts
  for insert with check (auth.uid() = author_id and public.forum_thread_open(thread_id));

-- 4. The lounge. Not public, so the feed, forum search and community views
-- (which only read public categories) never include it.
insert into public.forum_categories (slug, name, description, sort_order, is_public, owners_only)
select 'shop-owners',
       'Shop Owners Lounge',
       'Just for people who run a shop on Underground Aquarium. Trade tips, ask about the site, and talk shop.',
       0,
       false,
       true
where not exists (select 1 from public.forum_categories where slug = 'shop-owners');

-- Check: the lounge exists and is locked, and every other category is unchanged.
select slug, name, is_public, owners_only
from public.forum_categories
order by owners_only desc, sort_order, name;
