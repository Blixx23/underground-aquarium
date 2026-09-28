---
title: Running email campaigns
category: Email & campaigns
summary: How campaigns enroll shops, plan and queue each email, and repeat; every control on the campaign pages, editing steps, placeholders, tests and stats.
order: 20
keywords: email sequence, drip campaign, outreach campaign, campaign steps, enrollments, planner, repeat interval, placeholders, merge tags, test email, dry run, run now, stop enrollment
pages: /admin/campaigns, /admin/campaigns/[key]
---

A campaign is a sequence of emails with a rule about who gets it. The campaign planner decides who is due and writes their email into the same queue as the rest of the site's mail, so the pause switches and the daily cap on the [Email](/admin/email) page still apply on top of anything a campaign does.

## Where are campaigns?
Pick **Campaigns** in the admin side menu (subtitle "Sequences and who is in them") or on the admin [Dashboard](/admin) ("Email sequences and the shops walking through them"). The list is at /admin/campaigns and each campaign has its own page at /admin/campaigns/[key].

Campaigns are created in the database. There is no button to create a new campaign or change its audience; the pages let you switch one on and off, set how often it repeats, and edit its emails.

## What does the campaigns list show?
Campaigns are listed by name. Each card shows:

- the name and an **On** (green) or **Off** badge,
- its description,
- its audience, for example "Every shop in the directory nobody has claimed", and "every N days" or "once each",
- a stats line: "N on the list · N emails sent · N claimed their shop · N shops eligible".

If bulk or all email is paused, a grey note says "Bulk email is paused right now, so nothing here will actually go out. Campaigns can still be turned on and edited." with a link to the email panel. With no campaigns you see "No campaigns yet." The **Remove from outreach** box sits at the bottom (see [Shop outreach](/admin/help/shop-outreach)).

## Who gets a campaign?
The only audience the planner knows is **unclaimed shops**: "Every shop in the directory with an email address that nobody has claimed. Shops are added automatically as they land in the directory, and drop out the moment they claim their page, unsubscribe or bounce."

On each run the planner adds (enrolls) every shop that:

- has a contact email on file,
- hasn't opted out of outreach,
- nobody has claimed,
- is shown in the directory (hidden shops are never enrolled),
- isn't already in this campaign, and
- whose address isn't on the Do not email list.

A campaign with any other audience enrolls nobody.

A shop is only ever enrolled once per campaign. Once it is stopped or finished, it is never re-added, even if it is later un-hidden or unclaimed.

## When does a shop drop out?
On every run, before sending anything, the planner stops active enrollments whose shop:

- has been claimed (shown as "claimed their page"),
- is no longer shown in the directory,
- has opted out of outreach, or
- has an address on the Do not email list (bounced, complained or unsubscribed).

You can also stop one by hand with **Stop** in the **Who is in it** list ("stopped by you").

## How often does the planner run?
The campaign planner job (/api/cron/campaign-planner) runs once a day according to its own notes. It runs every campaign that is **On**. For each, it enrolls, drops out, then queues whatever is due. The email worker then sends the queued mail every two minutes, subject to the switches and the cap.

The planner keeps the queue about one day deep: it only queues as many as the daily bulk cap minus what has already been sent today and what is still waiting. People who have heard from you the fewest times go first, then whoever has been due the longest.

**Known issue:** that budget is shared. The first campaign that runs can use all of it, leaving nothing for the others that day.

## What do the campaign page stats mean?
- **On the list**: active enrollments.
- **Due now**: enrollments whose next email is due.
- **Never written to**: enrolled but not yet sent anything.
- **Emails sent**: emails this campaign has handed over.
- **Claimed their shop**: stopped because they claimed.
- **Dropped out**: all stopped enrollments.
- **Next one goes**: the date the next email is due.
- **Sends per day**: the daily bulk cap from the Email page.

Under the name you also see the audience description and a plain summary of the schedule, such as "3 emails, then it stops.", "One email, and again every 42 days until they claim or opt out." or "3 emails, then back to the first one every 42 days."

**Known issue:** "sent" here means handed to the queue. An email counts as sent to that shop when the planner queues it, even if it is later cancelled, held by a pause, or bounces. The Email page is the record of what really went out.

## How do I turn a campaign on or off?
Press **Turn the campaign on** or **Turn the campaign off** on the campaign's page.

- On: "Campaign is on." The daily planner will run it.
- Off: "Campaign turned off. Nobody new will be added." The daily planner skips it entirely, so nobody new is added and nothing new is queued. Mail already in the queue is not cancelled; cancel it on the Email page if needed.

## What do "What would a run do?" and "Run it now" do?
- **What would a run do?** is a read-only dry run. It counts what a real run would do and changes nothing: nobody is enrolled or stopped, no email is queued, and nobody moves to their next step. It reports "A run right now would add N shops, drop N, and queue N emails to shops already on the list. Nothing was changed." When the campaign is Off, the message starts "This campaign is off, so nothing will run. If it were on, a run right now would..." It is safe to press at any time, including while the campaign is Off.

- **Run it now** does a real run immediately: "Added N, dropped N, queued N. The queue sends them, subject to the pause switch and the daily cap." It only works while the campaign is **On**. While the campaign is Off the button is greyed out (hovering says "Turn the campaign on first") and a line under the buttons reads "Run it now is off while the campaign is off. What would a run do? still works and changes nothing." If a stale page sends the request anyway, it is refused with "This campaign is turned off, so nothing was run. Turn the campaign on first, then press Run it now."

The queued count in the dry run only covers shops already enrolled. Shops a real run would add get their first email on the run after they are added, or on the same run if they are due straight away.

