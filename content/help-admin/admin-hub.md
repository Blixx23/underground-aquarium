---
title: The admin Dashboard and side menu
category: Admin basics
summary: What the admin Dashboard's waiting list, counts and badges mean, how the side menu works on phone and desktop, and what the email line at the top is telling you.
order: 10
keywords: admin home, stats, reports tabs, admin menu groups, admin panel, control panel, backend, waiting count, badges, admin menu, nav, things waiting on you, everything caught up, email health banner, new shops, tank reports, events
pages: /admin
---

The admin Dashboard at /admin is your home base. It shows a one-line health check for email and a list of only the things waiting on you, oldest first. Every admin screen is in the side menu, so the Dashboard doesn't list them again. Every admin page also shows the same **Admin** side menu, so you can jump between queues without going back to the Dashboard.

## How do I get to the admin area?
1. Sign in with an account that has admin rights (see [Admin access and roles](/admin/help/admin-access-and-roles)).
2. Open your profile page at [/profile](/profile).
3. In the **Settings** group, press **Admin**. This link only appears for admins.

You can also type /admin into the address bar. There is no Admin link in the site header or footer; the profile page link is the only one.

If you are signed out, /admin sends you to the sign-in page. If you are signed in but not an admin, you get the site's "not found" page, on purpose, so the admin area doesn't advertise itself.

## What does the line under "Dashboard" mean?
Under the **Dashboard** heading is a single sentence:

- "N things waiting on you." (or "1 thing waiting on you.") when any queue has something in it.
- "Everything's caught up." when every counted queue is at zero.

The number is the total of every queue listed in [What each count measures](/admin/help/admin-hub#what-each-count-measures).

**Known issue:** the Courses count is every course that is not published yet, including drafts you are deliberately keeping unpublished. As long as you have a draft course, the Dashboard will never say "Everything's caught up." Workaround: read the individual lines instead of relying on the total.

## What is the colored email line at the top?
Just below the waiting line is a colored bar with a mail icon. It is a one-sentence verdict on the whole email system, and pressing it opens [Email](/admin/email). It is at the top because an email system that has stopped working looks exactly like one that is quiet. The possible messages, in the order they are checked:

- **Red:** "Mail is not going out. N messages have been waiting more than 30 minutes, which means the worker isn't running." Sending is on but mail is stuck in the queue.
- **Gray:** "Everything is paused. N messages waiting in the queue. Nothing sends until you turn sending on." The kill switch is on.
- **Amber:** "Sending is on, but nothing has ever gone out. Send yourself a test to prove the path works."
- **Red:** "X% of the last week bounced. Over 5% and mailbox providers start filtering you. Stop bulk sending and clean the list." Shown when bounces are 5% or more of delivered plus bounced over the last 7 days.
- **Amber:** "N spam complaints this week. Keep an eye on it; a handful is normal, a trend is not."
- **Amber:** "Sending is working. N messages gave up and are sitting in the failed list."
- **Green:** "Sending is working. N went out in the last 24 hours and nothing is stuck."
- **Red:** "The email health check couldn't run: " followed by the database error. The health check itself failed; see [Admin troubleshooting](/admin/help/admin-troubleshooting).

What to do about each one is covered in [Email queue and health](/admin/help/email-queue-and-health).

## What is the list on the Dashboard?
One line per queue that has something in it, with how many are waiting and how long the oldest has waited, oldest first. Press a line to open the page that handles it. When every queue is empty you see "Nothing is waiting. Every queue is empty."

## What each count measures
Each count is a live database count, taken fresh every time an admin page loads:

- **AI team findings:** findings with status new or open on /admin/ops.
- **Email:** messages in the email queue with status failed (they gave up after retries).
- **Society:** three queues that all add to the Society badge: membership applications still pending, award submissions waiting for review (/c/underground-aquarium-society/awards/review), and spawn logs with the judge or under appeal (/society/judge).
- **New shops:** member-suggested shops with status pending. See [New shops](/admin/help/new-shops-queue).
- **Store claims:** store claims with status pending.
- **Shop fixes:** shopper fix reports with status open.
- **Flagged posts and members:** member reports with status open.
- **Flagged tanks:** tank reports with status open. See [Tank reports](/admin/help/tank-reports-queue). Both add to the **Reports** badge.
- **Events:** community events with status pending. See [Reviewing community events](/admin/help/events-review).
- **Species:** species suggestions with status pending.
- **Species photos:** species photos with status pending.
- **Breeding videos:** breeding videos with status pending.
- **Glossary:** glossary suggestions with status pending.
- **Courses:** courses that are not published (drafts included).
- **Feedback:** feedback items with status New or In progress (both count).

All shops, Wholesale, Stats, Campaigns, Bubbles and Admin help have no count.

The list of queues lives in one file, src/lib/admin/sections.ts. The menu, the badges, the Dashboard and the AI team's morning session all read from it, so a queue added there shows up everywhere at once, and the site won't build if a new admin page is left out of it.

If one of these tables doesn't exist yet (for example, a feature whose SQL step hasn't been run), its count quietly shows as zero instead of breaking the page. A zero is therefore not proof a queue is working; see [Admin troubleshooting](/admin/help/admin-troubleshooting).

