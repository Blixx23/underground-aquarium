---
title: The Feedback queue
category: Moderation
summary: How the Feedback and bugs screen works, what New, In progress and Done mean, how search works, and why the queue is probably empty right now.
order: 50
keywords: bug reports, ideas, suggestions, tester feedback, feature requests, feedback widget, send feedback, triage, bug tracker
pages: /admin/feedback
---

The Feedback screen at /admin/feedback is a small bug and idea tracker. Each item is a Bug or an Idea with a message, and you move it from New to In progress to Done. Members are never notified when you change an item's status; it is purely your to-do list.

## Where does feedback come from?
Feedback is meant to arrive from a floating **Send feedback** button where testers pick **Bug** or **Idea**, type a message, and send it along with the page they were on. Sign-in is optional, so feedback can be anonymous.

**Known issue:** that **Send feedback** widget exists in the code but isn't placed on any page of the live site, so members have no way to send feedback. The queue will stay empty until the widget is added back to the site layout. Members who want to reach you use support@undergroundaquarium.com instead (see [Contacting support](/help/contact-support)); those emails don't show up here.

## Where is the Feedback screen?
Pick **Feedback** in the Admin side menu (subtitle "What members sent in") or the **Feedback** card on the [Dashboard](/admin/help/admin-hub) ("What members have written in about").

The page heading is **Feedback & bugs**, with the line "Bug reports and ideas testers have sent in. Start one when you pick it up, mark it done when it's handled, and search across all of them to check whether something has come up before."

## What does the waiting count include?
The badge on the menu and the "N waiting" pill on the Dashboard card count every item that is **New** or **In progress**. Items you have started still count until you mark them done.

## What do the tabs mean?
A row of tabs sits above the list, each with its count:

- **New** (the tab the page opens on): items nobody has picked up.
- **In progress**: items you've started.
- **Done**: finished items.
- **All**: everything loaded on the page.

The page loads every New and In progress item, plus the 200 most recent Done items. Older Done items aren't shown or searched; they are still in the feedback table in Supabase.

Empty tab messages: "Nothing new right now.", "Nothing in progress.", "Nothing finished yet." and, on All, "No feedback yet."

## What does each feedback card show?
- An icon and a pill: **Bug** (bug icon) or **Idea** (light bulb).
- A status pill: **New**, **In progress** or **Done**.
- The full message, with its line breaks. Messages are saved up to 4,000 characters.
- "Submitted from" and the page the person was on, as a link that opens in a new tab ("the homepage" for /).
- "From @username", or their full name, or "Anonymous" if they weren't signed in, plus the date.

Done items are shown slightly faded.

## How do I move an item through the queue?
The buttons change with the status:

| Status | Buttons |
|---|---|
| New | **Start** (moves it to In progress), **Mark done** |
| In progress | **Mark done**, **Back to new** |
| Done | **Reopen** (moves it back to New) |

Nothing asks you to confirm. The status pill changes right away and the item moves to the matching tab. Each change records when it happened and which admin did it. There are no bulk actions.

No one is notified of any status change. If you want to thank a tester or tell them a bug is fixed, contact them yourself.

## How does Search feedback work?
Type in the **Search feedback** box. It filters the current tab as you type, matching any part of the message, the sender's username or name, the page address, or the type (bug or idea). Upper and lower case don't matter.

To search everything, switch to **All** first. If nothing matches, you see "No feedback matches "<your words>"."

Search only covers items loaded on the page, which means Done items beyond the latest 200 aren't searched.

## Can I reply to, edit or delete feedback?
No. There is no reply, edit or delete button. To remove an item for good, delete its row from the feedback table in Supabase.

## Common problems
**The queue is always empty.** Expected right now. The **Send feedback** widget isn't on the site, so nothing can be submitted. See [Where does feedback come from?](/admin/help/feedback-queue#where-does-feedback-come-from).

**The Dashboard says feedback is waiting but the New tab is empty.** The count includes In progress items. Check the **In progress** tab.

**An old item I remember isn't in search.** Only the 200 most recent Done items are loaded. Look in the feedback table in Supabase.

**"Missing feedback or status." or "Admins only."** The page is out of date or you aren't signed in as an admin. Reload and sign in again if needed.
