---
title: Shop outreach emails
category: Email & campaigns
summary: How unclaimed fish stores get emailed, where their addresses come from, what the emails contain, how unsubscribe and removal requests work, and what shops see.
order: 30
keywords: store outreach, cold email, shop contacts, store contacts, unsubscribe link, opt out, remove me, take me off, one click unsubscribe, claim link email, outreach reply, list-unsubscribe
pages: /admin/campaigns, /admin/campaigns/[key], /admin/email, /api/email/unsubscribe, /claim/[slug], /stores/[slug]
---

Shop outreach is how unclaimed fish stores in the directory hear about their free page and are invited to claim it. It runs as an email campaign to unclaimed shops, through the same queue as all other site mail. This guide covers the whole path from a shop's address to an unsubscribe, as the site's code handles it.

## Where do shop email addresses come from?
Outreach only writes to addresses in the shop contacts list, one contact per shop, stored separately from the public shop page. The public page never shows it.

There is no screen in the site for adding or editing shop contact addresses, and no import script in this code; the list is filled in directly in the database. A shop with no contact address is never emailed.

## Which shops get outreach?
The planner enrolls a shop into an unclaimed-shops campaign when it has a contact address, hasn't opted out, nobody has claimed it, it's shown in the directory, and its address isn't on the Do not email list. It drops the shop the moment it's claimed, hidden, opted out, bounced or complained. The details are in [Running email campaigns](/admin/help/campaigns).

Shop owners who have claimed their page get a different set of emails (review alerts, fix alerts, milestones and a weekly report) sent to the address they sign in with, not outreach. Those are described for owners in [Shop notifications and emails](/help/shop-notifications-and-emails).

## What does an outreach email look like?
It's written to look like a letter, not an advert, because Gmail sorts mail into Promotions mostly by its shape:

- a small wordmark and a rule at the top,
- the step's text, in plain paragraphs, with bare web addresses turned into links,
- an optional closing link (underlined, never a filled button) with its address underneath,
- a footer: "You're getting this because your shop is listed in our free directory.", "**Unsubscribe** to stop these emails." and the postal address.

