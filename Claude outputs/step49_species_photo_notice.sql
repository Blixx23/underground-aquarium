-- ============================================================
-- STEP 49 — Species photo notification names the fish
--
-- One notice when a photo is used: says which fish, mentions the
-- bubbles, and opens that species page. The separate generic
-- "You earned bubbles" notice is no longer sent for photos.
-- Also points any generic photo notices already sent at the right
-- species page.
-- Safe to run more than once.
-- ============================================================

create or replace function public.review_species_photo(
  p_id      uuid,
  p_action  text,
  p_cover   boolean default false,
  p_retire  uuid default null,
  p_note    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_photo  public.species_photos;
  v_slug   text;
  v_name   text;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_count  integer;
  v_path   text;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Admins only.';
  end if;

  select * into v_photo from public.species_photos where id = p_id for update;
  if v_photo.id is null then raise exception 'Photo not found.'; end if;
  if v_photo.status <> 'pending' then raise exception 'That photo was already reviewed.'; end if;

  select slug, common_name into v_slug, v_name from public.species where id = v_photo.species_id;

  if p_action = 'approve' then
    -- Lock this species' photos so two approvals can't both take slot 5.
    perform 1 from public.species_photos
    where species_id = v_photo.species_id and status = 'approved'
    for update;

    select count(*) into v_count from public.species_photos
    where species_id = v_photo.species_id and status = 'approved';

    if v_count >= 5 then
      if p_retire is null then
        raise exception 'This species already has 5 photos. Pick one to replace.';
      end if;
      update public.species_photos
      set status = 'retired', is_cover = false
      where id = p_retire and species_id = v_photo.species_id and status = 'approved'
      returning storage_path into v_path;
      if v_path is null then raise exception 'The photo to replace wasn''t found.'; end if;
    end if;

    -- First photo for a species is the cover automatically.
    if coalesce(p_cover, false)
       or not exists (select 1 from public.species_photos
                      where species_id = v_photo.species_id and status = 'approved' and is_cover) then
      update public.species_photos set is_cover = false
      where species_id = v_photo.species_id and is_cover;
      v_photo.is_cover := true;
    end if;

    update public.species_photos
    set status = 'approved',
        is_cover = v_photo.is_cover,
        reviewer_note = v_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (v_photo.user_id, 'species_photo',
            'Your ' || v_name || ' photo was used',
            'It''s live on the ' || v_name || ' page with your name on it. +50 bubbles, and it counts toward your Species Photographer trophies. Tap to see it.',
            '/species/' || v_slug);

    perform public.sync_trophies(v_photo.user_id, true);

  elsif p_action = 'reject' then
    if v_note is null then raise exception 'Give a short reason. The member sees it.'; end if;

    update public.species_photos
    set status = 'rejected',
        is_cover = false,
        reviewer_note = v_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    where id = p_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (v_photo.user_id, 'species_photo',
            'About your ' || v_name || ' photo',
            'We didn''t use this one: ' || v_note || ' You''re welcome to try another.',
            '/species/' || v_slug);
  else
    raise exception 'Unknown action.';
  end if;

  return jsonb_build_object(
    'status', case when p_action = 'approve' then 'approved' else 'rejected' end,
    'user_id', v_photo.user_id,
    'slug', v_slug,
    'storage_path', v_photo.storage_path
  );
end;
$$;

revoke all on function public.review_species_photo(uuid, text, boolean, uuid, text) from public, anon;
grant execute on function public.review_species_photo(uuid, text, boolean, uuid, text) to authenticated;


-- Repoint generic photo-bubble notices already sent.
with m as (
  select n.id, x.slug, x.common_name
  from public.notifications n
  cross join lateral (
    select s.slug, s.common_name
    from public.species_photos ph
    join public.species s on s.id = ph.species_id
    where ph.user_id = n.user_id
      and ph.status in ('approved', 'retired')
    order by abs(extract(epoch from (ph.reviewed_at - n.created_at)))
    limit 1
  ) x
  where n.type = 'bubbles'
    and n.body like '%species photo was used%'
)
update public.notifications n
set type  = 'species_photo',
    title = 'Your ' || m.common_name || ' photo was used',
    body  = 'It''s live on the ' || m.common_name || ' page with your name on it. +50 bubbles.',
    link  = '/species/' || m.slug
from m
where n.id = m.id;

select count(*) as photo_notices
from public.notifications
where type = 'species_photo';
