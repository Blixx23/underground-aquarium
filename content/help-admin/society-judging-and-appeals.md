---
title: Judging spawn logs and appeals
category: The Society
summary: How Breeder Award Program entries move from spawn log to peer review to the judge, the Judge's Desk, rulings and points, appeals, the reviewer audit, the species point list and member titles.
order: 40
keywords: judge, judge's desk, spawn log review, peer review, blind review, reviewers, escalation, send to judge, appeal, ruling, points, first in society, bonus, point list, species list, BAP, HAP, titles, ladder, reviewer audit, pool threshold, judge only mode
pages: /society/judge, /society/logs/[id], /society/review, /society/review/[id], /c/[slug]/awards/list, /c/[slug]/admin, /society/leaderboard
---

Breeder Award Program entries are spawn logs: a member opens a log for a species, records five photo stages with a handwritten challenge code, and submits it. Peers review it blind, and a judge settles anything they can't. Members see their side in [Breeder Award Program](/help/breeder-award-program) and [Spawn logs and submissions](/help/spawn-logs-and-submissions).

## How does an entry move through review?
Each spawn log has one of these statuses (members see the label in brackets):

- **open** (In progress): the member is still logging stages.
- **submitted** (Submitted): sent for review.
- **in_review** (Peer review): with peer reviewers, blind in both directions, seven days each.
- **awaiting_judge** (With the judge): escalated, high value, or something peers couldn't settle.
- **approved** (Approved) or **rejected** (Rejected).
- **appealed** (Under appeal): the member appealed a peer rejection.
- **withdrawn** (Withdrawn).

The routing rules (who reviews, when something goes to the judge, unanimous panels) live in the database functions, not in the pages.

## What is judge-only mode?
While the Society has fewer active members than its pool threshold (20 unless changed), every entry goes straight to the judge. At or above it, routine entries go to three random members.

The Judge's Desk shows which mode is on:
- "Peer review is on, N active members. Routine entries are settled by members; only the cases below reach you."
- "Judge-only mode, N of 20 members. Every entry comes to you until the Society reaches 20."

**Known issue:** the threshold, the minimum reason length (20 characters by default) and the appeal window (30 days by default) are stored in the society review settings table, with no screen to change them. Edit them in Supabase.

## Who is a judge?
Whoever the database's judge check says. Judges get **Judge's Desk** in the member area menu, with a badge counting what's waiting.

**Known issue:** there's no screen to add or remove judges. Roles and officer titles on the Society admin page don't change it. Changes have to be made in the database.

A judge's own entries never come to them. They go to peers and need a unanimous panel ("every one must approve"), and judges can't appeal their own rejections.

## What's on the Judge's Desk?
/society/judge, titled **Judge's desk**: "Escalations, appeals, high-value records and anything peers couldn't settle. Your own entries never appear here, they go to peers and need a unanimous panel."

Under the mode banner:

- **Waiting on you**: one row per entry with the species, "· member name", why it's here (the judge reason, or "Appeal"), and the peer votes so far as approvals ✓, denials ✗ and escalations ⚑. Click a row to open the log. Empty: "Nothing waiting. The desk is clear."
- **Reviewer audit** (next section).

Opening the desk (or anyone opening their Review Queue) first runs the overdue sweep: any peer review past its seven days is reassigned.

**Known issue:** that sweep is the only thing that reassigns overdue reviews. There's no scheduled job, so if nobody opens the Review Queue or Judge's Desk, overdue reviews sit.

## What is the reviewer audit?
A row per peer reviewer: their name, "N reviews · N% approve", "· N% accurate" when it can be measured, and "· N missed" for deadlines they let lapse. Reviewers the database flags get an amber pill with the reason, and a line above reads "N reviewers worth a look." Empty: "No reviews have been cast yet." It's for spotting rubber-stampers and no-shows; there's no button to remove someone from the reviewer pool.

## How do I rule on an entry?
Open it from the desk. The **Judge's ruling** panel sits above the stages:

- "Why it's here:" and the judge reason.
- For appeals, "Member's appeal:" and their reason.
- **Points**: pre-filled with the species' list value ("List value N"), or blank with "Not on the list".
- **Note (the member reads this)**: "Required to reject, or to set points off the list."
- **Approve** and **Reject**.

