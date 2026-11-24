-- Which published shops these members own, so their posts and profiles can
-- say "Owner of <shop>" and link the two. Only public facts: the shop's name,
-- page and logo, and that this member runs it.
create or replace function public.shops_owned_by(p_users uuid[])
returns table (user_id uuid, name text, slug text, logo_url text)
language sql stable security definer set search_path = public
as $$
  select s.claimed_by, s.name, s.slug, s.logo_url
  from fish_stores s
  where s.claimed_by = any(p_users[1:200]) and s.status = 'published'
  order by s.name
$$;
revoke all on function public.shops_owned_by(uuid[]) from public;
grant execute on function public.shops_owned_by(uuid[]) to anon, authenticated, service_role;