The safe way to test a whole campaign is the one the page suggests when bulk is paused: "turn the campaign on, press Run it now, and read what lands in the queue on the email panel." With bulk paused, nothing leaves, and you can **Cancel** anything you don't like.

## How does repeating work?
The **Write to each shop every [N] days** box sets the repeat interval, 0 to 365. Press **Save**.

- A number above 0: "They'll hear from you every N days until they claim or opt out." After the last email, a shop goes back to the first active email, one round higher, due again after that many days. The round number keeps each repeat distinct, so the same email can go out again next round without being treated as a duplicate.
- 0: "Repeating turned off. Each shop gets it once." After the last email the enrollment is marked finished.

## How do I edit an email in the sequence?
Under **The emails**, each step is a card:

- A numbered square (amber when on, grey when off) and a title, "Email N" (or "The email" for a single repeating email).
- A line saying when it goes: "Goes out when a shop joins" for the first, or "Waits N days after the previous one", plus the repeat note on the last one.
- **Days to wait after the previous email** (steps 2 and up only), 0 to 365.
- **Subject** (required, up to 300 characters).
- **The email**: plain text, up to 20000 characters. "A blank line starts a new paragraph. A link on its own line becomes clickable." Any web address in the text becomes a link.
- **Closing link text** and **Closing link address**: optional. Both must be filled for a closing link to appear. It renders after the last paragraph as an underlined link with the address in small print underneath, so leave both blank when the email ends with your name.

Press **Save changes** (it reads **Saved** when nothing has changed). Edits take effect on the next run. A shop never gets the same step twice in the same round, so fixing a typo won't resend an email that already went out.

The first email's wait cannot be edited on this page.

## What placeholders can I use?
The page lists them under "Things you can drop into the subject or the body":

- `{{shop_name}}`: the shop's name.
- `{{whats_happening}}`: a true sentence about their own shop, such as how many people opened their page in the last month, recent reviews, or sightings.
- `{{whats_missing}}`: what is visibly missing from their page (hours, photos, a description), or nothing if it's complete.
- `{{claim_link}}`: the one-press claim link, signed for that shop, no form to fill in.
- `{{page_url}}`: a plain link to the shop's page.
- `{{city}}` and `{{state}}`.
- `{{claim_url}}`: the old link to the claim form on the shop's page.

Any other `{{word}}` becomes blank. One extra: if the whole subject is exactly `{{subject_hook}}`, the planner picks the best true subject for each shop (for example "N people looked up [shop] last month" or "[shop] is listed without its hours"). It only works as the entire subject.

## How do I preview and test an email?
- **Preview** shows the email as a shop would see it, filled in against a real unclaimed shop (the first one alphabetically), including the footer. It previews what's in the boxes, even unsaved.
- **Send me this one** sends the saved version to your own sign-in address with "[test]" before the subject and a note saying which shop it was written for. It goes out as bulk mail, from the bulk address with the unsubscribe headers, even while paused, so it proves the real path. You see "Test sent to ...". The button is greyed out until you save ("Save first, the test sends the saved version").

If there are no unclaimed shops, the page says "There are no unclaimed shops to preview against yet." and hides the step editors.

**Known issue:** the preview shop is picked without checking whether it's hidden, so the preview can be written for a shop that isn't in the directory.

## How do I add, turn off or delete an email?
- **Add another email** adds a new step at the end with a 7 day wait, the subject "Subject line" and placeholder text, turned **off**: "Added an email at the end, turned off until you finish it."
- **Turn off** / **Turn on** on a step card. An off step is skipped: shops due for it move straight on to the next one.
- **Delete** appears only on the last step, and never on step 1. Emails already sent from it stay in the queue history.

## What is the Who is in it list?
The 25 most recently contacted enrollments. Each shows the shop name (linked to its page) or the address, then "address · N sent ·" and either "next on [date]", "finished", or why it stopped: "claimed their page", "unsubscribed", "stopped by you". Active ones have a **Stop** button.

With nobody enrolled it says "Nobody yet. Press Run it now to add shops."

**Known issue:** shops dropped because their page was hidden show just "stopped", because that reason has no label.

## What is the footer on every campaign email?
Every campaign email is wrapped in a plain letter layout: the wordmark, your text, and a footer saying "You're getting this because your shop is listed in our free directory.", an **Unsubscribe** link ("Unsubscribe to stop these emails.") and the postal address. The unsubscribe link and the one-click unsubscribe header are added automatically. An unsubscribe stops all marketing and outreach mail to that address (every campaign and any shop outreach). If the same person has a member account, their account, message, Society dues and shop alert emails still arrive. See [Shop outreach](/admin/help/shop-outreach) and [Email queue and health](/admin/help/email-queue-and-health#what-is-the-do-not-email-list).

## Common problems
**"Repeat between 0 and 365 days."** / **"Wait between 0 and 365 days."** The number is out of range.

**"A subject line is required."** / **"The email can't be empty."** Fill in both before saving.

**"No unclaimed shop to preview against."** Every shop is claimed, so there's nothing to write the test for.

**Run it now is greyed out.** The campaign is Off. Turn it on first.

**Run it now queued 0.** The budget is 0 (cap reached or the queue already holds a day's worth), nobody is due yet, or the campaign has no steps.

**The campaign is on but nothing goes out.** Check the Email page: all email or bulk may be paused, the cap may be reached, or `RESEND_FROM_BULK` may be missing.

**A shop I removed is still listed as active.** It drops out on the next run. Use **Stop** to end it now.
