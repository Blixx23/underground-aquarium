-- Shop archive: when a shop leaves the directory (hidden after being live, or
-- a member's application turned down) we keep a note of when, from where,
-- and why, so the admin Archive tab can list them and bring any back.
alter table public.fish_stores
  add column if not exists archived_at timestamptz,
  add column if not exists archived_from text,   -- 'listed' (was live) or 'applied' (application turned down)
  add column if not exists archive_reason text;

-- Shops already hidden before this existed.
update public.fish_stores
set archived_at = coalesce(archived_at, updated_at, created_at),
    archived_from = coalesce(archived_from, case when source = 'user' then 'applied' else 'listed' end)
where status = 'hidden';

create index if not exists fish_stores_archived_at_idx on public.fish_stores (archived_at desc) where status = 'hidden';
