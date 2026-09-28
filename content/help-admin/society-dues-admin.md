---
title: Society dues, payouts and renewals
category: The Society
summary: Setting annual and lifetime dues, connecting the Society's Stripe account, how payments set paid-through dates, the reminder and lapse job, dues requests, and recording offline payments.
order: 30
keywords: society dues, membership dues, annual dues, lifetime price, stripe connect, payouts, bank account, paid through, renewal date, dues reminders, lapsed, lapse, cron, dues request, receipt, cash payment, check payment, owes, paid badge
pages: /c/[slug]/admin, /c/[slug], /society/home, /api/cron/dues-reminders
---

Society dues are a real paid feature: members pay online with a card through Stripe, and the money goes to the Society's own connected Stripe account. The site takes no platform fee on dues. This guide covers the officer side. Members see theirs in [Society dues and renewal](/help/society-dues-and-renewal).

## Where are dues managed?
On the Society admin page (/c/underground-aquarium-society/admin):

- **Club settings** tile: the prices (owner and admin only).
- **Dues & payouts** tile: the Stripe connection.
- The roster's **Renewal** column: each member's standing, paid-through date and **Send dues request**.

## How do I set the dues prices?
Open **Club settings**:

- **Annual dues (USD)**: "Leave blank or 0 for a free club. Changing this affects new dues payments only."
- **Lifetime membership (one-time)**: "A single one-time price, lifetime members never owe dues again. Leave blank to not offer it."

Press **Save changes**. Amounts are stored in cents, rounded to the nearest cent. Negative numbers save as 0. The Society's join page then lists "Individual $X per year" and "Lifetime $X once · never renews" (Lifetime only when a price is set), and the application form offers the matching plans.

## What does the Dues & payouts tile show?
- Subtitle: "$X.XX to join" when annual dues are set, or "Free to join".
- A badge: **Connected**, **Finish setup** or **Not set up**.
- A line: "Members pay $X.XX to join." or "Dues are free for this club.", then one of "Connected, your club can collect dues.", "Setup started but not finished, pick up where you left off." or "Connect a bank account to start collecting dues."
- A button: **Set up dues collection**, **Finish setup** or **Update payout details**.

The tile always shows the annual price only, even when a lifetime price is set.

## How do I connect the Society's Stripe account?
1. As an owner or admin, open **Dues & payouts** and press **Set up dues collection** (it shows "Starting…").
2. The first time, the site creates a Stripe Express account named after the Society, using the email of the person pressing the button, and saves it to the Society.
3. You're sent to Stripe's onboarding to enter the business and bank details.
4. When you finish (or leave), Stripe sends you back to the Society admin page.

Each time the admin page loads, if the account isn't marked connected yet, the site asks Stripe directly. Once details are submitted and payouts are enabled, the badge flips to **Connected**. Stripe's account.updated webhook does the same thing (and can switch it back off if Stripe disables payouts).

**Known issue:** officers see the button too, but only owners and admins may use it. An officer gets "Only club owners and admins can set up dues."

**Update payout details** opens Stripe onboarding again for the same account. Payouts, bank changes, refunds and disputes are handled in Stripe's own dashboard; the site has no refund tool.

The site needs the environment variables STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, and Stripe must send checkout.session.completed and account.updated events to /api/webhooks/stripe.

## How does a member pay?
Members who owe see a box on the Society page (/c/underground-aquarium-society): "Activate your membership" (never paid), "Renew your membership" (paid before) or "Lifetime membership", with **Pay $X dues** (or **Pay $X** for lifetime). This only appears when the Society's Stripe is connected and a price is set for their plan.

The button opens Stripe Checkout for the annual price, or the lifetime price if their plan is lifetime. Errors a member might see: "This club isn't set up to collect dues yet.", "This club hasn't set a lifetime membership rate yet." or "This club has no dues for your membership type."

After paying they return to the Society page with "Dues paid, thank you! Your membership is active."

## How is the paid-through date worked out?
When Stripe confirms the payment, the webhook records it in the dues payments ledger (amount, payer name and email, Stripe ids, and the date it covers until) and sets the member to active with a new paid-through date:

- **First payment ever:** today plus 12 months (lifetime: plus 1200 months, about 100 years).
- **Paying early or on time:** the current paid-through date plus 12 months, so the anniversary never drifts.
- **Paying after lapsing:** the old date is rolled forward a year at a time until it's past today. One payment catches them up; they don't get extra time.

A receipt email ("Your Underground Aquarium Society dues receipt") goes to the payer. The same Stripe session is never recorded twice.

## What do the Renewal badges on the roster mean?
- **No dues**: the Society's annual dues are 0.
- **Covered**: a retired family plan row covered by its main member.
- **Honorary**: honorary lifetime member.
- **Lifetime**: lifetime plan with a paid-through date in the future.
- **Paid**: paid-through date is today or later.
- **Owes**: no paid-through date, or it's in the past (including a lifetime-plan member who hasn't paid the lifetime price yet).

The owner row shows no badge. Under the badge is the paid-through date with a lock icon.

## How do I send a dues request?
On a row showing **Owes**, press **Send dues request**. The member gets an email, "Membership dues for Underground Aquarium Society", with a **Pay your dues** button to the Society page. The notice reads "Dues request emailed." If sending isn't possible you see "Couldn't email, email isn't set up." Errors: "No email on file for this member." (no roster email and no linked account) or "You don't have permission to do that."

## How do I record a cash or check payment?
Only when adding a new member: **Already paid through (existing members only)** on **Add a member** sets their date once, and they come in active. "This date can't be changed later."

**Known issue:** there's no way to mark an existing member as paid from any screen. The Renewal date is locked for everyone. Workaround: in Supabase, open the club members table, find their row, set paid through to the new date and status to active. This doesn't create a dues payment record, so note it somewhere for the Treasurer.

## What does the dues reminder job do?
/api/cron/dues-reminders runs on the Vercel cron schedule and only answers requests carrying the CRON_SECRET environment variable. Each run looks at every member (except the owner and family-covered rows) whose status is active or lapsed and who has a paid-through date, in clubs with annual dues above 0:

1. **Lapsing:** anyone still active whose paid-through date has passed is set to lapsed.
2. **Reminders** (only if the club's Stripe is connected), by days until the paid-through date:
   - 10 days before: "Your Underground Aquarium Society dues renew in 10 days"
   - 3 days before: "... dues renew in 3 days"
   - The day itself: "... dues are due today"
   - 3 days after: "Your Underground Aquarium Society membership has lapsed"

Each email shows the annual amount and date, with a **Renew your membership** button to the Society page. Each reminder is logged per member per paid-through date, so it's never sent twice for the same cycle. Emails go through the email queue, so they're held (and still counted as sent) while sending is paused; see [Email queue and health](/admin/help/email-queue-and-health). The job returns how many it lapsed and emailed.

**Known issue:** reminders only fire on those exact days. If the job doesn't run on one of them (a failed run, a deploy outage), that reminder is skipped for good. Prospects who never paid have no date, so they never get reminders; use **Send dues request**.

## What happens to a lapsed member?
The member area (/society/home and everything under it) checks good standing through the database. A member not in good standing is sent back to the Society page to renew, with records and certificates waiting behind renewal. Officers and lifetime members are always let in. Public certificate checks at [Verify](/verify) are not affected. Members with a past date who can still get in see "Your dues have lapsed. Your records are safe, renew to keep submitting."

## Common problems
**A member paid but still shows Owes.** The webhook didn't land. Check the Stripe dashboard's webhook deliveries for /api/webhooks/stripe and resend the event. Resending is safe; a session is only recorded once.

**The badge is stuck on Finish setup.** Stripe still needs details. Press **Finish setup**, complete everything Stripe asks for, and reload the admin page.

**Members don't see a Pay button.** The Stripe account isn't connected, or the price for their plan is 0 or blank.

**Nobody is getting reminders.** Check the cron job's runs and that CRON_SECRET is set. Reminders also need the Stripe connection.

**A payment went to the wrong plan price.** Checkout charges by the member's plan at that moment. Fix the plan on the roster, refund or top up in Stripe, and correct the paid-through date in Supabase if needed.
