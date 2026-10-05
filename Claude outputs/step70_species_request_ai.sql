-- Step 70: keep the AI check on each species request, so it runs once
-- instead of every time the Species requests page opens.

alter table public.species_suggestions add column if not exists ai_review jsonb;
alter table public.species_suggestions add column if not exists ai_reviewed_at timestamptz;

select count(*) filter (where status = 'pending') as waiting,
       count(*) filter (where ai_review is not null) as checked
from public.species_suggestions;
