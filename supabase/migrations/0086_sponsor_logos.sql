-- ===========================================================================
-- 0086 — sponsor logos
--
-- A sponsor table buyer can now carry a logo. Two copies are kept:
--
--   1. The PRINT MASTER — exactly the file the sponsor sent, never re-encoded,
--      in a PRIVATE bucket. This is what goes to the program printer.
--   2. The WEB COPY — trimmed, sized to a common visual weight, on a fixed
--      800x400 transparent canvas, WebP. PUBLIC bucket, written only by the
--      server (service role). Nothing the sponsor sent is ever served as-is,
--      so an SVG with script in it can never reach a visitor.
--
-- The chapter's public page shows the sponsors of its most recent banquet
-- (whose day has arrived, in the chapter's timezone) until the next banquet's
-- day arrives, then rolls over by itself. Nothing is deleted when it rolls:
-- last year's sponsors stay on last year's banquet.
--
-- Safe to re-run.
-- ===========================================================================


-- ---------------------------------------------------------------- 1. columns
alter table public.banquet_table_sales
  add column if not exists logo_path        text,
  add column if not exists logo_name        text,
  add column if not exists logo_kind        text,
  add column if not exists logo_px_w        integer,
  add column if not exists logo_px_h        integer,
  add column if not exists logo_web_path    text,
  add column if not exists logo_updated_at  timestamptz,
  add column if not exists sponsor_url      text,
  add column if not exists show_on_site     boolean not null default true;

alter table public.banquet_table_sales
  drop constraint if exists banquet_table_sales_logo_kind_check;
alter table public.banquet_table_sales
  add constraint banquet_table_sales_logo_kind_check
  check (logo_kind is null or logo_kind in ('vector', 'raster'));

comment on column public.banquet_table_sales.logo_path is
  'Print master in the private sponsor-logos bucket: <chapterId>/<eventId>/<file>. Exactly as the sponsor sent it.';
comment on column public.banquet_table_sales.logo_kind is
  'vector (SVG/PDF/AI/EPS, prints at any size) or raster (PNG/JPG/WebP, limited by its pixels).';
comment on column public.banquet_table_sales.logo_px_w is
  'Raster masters only: width in pixels of the logo itself, after trimming blank margins. Drives the print-size check.';
comment on column public.banquet_table_sales.logo_web_path is
  'Normalized web copy in the public sponsor-logos-web bucket. Null until one exists (e.g. an AI/EPS master with no web image yet).';
comment on column public.banquet_table_sales.show_on_site is
  'Officer switch: list this sponsor on the chapter public page. Only SOLD sponsors are ever listed.';


-- ---------------------------------------------------------- 2. print masters
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sponsor-logos', 'sponsor-logos', false,
  26214400, -- 25 MB: a layered AI or EPS can be large
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/postscript', 'application/illustrator'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- First folder in the key is the chapter id; the same can_manage_chapter()
-- gate the receipts bucket uses (0075) decides access.
drop policy if exists "sponsor logos: read"   on storage.objects;
drop policy if exists "sponsor logos: upload" on storage.objects;
drop policy if exists "sponsor logos: update" on storage.objects;
drop policy if exists "sponsor logos: delete" on storage.objects;

create policy "sponsor logos: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'sponsor-logos' and public.mb_can_manage_receipt_object(name));

create policy "sponsor logos: upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'sponsor-logos' and public.mb_can_manage_receipt_object(name));

create policy "sponsor logos: update" on storage.objects
  for update to authenticated
  using (bucket_id = 'sponsor-logos' and public.mb_can_manage_receipt_object(name))
  with check (bucket_id = 'sponsor-logos' and public.mb_can_manage_receipt_object(name));

create policy "sponsor logos: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'sponsor-logos' and public.mb_can_manage_receipt_object(name));


-- ------------------------------------------------------------- 3. web copies
-- Public read (it's a public bucket), and NO write policy for anyone signed
-- in: only the server's service role writes here, after processing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sponsor-logos-web', 'sponsor-logos-web', true, 2097152, array['image/webp'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ------------------------------------------------------- 4. public page read
-- The chapter's most recent banquet whose day has arrived (chapter timezone,
-- the same frame 0076 uses), within the last 18 months, not private, not a
-- draft. Its SOLD sponsors that the officers left switched on.
create or replace function public.public_banquet_sponsors(p_slug text)
returns table(
  banquet_year  integer,
  sponsor_name  text,
  logo_web_path text,
  sponsor_url   text,
  tier_name     text
)
language sql
stable security definer
set search_path to 'public'
as $function$
  with c as (
    select id, coalesce(nullif(timezone, ''), 'America/Los_Angeles') as tz
    from public.chapters
    where lower(slug) = lower(p_slug)
    limit 1
  ),
  b as (
    select e.id, e.starts_at, c.tz
    from public.events e
    join c on c.id = e.chapter_id
    where e.event_type = 'banquet'
      and e.starts_at is not null
      and not coalesce(e.is_private, false)
      and coalesce(e.status, 'published') <> 'planning'
      and (e.starts_at at time zone c.tz)::date <= (now() at time zone c.tz)::date
      and e.starts_at >= now() - interval '18 months'
    order by e.starts_at desc
    limit 1
  )
  select extract(year from (b.starts_at at time zone b.tz))::integer,
         s.buyer_name,
         s.logo_web_path,
         case when s.sponsor_url ~* '^https?://' then s.sponsor_url else null end,
         t.name
  from b
  join public.banquet_table_sales s on s.event_id = b.id
  left join public.event_pricing_tiers t on t.id = s.tier_id
  where s.status = 'sold'
    and s.show_on_site
    and coalesce(trim(s.buyer_name), '') <> ''
  -- Biggest tables first, then alphabetical.
  order by coalesce(s.price_at_sale, 0) desc, lower(s.buyer_name) asc;
$function$;

grant execute on function public.public_banquet_sponsors(text) to anon, authenticated;
