---
title: Admin troubleshooting
category: Admin basics
summary: Fixes for the admin area not opening, counts that look wrong, pages that say a SQL step is missing, scheduled jobs that don't run, and the known gaps in the admin tools.
order: 30
keywords: admin broken, admin 404, not found, admins only, officers only, zero counts, sql step, supabase error, cron not running, scheduled jobs, env vars, environment variables, service role key, cron secret
pages: /admin, /admin/email, /admin/shop-stats, /admin/site-stats, /admin/reports, /admin/tank-reports, /admin/feedback
---

Most admin problems come from one of four things: the account isn't flagged as an admin, a database step hasn't been run, an environment variable is missing in Vercel, or a known gap in the tools. This guide goes through each, in the order you are most likely to hit them.

## I get "not found" when I open /admin
The admin area answers "not found" to any signed-in account without the admin flag, on purpose. Check:

1. You are signed into the account you think you are. Open /profile and look at the name.
2. That account's row in the Supabase **profiles** table has **is_admin** set to true.
3. You reloaded after changing the flag.

Full steps are in [Admin access and roles](/admin/help/admin-access-and-roles). If you are signed out, /admin sends you to /login instead.

## An admin button says "Admins only." or "Not signed in."
Every admin action checks your session again on the server. "Not signed in." means your session expired: sign in again. "Admins only." means you are signed in, but not as an admin, often because a second account is signed in on the same browser. Sign out, sign in with the admin account, and repeat the action.

## The Society page says "Officers only"
The Society management page (/c/underground-aquarium-society/admin) is controlled by the Society's club roster, not by the site admin flag. Add your account to the Society roster with the owner, admin or officer role. See [Admin access and roles](/admin/help/admin-access-and-roles#site-admins-vs-society-and-club-officers).

## A count on the Dashboard is zero but I think it shouldn't be
Dashboard and menu counts treat any database error as zero, so a missing table never breaks the admin area. That also means a zero can hide a problem. To check:

1. Open the queue screen itself. If it errors or looks broken, the table or its SQL step is missing.
2. In Supabase, open the table (for example reports, feedback, store_claims) and look for rows with the waiting status.

