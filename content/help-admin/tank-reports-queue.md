---
title: Reviewing reported tanks
category: Moderation
summary: The Tank reports screen, where tanks flagged with Report this tank wait for review: the database step it needs, what each card shows, what Make tank private, Dismiss and Mark resolved do, and who is notified.
order: 15
keywords: tank reports, reported tank, report this tank, flagged tank, make tank private, hide tank, community tanks, tank moderation, dismiss, mark resolved, step58
pages: /admin/tank-reports, /tanks, /tanks/[id]
---

Community tanks have their own **Report this tank** button, separate from the **Report** flag used on ads, profiles and posts. Those reports land on the **Tank reports** screen at /admin/tank-reports, not in the main [Reports queue](/admin/help/reports-queue). From here you can take a tank out of public view, or close the report.

## What database step does this screen need?
Run **step58_fixes.sql** (in the sql folder of the project) once in the Supabase SQL Editor. Part B of it gives tank reports a status (open, resolved or dismissed) and records who closed each one and when. It is safe to run more than once, and its last query lists each part; every row should say ok.

Until it has been run:

- the screen shows a yellow box: "This screen needs a small database update first. Run step58_admin_queues.sql in the Supabase SQL Editor, then reload this page." (step58_fixes.sql contains that same update, so run either one),
- the Tank reports badge and Dashboard count stay at zero,
- the buttons can fail with a database message ending "Run step58_admin_queues.sql in Supabase first."

Reports members filed before you run it are kept. They all start as open, so they appear in the queue as soon as the update is in.

## Where do tank reports come from?
On a tank's page (/tanks/<id>) members press **Report this tank**, type an optional reason ("Reason (optional)…") and press **Submit report**. Each press saves one report. Several members reporting the same tank create several reports.

## Where do I find them?
Pick **Tank reports** from the admin side menu (subtitle "Community tanks flagged"), or press the **Tank reports** card on the [Dashboard](/admin) ("Community tanks members flagged for a look"). The badge and the card's "N waiting" pill count open tank reports, and the number is added into "N things waiting on you."

Only admins can open the screen. Signed out, you are sent to the sign-in page; signed in without the admin flag, you see "Admins only".

## What does each card show?
Open reports are listed newest first. Each card shows:

- The tank's first photo, or a flag icon if it has none.
- A small tag: **public**, **private**, or **deleted** when the tank no longer exists.
- The tank name, or "Tank no longer exists".
- **View tank** (opens the tank page in a new tab) and "owned by @username".
- "Reported by @username" (or their full name, or "a member") and the date.
- "Reason:" and what they typed, or "No reason given."

With nothing waiting you see "No tank reports waiting for review."

## What does Make tank private do?
Only shown when the tank still exists and is public.

1. Press **Make tank private**.
2. Confirm "Make this tank private? It will disappear from the community and the owner will be notified."

What happens:

- The tank's public switch is turned off, the same switch the owner uses in the Tank Builder. It leaves the community tanks list and its page is no longer public. Nothing is deleted.
- **Every** open report on that tank is closed as resolved, not just the one you pressed, and all of those cards leave the list.
- Each member who reported it gets "Report resolved": "Thanks, we took action on <tank name>, which you reported." (no link, because the tank is private now).
- The owner gets "Tank made private": "A moderator made your tank <tank name> private after a community report. You can still see and edit it. Questions? Write to support@undergroundaquarium.com.", linking to the tank.

The owner can make the tank public again themselves. If they do and it still breaks the rules, see [Member lookup and accounts](/admin/help/member-lookup-and-accounts).

When the tank is already private, the card shows "Already private" instead of the button. Close the report with **Mark resolved** or **Dismiss**.

## What does Dismiss do?
Use it when nothing is wrong with the tank.

1. Press **Dismiss**.
2. Confirm "Dismiss this report? No action will be taken."

Only this report is closed, as dismissed. The tank is untouched. The reporter gets "Report reviewed": "We reviewed your report about <tank name>. No action was needed." The owner is not told.

## What does Mark resolved do?
Use it when you already handled the problem another way (for example, you messaged the owner and they fixed it, or you removed a comment in Supabase). Its hover text reads "Close this report without an automatic action, for things you've already handled."

There is no confirm step. Only this report is closed, as resolved. The reporter gets "Report resolved": "Your report about <tank name> has been resolved.", linking to the tank. The owner is not told.

## Who is notified, all in one place
| Action | Reporter gets | Owner gets |
|---|---|---|
| Make tank private | "Report resolved" (we took action), every reporter of that tank | "Tank made private" |
| Dismiss | "Report reviewed" (no action needed) | nothing |
| Mark resolved | "Report resolved" (has been resolved) | nothing |

All are bell notifications; no email is sent. If the owner reported their own tank, they only get the reporter notice. A notification that fails to save never blocks the action.

## What can't this screen do?
- It can't delete a tank or edit it.
- It can't remove a comment on a tank. Delete the row in the tank_comments table in Supabase.
- It has no history. Closed reports stay in the tank_reports table with their status, reviewed time and reviewing admin.
- It can't undo **Make tank private**. Set is_public back to true on the tank's row in Supabase, or ask the owner to do it.

For a member whose tanks keep breaking the rules, suspension makes all their tanks private at once. See [Working the Reports queue](/admin/help/reports-queue#what-does-suspend-account-do).

## Common problems
**The screen shows the yellow database update box.** Run step58_fixes.sql in the Supabase SQL Editor, then reload.

**"This report was already reviewed."** Another admin closed it, or it was closed by **Make tank private** on another report for the same tank. Reload.

**"Report not found."** The report row was deleted. Reload.

**"This report isn't linked to a tank."** The report has no tank, so there is nothing to make private. Use **Dismiss** or **Mark resolved**.

**A card says "Tank no longer exists".** The owner deleted the tank. Close the report with **Mark resolved**.

**View tank shows "not found" on a private tank.** The tank page reads the tank as you, and the database may only show private tanks to their owner. Check the tank in the tanks table in Supabase instead.

**Other members still see the tank after I made it private.** Reload the tank page. The tank page and the tanks list are refreshed when you press the button, but a browser can show an old copy.
