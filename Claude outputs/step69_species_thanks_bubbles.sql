-- Step 69: thank-you bubbles when a species request, species photo or breeding video is turned down.
-- The site awards it once per submission (admins can untick it for spam).

update public.bubble_rules
set amount = 10, label = 'Thanks for your species submission', active = true
where source = 'species_submission_thanks';

insert into public.bubble_rules (source, amount, label, active)
select 'species_submission_thanks', 10, 'Thanks for your species submission', true
where not exists (select 1 from public.bubble_rules where source = 'species_submission_thanks');

select source, amount, label, active from public.bubble_rules where source = 'species_submission_thanks';
