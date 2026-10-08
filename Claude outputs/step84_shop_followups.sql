-- Step 84: shop campaign follow-ups.
-- Adds email 2 (7 days after email 1) and email 3 (14 days after email 2)
-- to the unclaimed-shops campaign. Email 1 is left exactly as it is.
-- After email 3, shops get no more of the sequence: the site sends a
-- "new review on your page" email only when there's a new review.
-- Safe to run more than once: it updates the steps if they already exist.

with c as (
  select id from public.email_campaigns where audience = 'unclaimed_shops'
),
v(step, delay_days, subject, body) as (
  values
  (2, 7,
   'Quick follow up on {{shop_name}}',
$b$Hi,

Chris again from Underground Aquarium. {{whats_happening}}

Your page is free and it's already live. Claiming it takes one click and lets you reply to reviews, post new arrivals, and keep your hours right:

{{claim_link}}

If someone else handles this for the shop, feel free to pass it along.

Chris$b$),
  (3, 14,
   'Last note about {{shop_name}}',
$b$Hi,

I don't want to keep filling your inbox, so this is my last note about the {{shop_name}} page. {{whats_missing}}

Whenever you're ready, it's yours here:

{{claim_link}}

From now on I'll only write if something new happens on your page, like a new customer review.

Chris$b$)
),
updated as (
  update public.email_campaign_steps s
  set delay_days = v.delay_days,
      subject    = v.subject,
      body       = v.body,
      cta_label  = null,
      cta_url    = null,
      active     = true
  from c, v
  where s.campaign_id = c.id
    and s.step = v.step
  returning s.step
)
insert into public.email_campaign_steps (campaign_id, step, delay_days, subject, body, cta_label, cta_url, active)
select c.id, v.step, v.delay_days, v.subject, v.body, null, null, true
from c, v
where v.step not in (select step from updated);

-- Shops that have had email 1 exactly once (and were waiting to get it
-- again) move on to email 2 instead, 7 days after email 1 or now if that
-- has passed. Shops that already got email 1 more than once go straight
-- to news-only. Running this twice changes nothing more.
update public.email_campaign_enrollments e
set next_step = 2,
    cycle = 0,
    next_send_at = greatest(coalesce(e.last_sent_at, now()) + interval '7 days', now())
from public.email_campaigns c
where e.campaign_id = c.id
  and c.audience = 'unclaimed_shops'
  and e.status = 'active'
  and e.sent_count = 1
  and e.cycle = 1
  and e.next_step = 1;

-- Check: should show emails 1, 2 and 3, all active.
select c.key, c.repeat_days, s.step, s.delay_days, s.subject, s.active
from public.email_campaign_steps s
join public.email_campaigns c on c.id = s.campaign_id
where c.audience = 'unclaimed_shops'
order by s.step;
