-- Step 81: breeding guide drafts for newly added species.
-- When a new species is added from a request, the AI writes a breeding guide and a
-- second pass fact-checks it. The draft is saved unpublished (is_published = false,
-- which the public can't see) until Chris says yes on Admin, Breeding guides.
-- Safe to run more than once.

alter table public.breeding_guides
  add column if not exists review_notes text,
  add column if not exists drafted_at timestamptz,
  add column if not exists draft_cost_cents numeric;

comment on column public.breeding_guides.review_notes is
  'For AI-drafted guides: what the fact-check pass checked, changed or was unsure of. Shown to Chris before publishing.';
comment on column public.breeding_guides.drafted_at is
  'When the AI drafted this guide. Null for the original hand-checked guides.';

create index if not exists breeding_guides_unpublished_idx on public.breeding_guides (is_published) where not is_published;

-- Check: should list the three new columns.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'breeding_guides'
  and column_name in ('review_notes', 'drafted_at', 'draft_cost_cents');
