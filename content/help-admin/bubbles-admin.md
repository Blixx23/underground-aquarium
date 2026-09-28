---
title: Awarding and deducting bubbles
category: Moderation
summary: How to grant or take away a member's bubbles on the Bubbles screen, what the member is told by notification and email, how tier-ups fire, and how to read the recent activity list.
order: 40
keywords: give bubbles, award points, add points, remove points, deduct bubbles, bubble balance, ledger, tier up, reward member, manual award, correct balance
pages: /admin/bubbles
---

Bubbles are the site's member points. Most are earned automatically, but the Bubbles screen at /admin/bubbles lets an admin grant or deduct any amount by hand, with a reason. Every change is written to the bubble ledger and the member's balance updates immediately. The member side is explained in [Bubbles](/help/bubbles) and [Bubble tiers and milestones](/help/bubble-tiers-and-milestones).

## Where is the Bubbles screen?
Pick **Bubbles** in the Admin side menu (subtitle "Award or deduct") or the **Bubbles** card on the [Dashboard](/admin/help/admin-hub) ("Award or deduct member bubbles"). The page heading is **Award bubbles**, with the line "Grant or deduct bubbles for a member. Every change is recorded in the ledger with your reason, and their balance updates immediately."

The Bubbles card never shows a waiting count, because nothing queues here.

## How do I give a member bubbles?
1. In **Member username**, start typing their username. A leading @ is fine.
2. Pick them from the dropdown. Each match shows @username, their full name and their current bubble balance.
3. Leave **Action** on **Grant**.
4. In **Amount**, type a whole number. Only digits can be typed.
5. In **Reason**, say why. This is required and is stored in the ledger and shown to the member.
6. Press **Grant bubbles**.

A green message confirms it, for example "Granted 25 bubbles to @reefkeeper, new balance 140." The amount and reason boxes clear, and the award appears at the top of **Recent activity**.

## How do I take bubbles away?
Same steps, but press **Deduct** under **Action** before submitting. The button changes to **Deduct bubbles**, and the confirmation reads "Deducted N bubbles from @username, new balance N."

Use a clear reason. The member sees it in both the notification and the email.

## How does the username search work?
- It starts searching a quarter of a second after you stop typing.
- It matches any part of a username, ignoring upper and lower case, and shows up to 8 results in A to Z order.
- It searches usernames only, not full names or emails.
- Accounts scheduled for deletion are left out. Members without a username can't be found.
- If nothing matches you see "No members match that."

You don't have to pick from the dropdown. If you type a full username and submit, the site looks it up directly (ignoring case).

## What limits apply?
- **Amount:** a whole number greater than zero. Up to 100,000 in a single change.
- **Reason:** required, and saved up to 300 characters.
- Each press is one ledger entry for one member. There is no bulk award.

## What does the member get?
For every manual change, the member gets:

- **A bell notification.** For a grant: "You earned bubbles", "You were awarded N bubbles: <reason>". For a deduction: "Bubbles adjusted", "N bubbles were removed: <reason>". Tapping it opens their profile page.
- **An email.** For a grant the subject is "You earned N bubbles" (or "bubble" for 1). For a deduction the subject is "Your bubbles were adjusted". The email shows the amount, the reason, their new balance and their current tier, with a **View your profile** button.

Emails go through the normal email queue as transactional mail. If sending is paused on [Email](/admin/help/email-queue-and-health), they wait in the queue until it is turned back on.

## What happens when an award moves someone up a tier?
If the grant pushes the member into a higher bubble tier (for example from Shallows at 25 into Kelp Forest at 75), they also get:

- a second bell notification, "New tier: <tier name>", "Your bubbles carried you into <tier name>."
- a second email with the subject "You reached <tier name>".

The tier-up only fires once per tier. If two awards land at the same moment, only one of them announces it. Deducting bubbles never sends a tier-down message.

## What is the Recent activity list?
Under the form, **Recent activity** shows the 20 most recent manual changes by any admin, newest first. Each row shows the member's @username (linking to their public profile), the reason, the date, and the amount in green (+N) or red (-N).

Only manual changes appear here. Bubbles members earn automatically are recorded in the same ledger but aren't listed. When there are no manual changes yet you see "No manual awards yet."

## Can I undo an award?
Not with an undo button. Make an opposite change: deduct the same amount with a reason like "Correcting an earlier award". The member gets a notification and email for that too.

To fix one silently, delete the entry from the bubble_events table in Supabase. The balance is recalculated from the ledger by the database, so removing an entry changes their balance. No one is notified.

## Error messages
- **"Enter a username."** The username box is empty.
- **"Enter a positive amount."** Amount is empty or zero.
- **"A reason is required, it's recorded in the ledger."** Reason is empty.
- **"No member found with the username "<name>"."** No account has that username (upper and lower case are ignored). Check the spelling or pick from the dropdown.
- **"Enter a non-zero amount."** The amount was over 100,000.
- **"Admins only."** or **"Not signed in."** Your session isn't an admin session. Sign in again.
- **"Couldn't apply that."** A network or server error. Try again; if it repeats, check the ledger in Supabase to see if it went through before retrying.

## Common problems
**The confirmation says the new balance, but the member says it didn't change.** Their profile page may be cached in their browser. Ask them to reload.

**I typed the exact username and got "No member found".** Usernames with an underscore can clash in the lookup, because the underscore is treated as a wildcard that matches any single character. If two usernames differ only where one has an underscore, the lookup finds both and gives up. Picking from the dropdown fills in the same name, so it fails the same way. Add the entry to the bubble_events table in Supabase instead (the member gets no notification or email that way).

**The member didn't get the email.** Check [Email](/admin/help/email-queue-and-health) for a paused queue, a failed message, or their address on the suppression list. The bell notification is sent either way.

**I don't see automatic awards in Recent activity.** Only manual awards are listed. See the full ledger in the bubble_events table in Supabase.