## How does the Admin side menu work?
Every page under /admin shows the same menu:

- **On a computer (wide screen):** a sticky rail on the left headed "Admin". Each item shows an icon, a label, a short subtitle, and an amber number badge when something is waiting. The page you are on is highlighted.
- **On a phone or narrow window:** a row of pill buttons across the top that you swipe sideways. Each pill shows the label and an amber number when something is waiting.

The menu is grouped under headings: **Today** (Dashboard, AI team, Stats), **Shops** (All shops, New shops, Store claims, Shop fixes, Wholesale), **Community** (Reports, Events, Feedback, Bubbles), **Content** (Species, Species photos, Breeding videos, Glossary, Courses), **Email** (Email, Campaigns), **Society** and **Help** (Admin help). On a phone the pills run in the same order without headings.

**Reports** covers two pages, shown as tabs at the top: **Posts and members** (/admin/reports) and **Tanks** (/admin/tank-reports). **Stats** works the same way: **Members** (/admin/site-stats) and **Shops** (/admin/shop-stats).

The badges use exactly the same counts as the Dashboard list.

## Why does the Society link leave the admin area?
The **Society** menu item opens the Society's own officer page at /c/underground-aquarium-society/admin. That page is part of the clubs system, not the /admin area, so:

- The Admin side menu disappears once you are there. Use your browser's back button or go to /admin to return.
- Access is decided by your role in the Society's club roster (owner, admin or officer), not by your site admin flag. A site admin who is not on the Society roster as an officer sees "Officers only" and "You don't have permission to manage this club." See [Admin access and roles](/admin/help/admin-access-and-roles).

The Society count badge still works for every site admin, because it is counted on the admin side.

## Do the counts update on their own?
No. Counts are worked out when a page loads. After you clear items in a queue, the badge updates on the next page load or navigation. Most queue screens refresh the page for you after an action, so the badge usually drops right away. If a number looks stale, reload the page.

## Common problems
**I get "not found" at /admin.** Your account isn't flagged as an admin, or you are signed into a different account. See [Admin access and roles](/admin/help/admin-access-and-roles).

**The Dashboard says something is waiting but the queue looks empty.** Some screens filter differently from the count. Feedback counts both New and In progress, but the Feedback screen opens on the **New** tab; check **In progress**. Courses counts drafts. Email counts failed messages, which live on the failed list inside /admin/email (including rows marked "Not sent · on the do-not-email list").

**The email line is red and says the health check couldn't run.** The email health database function is missing or erroring. The rest of the Dashboard still works. See [Admin troubleshooting](/admin/help/admin-troubleshooting).

**A queue I know has items shows no badge.** The count query failed (for example, the table is missing) and was treated as zero. Open the queue page itself; if it errors too, the table or SQL step is missing.

**I can't find a screen on the Dashboard.** The Dashboard only lists what's waiting. Every screen is in the side menu.
