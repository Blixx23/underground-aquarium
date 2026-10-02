-- ============================================================
-- STEP 50 — Breeding videos, and the updated Terms of Service
--
-- Members upload short clips of courtship, spawning, eggs or fry
-- from a species page. The site converts every upload itself into
-- one web-safe MP4 plus a poster frame, then it waits in
-- Admin → Breeding videos. Up to 3 per species. A used video earns
-- 75 bubbles and counts toward the Videographer trophies, and gets
-- its own watch page for Google video results.
--
-- Also tells every member the Terms of Service changed.
-- Safe to run more than once.
-- ============================================================


-- ------------------------------------------------------------
-- 1. The videos
-- ------------------------------------------------------------

create table if not exists public.species_videos (
  id             uuid primary key default gen_random_uuid(),
  species_id     uuid not null references public.species(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  stage          text not null default 'spawning'
                 check (stage in ('courtship', 'spawning', 'eggs', 'fry')),
  caption        text,
  -- The member's original file, in the private uploads bucket. Deleted
  -- once converted.
  raw_path       text,
  -- The site's own converted copy and poster, in the public bucket.
  video_path     text,
  video_url      text,
  poster_path    text,
  poster_url     text,
  duration_s     numeric,
  width          integer,
  height         integer,
  -- processing → pending → approved | rejected. failed = couldn't be
  -- converted. retired = replaced by a better one after being used.
  status         text not null default 'processing'
                 check (status in ('processing', 'pending', 'approved', 'rejected', 'retired', 'failed')),
  error          text,
  reviewer_note  text,
  reviewed_at    timestamptz,
  reviewed_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists species_videos_species_status on public.species_videos (species_id, status);
create index if not exists species_videos_user_status on public.species_videos (user_id, status);
create index if not exists species_videos_pending on public.species_videos (created_at) where status = 'pending';

alter table public.species_videos enable row level security;

drop policy if exists species_videos_read on public.species_videos;
create policy species_videos_read on public.species_videos
  for select
  using (status = 'approved' or user_id = auth.uid());


-- ------------------------------------------------------------
-- 2. Storage
--
-- video-uploads: private. Members drop their original here, in a
--   folder named after their own id. Only the server reads it.
--   200 MB covers a 30-second 4K clip straight off a phone.
-- species-videos: public. Only the server writes here, so nothing
--   reaches a page without going through the site's conversion.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-uploads', 'video-uploads', false, 209715200,
        array['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/webm', 'video/3gpp', 'video/hevc'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('species-videos', 'species-videos', true, 52428800,
        array['video/mp4', 'image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists video_uploads_insert on storage.objects;
create policy video_uploads_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'video-uploads'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists video_uploads_delete on storage.objects;
create policy video_uploads_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'video-uploads'
         and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists species_videos_select on storage.objects;
create policy species_videos_select on storage.objects
  for select
  using (bucket_id = 'species-videos');


-- ------------------------------------------------------------
-- 3. Submit a video (after the original is uploaded)
-- ------------------------------------------------------------

create or replace function public.submit_species_video(
  p_slug      text,
  p_raw_path  text,
  p_stage     text,
  p_caption   text default null,
  p_confirm   boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_species  uuid;
  v_caption  text := nullif(btrim(regexp_replace(coalesce(p_caption, ''), '\s+', ' ', 'g')), '');
  v_id       uuid;
begin
  if v_user is null then raise exception 'Sign in to submit a video.'; end if;
  if exists (select 1 from public.profiles
             where id = v_user and (deleted_at is not null or suspended_at is not null)) then
    raise exception 'Your account can''t do that right now.';
  end if;
  if not coalesce(p_confirm, false) then
    raise exception 'Confirm you filmed this in your own tank and agree to the upload terms.';
  end if;
  if p_stage not in ('courtship', 'spawning', 'eggs', 'fry') then
    raise exception 'Pick what the video shows.';
  end if;

  select id into v_species from public.species where slug = p_slug;
  if v_species is null then raise exception 'That species wasn''t found.'; end if;

  if p_raw_path is null or split_part(p_raw_path, '/', 1) <> v_user::text then
    raise exception 'That video didn''t come from your uploads.';
  end if;

  if v_caption is not null then
    if char_length(v_caption) > 140 then raise exception 'Keep the caption under 140 characters.'; end if;
    if v_caption ~* '(https?://|www\.|\.com\b)' then raise exception 'Leave links out of the caption.'; end if;
  end if;

  if (select count(*) from public.species_videos
      where species_id = v_species and status = 'approved') >= 3 then
    raise exception 'This species already has all 3 videos.';
  end if;
  if (select count(*) from public.species_videos
      where species_id = v_species and user_id = v_user and status in ('processing', 'pending')) >= 2 then
    raise exception 'You already have 2 videos of this fish waiting for review.';
  end if;
  if (select count(*) from public.species_videos
      where user_id = v_user and created_at > now() - interval '1 day') >= 5 then
    raise exception 'That''s 5 videos today. Thanks! Try again tomorrow.';
  end if;

  insert into public.species_videos (species_id, user_id, stage, caption, raw_path, status)
  values (v_species, v_user, p_stage, v_caption, p_raw_path, 'processing')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_species_video(text, text, text, text, boolean) from public, anon;
grant execute on function public.submit_species_video(text, text, text, text, boolean) to authenticated;


-- ------------------------------------------------------------
-- 4. Review a video (admins only)
-- ------------------------------------------------------------

create or replace function public.review_species_video(
  p_id      uuid,
  p_action  text,
  p_retire  uuid default null,
  p_note    text default null,
  p_stage   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vid    public.species_videos;
  v_slug   text;
  v_name   text;
  v_note   text := nullif(btrim(coalesce(p_note, '')), '');
  v_stage  text;
  v_count  integer;
  v_found  uuid;
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Admins only.';
  end if;

  select * into v_vid from public.species_videos where id = p_id for update;
  if v_vid.id is null then raise exception 'Video not found.'; end if;
  if v_vid.status <> 'pending' then raise exception 'That video isn''t waiting for review.'; end if;

  select slug, common_name into v_slug, v_name from public.species where id = v_vid.species_id;
  v_stage := coalesce(nullif(p_stage, ''), v_vid.stage);
  if v_stage not in ('courtship', 'spawning', 'eggs', 'fry') then raise exception 'Unknown stage.'; end if;

  if p_action = 'approve' then
    perform 1 from public.species_videos
    where species_id = v_vid.species_id and status = 'approved'
    for update;

    select count(*) into v_count from public.species_videos
    where species_id = v_vid.species_id and status = 'approved';

    if v_count >= 3 then
      if p_retire is null then
        raise exception 'This species already has 3 videos. Pick one to replace.';
      end if;
      update public.species_videos
      set status = 'retired', updated_at = now()
      where id = p_retire and species_id = v_vid.species_id and status = 'approved'
      returning id into v_found;
      if v_found is null then raise exception 'The video to replace wasn''t found.'; end if;
    end if;

    update public.species_videos
    set status = 'approved', stage = v_stage, reviewer_note = v_note,
        reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
    where id = p_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (v_vid.user_id, 'species_video',
            'Your ' || v_name || ' video was used',
            'It has its own page with your name on it, and it''s on the ' || v_name
              || ' page. +75 bubbles, and it counts toward your Videographer trophies. Tap to watch it.',
            '/species/' || v_slug || '/video/' || p_id);

    perform public.sync_trophies(v_vid.user_id, true);

  elsif p_action = 'reject' then
    if v_note is null then raise exception 'Give a short reason. The member sees it.'; end if;

    update public.species_videos
    set status = 'rejected', reviewer_note = v_note,
        reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
    where id = p_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (v_vid.user_id, 'species_video',
            'About your ' || v_name || ' video',
            'We didn''t use this one: ' || v_note || ' You''re welcome to try another.',
            '/species/' || v_slug);
  else
    raise exception 'Unknown action.';
  end if;

  return jsonb_build_object(
    'status', case when p_action = 'approve' then 'approved' else 'rejected' end,
    'user_id', v_vid.user_id,
    'slug', v_slug,
    'video_path', v_vid.video_path,
    'poster_path', v_vid.poster_path
  );
end;
$$;

revoke all on function public.review_species_video(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.review_species_video(uuid, text, uuid, text, text) to authenticated;


-- ------------------------------------------------------------
-- 5. Public reads: a species' videos, and one video's watch page
-- ------------------------------------------------------------

create or replace function public.public_species_videos(p_slug text)
returns table (
  id uuid, stage text, caption text, video_url text, poster_url text,
  duration_s numeric, width integer, height integer, reviewed_at timestamptz,
  username text, full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.stage, v.caption, v.video_url, v.poster_url,
         v.duration_s, v.width, v.height, v.reviewed_at,
         p.username, p.full_name
  from public.species_videos v
  join public.species s on s.id = v.species_id
  join public.profiles p on p.id = v.user_id
  where s.slug = p_slug
    and v.status = 'approved'
    and p.deleted_at is null
    and p.suspended_at is null
  order by v.reviewed_at asc
  limit 3;
$$;

grant execute on function public.public_species_videos(text) to anon, authenticated;

create or replace function public.public_species_video(p_id uuid)
returns table (
  id uuid, stage text, caption text, video_url text, poster_url text,
  duration_s numeric, width integer, height integer, reviewed_at timestamptz,
  username text, full_name text,
  species_slug text, common_name text, scientific_name text, summary text
)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.stage, v.caption, v.video_url, v.poster_url,
         v.duration_s, v.width, v.height, v.reviewed_at,
         p.username, p.full_name,
         s.slug, s.common_name, s.scientific_name, s.summary
  from public.species_videos v
  join public.species s on s.id = v.species_id
  join public.profiles p on p.id = v.user_id
  where v.id = p_id
    and v.status = 'approved'
    and p.deleted_at is null
    and p.suspended_at is null;
$$;

grant execute on function public.public_species_video(uuid) to anon, authenticated;


-- ------------------------------------------------------------
-- 6. Bubbles for a video that gets used
-- ------------------------------------------------------------

update public.bubble_rules
set amount = 75, label = 'Your breeding video was used', active = true
where source = 'species_video_used';

insert into public.bubble_rules (source, amount, label, active)
select 'species_video_used', 75, 'Your breeding video was used', true
where not exists (select 1 from public.bubble_rules where source = 'species_video_used');


-- ------------------------------------------------------------
-- 7. Videographer trophies
-- ------------------------------------------------------------

delete from public.trophy_metrics where key = 'species_videos_used';
insert into public.trophy_metrics (key, sql)
values ('species_videos_used',
        'select count(*) from public.species_videos where user_id = $1 and status in (''approved'', ''retired'')');

with t (key, name, description, tier, threshold, sort) as (
  values
    ('species_video_1',  'Action!',                'A breeding video you filmed is used in the library.', 'bronze',    1, 688),
    ('species_video_3',  'Documentarian',          '3 of your breeding videos are used.',                  'silver',    3, 689),
    ('species_video_10', 'Nature Cinematographer', '10 of your breeding videos are used.',                 'gold',     10, 690),
    ('species_video_25', 'Breeding Archivist',     '25 of your breeding videos are used.',                 'platinum', 25, 691)
),
upd as (
  update public.trophies tr
  set name = t.name, description = t.description, category = 'knowledge', scope = 'site',
      series = 'species_videos', tier = t.tier, threshold = t.threshold,
      metric = 'species_videos_used', exclusive = false, sort = t.sort, is_active = true
  from t
  where tr.key = t.key
  returning tr.key
)
insert into public.trophies
  (key, name, description, category, scope, series, tier, threshold, metric, exclusive, sort, is_active)
select t.key, t.name, t.description, 'knowledge', 'site', 'species_videos', t.tier, t.threshold,
       'species_videos_used', false, t.sort, true
from t
where not exists (select 1 from public.trophies x where x.key = t.key);


-- ------------------------------------------------------------
-- 8. Tell every member the Terms changed (once)
-- ------------------------------------------------------------

insert into public.notifications (user_id, type, title, body, link)
select p.id, 'site',
       'We updated our Terms of Service',
       'New rules for photos and videos you upload, and how the site can use them. Using the site means you accept them.',
       '/terms'
from public.profiles p
where p.deleted_at is null
  and not exists (
    select 1 from public.notifications n
    where n.user_id = p.id and n.type = 'site' and n.title = 'We updated our Terms of Service'
  );


-- Done.
select
  (select count(*) from public.trophies where series = 'species_videos') as video_trophies,
  (select amount from public.bubble_rules where source = 'species_video_used') as bubbles_per_video,
  (select count(*) from storage.buckets where id in ('video-uploads', 'species-videos')) as buckets_ready;
