-- step61_shop_banner_logo.sql
-- New shop page: a banner (cover) and a logo for each shop.
-- Adds two empty columns. Changes no existing rows and deletes nothing.
-- Safe to run more than once.

alter table public.fish_stores add column if not exists cover_url text;
alter table public.fish_stores add column if not exists logo_url  text;

comment on column public.fish_stores.cover_url is 'Shop page banner photo (store-photos bucket). Set by the owner through /api/stores/branding.';
comment on column public.fish_stores.logo_url  is 'Shop logo photo (store-photos bucket). Set by the owner through /api/stores/branding.';

-- Check: both columns now exist (should return 2 rows).
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'fish_stores'
  and column_name in ('cover_url', 'logo_url')
order by column_name;
