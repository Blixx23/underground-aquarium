---
title: Site stats
category: Stats & members
summary: What every number on the Site stats screen counts, how the sign-up chart and newest members list work, and why a figure might not match what you expect.
order: 10
keywords: signups, new users, registrations, member count, growth, analytics, active users, unconfirmed emails, newest members, user list
pages: /admin/site-stats
---

Site stats at /admin/site-stats is a snapshot of who is joining Underground Aquarium: sign-ups today, this week and this month, total members, a 30 day chart, and the 25 newest accounts. All counts come from the sign-in accounts in Supabase, worked out fresh every time you open the page. Days are Pacific time.

## Where is Site stats?
Pick **Site stats** in the Admin side menu (subtitle "Sign-ups and members") or the **Site stats** card on the [Dashboard](/admin/help/admin-hub) ("New sign-ups, day by day, and your newest members"). The page heading is **Site stats**, with "Who's joining Underground Aquarium. Days are Pacific time."

There is no waiting count on this card; it is information only.

## What do the four tiles show?
| Tile | Big number | Line underneath |
|---|---|---|
| **Today** | Accounts created today (Pacific calendar day) | "new sign-ups" |
| **Last 7 days** | Accounts created in the last 7 x 24 hours | How that compares with the 7 days before (see below) |
| **Last 30 days** | Accounts created in the last 30 x 24 hours | "N haven't confirmed their email", counting only accounts from the last 30 days that never clicked their confirmation link |
| **All members** | Every sign-in account on the site | "N signed in this week", accounts whose last sign-in was in the last 7 days |

**Today** uses the calendar day in Pacific time, so it resets at midnight Pacific. The 7 and 30 day tiles are rolling windows counted back from this moment.

## What does the line under Last 7 days mean?
It compares the last 7 days with the 7 days before that:

- "▲ N% vs the week before" when sign-ups went up or stayed level.
- "▼ N% vs the week before" when they went down.
- "up from none the week before" when the previous week had zero and this week has some.
- "none the week before either" when both weeks are zero.

## How do I read the sign-up chart?
**New sign-ups, last 30 days** is a bar chart with one bar per Pacific calendar day, oldest on the left and today on the right. Dates are marked along the bottom about once a week, and the scale on the left rounds up to a tidy number.

Above the bars a line reads, for example, "3 sign-ups on Tue, Sep 16". When the page opens it shows the most recent day with "(most recent day · tap a bar for another)". Hover over a bar on a computer, or tap one on a phone, to read that day instead. Days with no sign-ups show as a thin faint bar.

If there were no sign-ups at all in the 30 days, the chart is replaced with "No sign-ups in this period yet."

## What is the Newest members list?
The 25 most recently created accounts, newest first. Each row shows:

- **Name:** their full name, or @username if they have no full name, or "No profile yet" if the account has no profile. The name links to their public profile when they have a username. If they have both a full name and username, the @username appears in small type beside the name.
- **Email:** their sign-in email, as a link that opens a new email to them in your mail app.
- **Confirmed** (green, envelope with a check) or **Not confirmed** (amber). Hover text: "Email confirmed" or "Hasn't clicked the confirmation email yet".
- **Joined:** how long ago, as minutes (for example "12m ago"), hours ("5h ago") or days ("3d ago"). After 14 days it shows the date instead.

If there are no accounts at all, you see "No members yet."

## Who counts as a member here?
Every sign-in account, which includes:

- people who never confirmed their email
- accounts scheduled for deletion but not yet purged
- suspended accounts
- your own admin accounts and any test accounts

Nothing is filtered out. "All members" is therefore the number of accounts, not the number of active or confirmed people. Use "N signed in this week" for a rough sense of activity.

## Is this the same as site traffic?
No. Site stats counts accounts only. Page views and visitors are in Vercel Web Analytics, which is outside the admin area. Admin visits are left out of those analytics automatically (see [Admin access and roles](/admin/help/admin-access-and-roles#what-can-admins-do-outside-the-admin-area)). Shop page traffic is on [Shop stats](/admin/help/shop-stats).

## Can I filter, export or page through members?
No. There are no filters, no date picker, no export and no way to see past the newest 25. For a full list, use Authentication, Users in Supabase, which can be sorted and exported.

## Common problems
**Today shows 0 but I know someone just joined.** The page counts by Pacific calendar day. Someone who joined late in the evening in another time zone may land on a different day. Also reload, since the numbers only update when the page loads.

**The unconfirmed number looks high.** It counts accounts from the last 30 days that never clicked the confirmation email. If it keeps climbing, sign up with a test address yourself and check the confirmation email arrives.

**Someone in Newest members shows "No profile yet".** Their sign-in account exists but the matching profile row is missing. Check the profiles table in Supabase for their id.

**The page is slow to open.** It reads every account on the site each time, in batches of 1,000, so it gets slower as the site grows. It stops after 50,000 accounts, so above that the totals would undercount.

**A total looks too low.** If Supabase returns an error partway through reading accounts, the page quietly uses what it got so far. Reload and compare.