The inbox preview line is the first real sentence of the email. The text can include true facts about the shop (views in the last month, reviews, what's missing from the page) through the placeholders; the code only uses figures from the shop's own page.

It's sent from the bulk sender address (`RESEND_FROM_BULK`), and replies go to the campaign's reply address if one is set, otherwise to support@undergroundaquarium.com.

## How does a shop claim from an outreach email?
The `{{claim_link}}` placeholder puts a one-press link in the email, /claim/[slug] with a signature for that shop. It lands on a "Claim your shop" page showing the shop, what's missing from its page ("Your hours aren't listed", "There's nothing written about the shop"), and what owners can do. Signed in, it's one button; signed out, it's **Create an account** or **I already have one**, and the link brings them back.

The claim then waits in [Store claims](/admin/help/store-claims) for you to approve, with the proof "Opened the claim link emailed to" their address.

The older `{{claim_url}}` placeholder links to /stores/[slug]#claim instead, which opens the ordinary claim form on the shop page.

## How does the unsubscribe link work?
Every bulk email carries a personal unsubscribe link (/api/email/unsubscribe with the address and a signature) in the footer, plus one-click unsubscribe headers that Gmail and Yahoo use for their own **Unsubscribe** button.

- **Clicking the footer link** opens a plain page: "You're unsubscribed. [address] won't get any more marketing or outreach emails from Underground Aquarium. If you have an account, emails about your account and your messages will still arrive." No sign-in, no confirmation step.
- **Gmail or Yahoo's own button** posts to the same address in the background.
- **A broken or tampered link** shows "That link didn't work" and asks them to email support@undergroundaquarium.com to be taken off by hand.

Either way the site does the same thing as the admin **Remove** button (below), without hiding the page, and sends one "You've been unsubscribed" confirmation, but only the first time, so clicking twice doesn't send two. If anything goes wrong partway, the address still goes on the Do not email list (as marketing only).

The footer says "**Unsubscribe** to stop these emails." An unsubscribe stops outreach and campaigns only; if the same address belongs to a member account, their account and message emails keep coming.

Unsubscribe links are signed with `CRON_SECRET`. **If that secret changes, every unsubscribe link already emailed stops working** and shows "That link didn't work", which also risks spam complaints. Don't rotate it casually.

## What should I do when a shop replies "take me off"?
Replies land in support@undergroundaquarium.com (or the campaign's reply address). For each one:

1. Open [Campaigns](/admin/campaigns). The **Remove from outreach** box is at the bottom (and on each campaign page).
2. Paste their email address, or their domain to cover every address at that shop.
3. Leave **Send them a confirmation email** ticked unless they asked for no reply.
4. Leave **Also hide their page** unticked. The policy is that the page stays up, unclaimed and open to reviews. Only tick it for shops in the first batch, whose email promised to take the page down.
5. Press **Remove**.

The policy and the hide option are covered in [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests).

## What exactly does Remove do?
For the address, or every address at the domain, that matches a shop contact or campaign enrollment:

1. Adds each address to the Do not email list as "Unsubscribed" (tagged marketing only) with the reason "Asked by reply to be removed from outreach". An address that had already bounced stays blocked for all email.
2. Marks the shop's contact as opted out, so no campaign ever re-enrolls it.
3. Stops every active campaign enrollment for those addresses.
4. Cancels any bulk email for those addresses still waiting in the queue (it stays in the ledger as failed, "Removed from outreach at their request").
5. If **Also hide their page** was ticked, hides unclaimed shown shops among them. Claimed shops are never hidden.
6. If **Send them a confirmation email** was ticked, sends "You've been unsubscribed" to up to 5 of the addresses. It reads: "This is Chris from Underground Aquarium. You've been unsubscribed from our marketing and outreach emails, and you won't get any more of them." and "If you have an account with us, emails about your account and your messages will still arrive." signed Chris Lewis. It goes even while email is paused.

## What does the confirmation email not do?
It doesn't mention the shop page, doesn't offer to claim, and doesn't carry an unsubscribe link. It isn't marketing, so the unsubscribe doesn't stop it; an address that bounced still gets nothing.

## Does unsubscribing stop every email to that address?
No. An unsubscribe (or a spam complaint) stops marketing and outreach only: every campaign and any shop outreach. Account emails, message alerts, Society dues reminders and shop alert emails still go to that address. So a shop that unsubscribed and later claims its page with the same address still gets its shop alerts.

What does stop every email: a hard bounce, an address Resend says doesn't work, or an address you added to Do not email by hand. See [Email queue and health](/admin/help/email-queue-and-health#what-is-the-do-not-email-list).

To take a shop's addresses off Do not email (for example to send a claim link as outreach mail), use **Bring back** in the Remove from outreach box (it takes the shop's addresses off Do not email, unhides its page and gives you a claim link to send), or remove the single address with the **X** on the [Email](/admin/email) page's Do not email list. Outreach stays off either way.

## Why are some shop emails never sent?
The queue skips or blocks mail when:

- the address fails basic checks (spaces, no @, a placeholder domain such as example.com, over 254 characters),
- the address is on Do not email (outreach is marketing, so both marketing only and all email entries block it),
- bulk mail is paused, or the daily cap is used up (it waits for the next day),
- `RESEND_FROM_BULK` isn't set (it keeps retrying until it is).

## Common problems
**A shop says they unsubscribed but got another email.** Check the Email page for their address. Mail queued before they unsubscribed is cancelled by the unsubscribe itself, so a later email usually means a different address at the same shop. Use **Remove** with their domain.

**A shop says the unsubscribe link didn't work.** Remove them by hand with **Remove**. If many say it, `CRON_SECRET` has probably changed since those emails went out.

**A shop wants to claim after unsubscribing.** Press **Bring back** and send them the copied claim link.

**A bounce or spam complaint came in.** The address goes on Do not email automatically (via the Resend webhook): a hard bounce as all email, a complaint as marketing only. The shop drops out of the campaign on the next run. A bulk email already waiting in the queue for that address isn't sent: the worker re-checks the list and marks it "Not sent · on the do-not-email list".

**I want to email one shop personally.** Write from support@undergroundaquarium.com as normal. Outreach has no one-off send; use a campaign test only for checking the template.