What each count measures is listed in [The admin Dashboard and side menu](/admin/help/admin-hub#what-each-count-on-the-dashboard-measures).

## A count says something is waiting but the screen is empty
- **Feedback** counts New and In progress, but the screen opens on the New tab. Check **In progress**.
- **Courses** counts every unpublished course, including drafts. It never clears while you have a draft.
- **Email** counts failed messages, which sit in the failed list on /admin/email. Rows marked "Not sent · on the do-not-email list" count here too.
- **Tank reports** before step58_fixes.sql has been run: the count shows zero, and the screen shows a yellow box asking for the database update.
- Counts only update on page load. Reload.

## A page says to run a SQL step
Some screens tell you the database part of a feature hasn't been set up:

- **Shop stats:** "The report couldn't load. If this is the first time, run step 53's SQL in Supabase."
- **Shop visibility switch:** an error ending in "Run step 56 in Supabase first." The same hint can appear when you press **Reject** on [New shops](/admin/help/new-shops-queue).
- **Tank reports:** "This screen needs a small database update first. Run step58_admin_queues.sql in the Supabase SQL Editor, then reload this page." Run **step58_fixes.sql** from the sql folder instead: it includes that tank reports update plus the forum "(edited)" column and the Society delete guard, and it is safe to run more than once. Its last query lists each part; every row should say ok.
- **Forum "(edited)" labels missing:** no message appears, but edits don't show "(edited)" until step58_fixes.sql has been run.

Run the named step's SQL in the Supabase SQL editor, then reload. If the step has been run and the message stays, the database function itself is erroring; the Supabase logs will show why.

## The email line on the Dashboard says the health check couldn't run
It reads "The email health check couldn't run: " plus the database error. The email_health database function is missing or failing. Everything else still works, but you have no warning if mail stops. Fix the function in Supabase, then reload /admin. See [Email queue and health](/admin/help/email-queue-and-health).

## Every admin page is broken at once
All admin screens read the database with the Supabase service role key. If it is missing or wrong in Vercel, every queue fails together. Check these environment variables in the Vercel project:

- **NEXT_PUBLIC_SUPABASE_URL** and **SUPABASE_SERVICE_ROLE_KEY**: the database connection used by every admin screen and action.
- **CRON_SECRET**: required by every scheduled job. Without it, every job answers "Unauthorized" and does nothing.
- **RESEND_API_KEY**, **RESEND_FROM** and **RESEND_FROM_BULK**: email sending.
- **NEXT_PUBLIC_SITE_URL**: the site address used in links inside emails.

After changing an environment variable, redeploy so the site picks it up.

## Which scheduled jobs does the site run?
These live under /api/cron and are run by Vercel Cron. Each one refuses to run unless the request carries the CRON_SECRET.

| Job | What it does (from the code) |
|---|---|
| email-worker | Sends what the email queue is holding. Runs every two minutes. |
| email-health | Emails support@undergroundaquarium.com only when something is wrong with email. |
| campaign-planner | Once a day: enrolls new shops in campaigns, drops those who claimed or opted out, and queues the day's campaign mail. |
| shop-alerts | Every 10 minutes: builds claimed shops' weekly reports on Monday mornings (8am Pacific) and emails shop alerts. |
| dues-reminders | Emails club members when their membership expires in 10 days, in 3 days, expires today, and when it has lapsed. Society reminders link to the renewal box. |
| expire-listings | Flips classified ads past their expiry date from active to expired. |
| bubble-milestones | Once a day: grants the yearly anniversary bubble awards. |
| purge-accounts | Daily: permanently removes accounts whose 30 day deletion window has passed. |

The schedule for each job is set in the Vercel project's cron settings, not in the admin area.

## A scheduled job doesn't seem to run
1. Check **CRON_SECRET** is set in Vercel. A missing secret makes every job refuse.
2. Check the job's recent runs and logs in Vercel.
3. For email, the Dashboard's red "Mail is not going out" line means the email-worker job isn't running. See [Email queue and health](/admin/help/email-queue-and-health).

Each job can be run by hand by calling its address with the header Authorization: Bearer followed by your CRON_SECRET. Only do this if you understand what the job sends; running a mail job by hand sends real mail.

## My change doesn't show on the site
Every admin page is built fresh on each load, and member pages that read the changed data update on their next load. If something still looks old:

1. Reload the page.
2. Make sure the action actually finished (the card disappeared, or a green message appeared).
3. In Supabase, check the row changed.

## Known gaps in the admin tools
These are limits in the current code, with the workaround for each:

- **Feedback** can't be sent by members, because the feedback widget isn't on the site. See [The Feedback queue](/admin/help/feedback-queue).
- **Forum threads** have no lock or pin button. Set is_locked or is_pinned in Supabase. See [Moderating the feed and forums](/admin/help/moderating-feed-and-forums).
- **Tanks** nobody reported can't be hidden from the site. Set is_public to false in Supabase, or wait for a report on [Tank reports](/admin/help/tank-reports-queue).
- **Suspensions from before 27 September 2026** have no saved list of hidden ads and tanks, so **Unsuspend** restores sign-in but not their ads or tanks. See [Member lookup and accounts](/admin/help/member-lookup-and-accounts#how-do-i-lift-a-suspension).
- **No make-admin and no member directory** on the site. These are done in Supabase.

## My own visits show up in analytics
When an admin signs in, the browser stops sending visits to Vercel Web Analytics, checked once per browser visit. On a device where you don't sign in, open any page with ?notrack=1 on the end of the address. ?notrack=0 turns counting back on.

## Common problems
**/admin opened yesterday, today it's "not found".** Someone changed the is_admin flag, or you're signed into another account. Check the profiles row.

**Every queue shows zero and every page errors.** Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in Vercel, then redeploy.

**Emails stopped and the Dashboard is red.** The email worker isn't running. Check CRON_SECRET and the job's logs in Vercel.

**Tank reports is empty but members say they reported a tank.** If the screen shows the yellow database update box, run step58_fixes.sql. Reports filed before that are kept and appear once it has been run.

**I did something by mistake.** Most admin actions have no undo button. The undo steps in Supabase are listed in each guide, for example [Working the Reports queue](/admin/help/reports-queue#can-i-see-past-reports-or-undo-an-action).
