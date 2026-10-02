-- Course lessons: image or video visual, with uploads
-- Paste into the Supabase SQL Editor and run once. Safe to run again.

-- 1. Lessons can carry an image (videos already use video_url)
alter table public.course_sections
  add column if not exists image_url text;

-- 2. Public storage bucket for lesson images and videos (200 MB per file)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media',
  'course-media',
  true,
  209715200,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 3. Only admins can upload, replace or delete course media
drop policy if exists "course media admin insert" on storage.objects;
create policy "course media admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "course media admin update" on storage.objects;
create policy "course media admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'course-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "course media admin delete" on storage.objects;
create policy "course media admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'course-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "course media admin read" on storage.objects;
create policy "course media admin read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

select 'course media ready' as status;
