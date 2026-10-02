-- Step 54: timeless shop sign-up emails (no stats, no dates, no "launching" talk).
-- Rewrites steps 1-3 of the unclaimed-shops campaign. Safe to run more than once.

with c as (
  select id from public.email_campaigns where audience = 'unclaimed_shops'
)
update public.email_campaign_steps s
set subject   = v.subject,
    body      = v.body,
    cta_label = null,
    cta_url   = null,
    active    = true
from c, (values
  (1,
   '{{shop_name}} is listed on Underground Aquarium. Want the keys?',
$b$Hi there,

I'm Chris, and I run Underground Aquarium, a free site where fish keepers find local stores, look up species, and swap tips.

{{shop_name}} already has a page on the site. It's free to claim, and once it's yours you can:

- keep your hours, phone number and details correct
- post restocks and new arrivals straight to your followers
- reply to customer reviews
- get a short report every Monday showing how many people found you

There's no cost, no contract and nothing to sell through us. The page is there to send people through your door.

Claim {{shop_name}} here: {{claim_link}}

Chris Lewis
Underground Aquarium$b$),
  (2,
   'Quick follow-up on {{shop_name}}''s page',
$b$Hi again,

Just following up in case my last note got buried. {{shop_name}}'s page on Underground Aquarium still hasn't been claimed.

Keepers in {{city}} use the site to decide where to shop, and claiming the page takes about a minute:

{{claim_link}}

If someone else handles this for the shop, feel free to pass it along.

Chris$b$),
  (3,
   'Last note about {{shop_name}}',
$b$Hi,

This is my last note about {{shop_name}}'s page. If you'd like to take it over, here's the link:

{{claim_link}}

No problem if not. You can claim it any time from the bottom of the shop's page.

Chris$b$)
) as v(step, subject, body)
where s.campaign_id = c.id
  and s.step = v.step;

-- Check: should show the three new subjects.
select c.key, s.step, s.delay_days, s.subject, s.cta_label, s.active
from public.email_campaign_steps s
join public.email_campaigns c on c.id = s.campaign_id
where c.audience = 'unclaimed_shops'
order by s.step;
