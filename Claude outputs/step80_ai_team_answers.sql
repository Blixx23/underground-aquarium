-- Step 80: AI team findings get Yes / No / Something else.
-- Safe to run more than once.

-- 1. Room for a ready-to-run suggestion, and for Chris's "Something else" note.
alter table public.ops_findings
  add column if not exists proposal jsonb,
  add column if not exists chris_reply text,
  add column if not exists chris_reply_at timestamptz;

comment on column public.ops_findings.proposal is
  'What Yes does: {"type":"email","subject","body","store_ids":[...]} sends to shops, {"type":"fix"} asks Claude for a code fix, {"type":"approve"} approves a plan.';
comment on column public.ops_findings.chris_reply is
  'Chris''s "Something else" note. The worker revises the finding on its next run and clears it.';

-- 2. "Nudge 4 newly claimed shops": turn the draft into an email Chris can edit and send with one Yes.
update public.ops_findings f
set proposal = jsonb_build_object(
      'type', 'email',
      'subject', 'Your {{shop_name}} page is live. One quick post?',
      'body', E'Hi {{owner_first_name}},\n\nThanks for claiming {{shop_name}} on Underground Aquarium. Your page is live, and hobbyists near you can already find it.\n\nOne thing that helps a lot: add a quick post. New arrivals, a tank you''re proud of, or a sale this week all work. Shops with a recent post get noticed more.\n\nYou can post from your shop dashboard: https://www.undergroundaquarium.com/my/shops\n\nJust reply to this email if you have any questions.\n\nChris\nUnderground Aquarium',
      'store_ids', s.ids
    ),
    updated_at = now()
from (
  select jsonb_agg(id::text) as ids
  from public.fish_stores
  where claimed_by is not null
    and (name ilike '%Underwater Gardener%' or name ilike '%Advanced Aquatics%'
         or name ilike '%Down South Corals%' or name ilike '%Fins Up Reef%')
) s
where f.id = 'cfcf629c-d830-4c55-b263-6af0d9899670'
  and f.proposal is null
  and s.ids is not null;

-- 3. The "campaign stalled" alarm was the bounce brake doing its job (fixed in step 79).
update public.ops_findings
set status = 'dismissed',
    rating = -1,
    rating_note = 'False alarm: the bounce brake and daily cap were holding the mail on purpose.',
    updated_at = now()
where id = 'fb4f0fb8-3b91-4e4b-80c3-731e63a48227'
  and status in ('new', 'open');

-- 4. So the morning check doesn't raise it again.
insert into public.ops_memory (worker_key, kind, content, source)
select 'morning', 'rule',
  'Bulk email held by the bounce brake or the daily send cap is not a stalled campaign. Only flag it if mail to big providers (Gmail, Yahoo, Outlook) stops too, or nothing has sent for 3 days.',
  'chris'
where not exists (
  select 1 from public.ops_memory
  where worker_key = 'morning' and content like 'Bulk email held by the bounce brake%' and active
);

-- Check: should show the email suggestion with 4 shops.
select id, title, status, proposal->>'type' as yes_does, jsonb_array_length(proposal->'store_ids') as shops
from public.ops_findings
where id in ('cfcf629c-d830-4c55-b263-6af0d9899670', 'fb4f0fb8-3b91-4e4b-80c3-731e63a48227');