"Rulings are final and can't be appealed. First in Society records are awarded the 50% bonus automatically on approval." After a ruling the page refreshes and the member sees "Approved, N points" (with "· First in Society" when it applies) or "Not approved", plus your note. An approved member can download their breeder certificate straight away.

Judges can rule on entries that are with the judge, under appeal, or still in peer review.

**Known issue:** the judge's view of a log shows the stages as small thumbnails, without the challenge code and without the metadata, timing and region checks that peer reviewers get. To check the code, compare it against the challenge code on the spawn log's row in Supabase, and open the photo addresses stored on the log's stages (the spawn log stages table) to see them full size.

## What do peer reviewers do?
Assigned members see entries under **Review Queue** (/society/review), with days left ("3d left", "due today"). The review page shows the challenge code to look for, the setup notes, each stage with its photos and three checks (Metadata, Timing, Region: a check, a warning, or a dash for "couldn't tell"), then four boxes:

1. "The challenge code is clearly visible in the stage 1 photo."
2. "The same code is clearly visible in the stage 5 photo."
3. "The fish shown match the species claimed."
4. "Eggs, fry and grow-out photos show a believable progression in the same setup."

**Approve** unlocks when all four are ticked. **Deny** and **Send to judge** need a reason of the minimum length. A reviewer who is too late sees "This review passed its deadline and has been reassigned. Thanks anyway, it's off your list."

## How do appeals work?
A member can appeal once, only when peer reviewers rejected the entry (no judge ruling on it), from the rejected log: **Appeal to the judge**, a reason of the minimum length, then **File appeal**. The entry becomes appealed and lands on the Judge's Desk labeled "Appeal", with the member's reason in the ruling panel. Your ruling on an appeal is final.

The log page tells the member they can appeal "within 30 days" (or the configured window). The page itself doesn't check the date before showing the button; any cutoff is applied by the database when the appeal is filed.

## How do I manage the species point list?
Officers open it from the admin page's **Breeder Award Program** tile, **Point list** (/c/underground-aquarium-society/awards/list), or from **Build the point list** on an empty Breeder Program page. Non-officers see an officers-only message.

"Set the point values for Underground Aquarium Society. Changes apply to new submissions, already-approved entries keep the points they were awarded, so no one's total changes when you retune the list."

- Switch between **Fish (BAP)** and **Plants (HAP)**.
- Add an entry: common name, "Scientific name (optional)", "Category (e.g. Cichlids)" (suggests existing categories) and points, then **Add**. Errors: "Enter a name." or "Enter a valid (non-negative) point value."
- Entries are grouped by category. Change a number and a **Save** button appears. The trash can removes an entry after "Remove [name] from the point list?".

The standard classes are A 5, B 10, C 15, D 20, E 25 and F 40 points. Any other value shows as its own point count rather than a class letter.

## How do member titles work?
On the same page, **Member titles**: "Titles members earn as their total points grow. A member is given the highest tier their points reach." Each tier has **Points (min)** and a title. **Add tier**, remove with the X, then **Save titles**. "Every tier needs a name." and "Enter a valid point value for "[title]"." are the errors. With none set: "No titles set, members won't show a rank." The title appears on the member's nav plate and card.

## What does the Breeder Award Program tile on the admin page do?
It has **Review submissions** and **Point list**. **Review submissions** goes to the old club review page, which now redirects to the Judge's Desk.

**Known issue:** the amber number on the tile (and on **Review submissions**) counts the old award submissions table, not spawn logs, so it doesn't show what's waiting for the judge. Use the Judge's Desk badge instead. The same old table drives the badge on members' **My Submissions** menu item.

## Common problems
**An entry has sat in peer review for weeks.** Open the Review Queue or Judge's Desk to trigger the overdue sweep. As a judge you can also rule on it directly.

**"Couldn't record the ruling." or a database message.** Usually a missing note (required to reject or to set off-list points) or the entry is no longer in a state a judge can rule on. Reload the log.

**Points on the leaderboard look wrong after changing the list.** Changing the list only affects future approvals. Approved entries keep their points.

**A member says their approved record isn't on the leaderboard.** Totals come from the database's standings. See [Society leaderboard](/help/society-leaderboard) for what members see.
