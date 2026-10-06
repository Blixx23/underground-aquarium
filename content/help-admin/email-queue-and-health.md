---
title: Email queue and health
category: Email & campaigns
summary: How every site email flows through the queue, what each number and switch on the Email page means, what counts as stuck, the bounce brake, retrying and cancelling, the Do not email list, alerts and setup.
order: 10
keywords: email panel, stuck, held bulk, bounce brake, big providers, open tracking, placeholder address, outbox, email ledger, kill switch, pause email, bulk cap, daily cap, bounce rate, spam complaints, suppression list, unsubscribe list, marketing only, all email, not sent, resend, webhook, email worker, deliverability, failed emails
pages: /admin/email, /admin, /api/email/unsubscribe
---

Almost every email the site sends goes through one queue, and the **Email** page at /admin/email is the window onto it. It shows whether mail is flowing, every message and what happened to it, the switches that pause sending, and the Do not email list of addresses that must not get some or all mail.

## How does an email get sent?
Every send goes through the queue in one of two ways:

- **Sent right away.** One-off emails (club invites, receipts, shop alerts, admin tests) are handed to Resend immediately and recorded in the queue as sent or failed.
- **Queued for the worker.** Group sends and all campaign mail are written into the queue as "pending", and the email worker sends them in the background. Anything that would send while sending is paused is also queued, and goes out in order once you turn sending back on.

The worker is a scheduled job at /api/cron/email-worker. Its own notes say it runs every two minutes. Each run takes up to 60 waiting messages, ordinary mail before bulk mail, oldest first, and sends about four a second. A message is only marked sent after Resend accepts it.

**Known issue:** sign-up confirmation and password reset emails are sent by the sign-in system itself, not by this queue. They don't appear on this page and the pause switch does not stop them.

## What is the line at the top of the page?
The coloured banner is the one-sentence verdict, also shown at the top of the admin [Dashboard](/admin). In order of priority:

- **Red, "Mail is not going out. N messages have been waiting more than 30 minutes, which means the worker isn't running."** Sending is on but mail is stuck. Check the worker schedule and `CRON_SECRET` (see Common problems).
- **Grey, "Everything is paused. N messages waiting in the queue. Nothing sends until you turn sending on."**
- **Amber, "Receipts and alerts are sending. N bulk messages are held because bulk mail is off, and will go out in order when you allow it."** when **Bulk and outreach** is switched off, bulk mail is waiting, and nothing else is stuck.
- **Amber, "Sending is on, but nothing has ever gone out. Send yourself a test to prove the path works."**
- **Red, "X% of the last week bounced (keep under 5%). Bulk mail is going only to Gmail, Yahoo, Outlook and other big providers until it drops back under; the rest waits in the queue."** when bounces are 5% or more of last week's delivered plus bounced mail. See the bounce brake below.
- **Amber, "N spam complaints this week. Keep an eye on it; a handful is normal, a trend is not."**
- **Amber, "Sending is working. N messages gave up and are sitting in the failed list."**
- **Green, "Sending is working. N went out in the last 24 hours and nothing is stuck."**

## What counts as "stuck"?
Only mail that should have gone out more than 30 minutes ago and didn't. These are not counted as stuck:

- Bulk mail held because **Bulk and outreach** is switched off.
- Bulk mail moved to tomorrow on purpose, because the daily cap was used up or the bounce brake held it back.

So queuing a campaign while bulk is off no longer sets off the red "Mail is not going out" banner or the "Action needed: emails are not going out" alert. Before this was fixed, campaign mail waiting with bulk off was counted as stuck and sent a false alert saying the worker wasn't running.

If the check can't run at all, the page shows only "The health check couldn't run:" with the error, and "That usually means the email tables haven't been created in this database yet." The Dashboard banner turns red with the same error. No controls are shown in that state.

## What do the number tiles mean?
- **Sending**: On or Off, with "bulk allowed" or "bulk paused too" underneath.
- **Waiting**: messages still pending. The hint reads "queue is moving", or "N over 30 min" (red when sending is on).
- **Sent 24h**: messages sent in the last day. Shows "nothing has ever sent" if the site has never sent anything.
- **Failed**: messages that gave up and still need you, with how many failed in the last 24 hours. Mail skipped on purpose (the do-not-email list, placeholder addresses, a second copy to an address that already got it, cancels and opt-outs) and anything you've cleared don't count. This is also the number on the Email badge in the admin menu and the "N waiting" pill on the Dashboard card.
- **Delivered 7d**: mail Resend confirmed as delivered in the last week. Needs the Resend webhook.
- **Bounced 7d**: bounces as a percentage of delivered plus bounced, "keep under 5%". Amber from 2%, red from 5%.
- **Spam 7d**: spam complaints this week, "keep at zero".
- **Opened 7d**: opens as a percentage of delivered. If this shows 0%, open tracking is usually turned off in Resend; it doesn't mean nobody reads the mail.
- **Bulk today**: bulk emails sent today out of the daily cap.
- **Do not email**: how many addresses are on the suppression list.

## How do I pause or restart all email?
In **Controls**, the **All email** box has one button:

- **Pause everything** turns all sending off. You see "Sending is off. Nothing will go out." New emails still queue up and wait. The worker does nothing.
- **Turn sending on** turns it back on ("Sending is on.") and queued mail goes out in order.

The switch is stored in the database, so it takes effect instantly with no redeploy. If the setting can't be read, the site treats everything as paused, so a database problem delays mail rather than letting it all out. Alerts to the admin and the **Send me a test** button ignore the pause on purpose.

## How do I pause only bulk and outreach mail?
The **Bulk and outreach** box pauses campaign mail while receipts and alerts keep sending:

- **Pause bulk mail**: "Off. Receipts and alerts still send; campaigns don't."
- **Allow bulk mail**: "On. Campaign mail sends up to the daily cap."

This button is greyed out while all email is off, with the hint "Turn all email on first." Campaigns still plan and queue while bulk is paused; the mail just waits, and the banner at the top says how many bulk messages are held. Held bulk mail isn't counted as stuck, so it doesn't trigger the stuck alert.

## How does the daily bulk cap work?
**Bulk sends per day** sets how many bulk emails may be sent in one day, from 0 to 5000. Type a number and press **Save** ("Cap set to N a day."). Keep it low while the sending domain is new.

When a run hits the cap, the rest of the bulk mail is put back untouched and rescheduled for 9:00 the next day. The campaign planner also only queues about one day's worth, so the queue never gets far ahead. The day is counted from midnight on the server's clock, which is not necessarily Pacific time.

Within bulk mail, addresses at big providers (Gmail, Yahoo, Outlook and so on, listed below) always go first, so the daily cap is spent on the safest sends.

## What is the bounce brake?
Too many bounces get the whole sending domain filtered by mailbox providers. So when the bounce rate for the last 7 days is 5% or more (and at least 40 emails were delivered or bounced in that time), bulk mail goes only to big providers, where a real mailbox almost never bounces:

- Gmail, Yahoo, Outlook, Hotmail, Live, MSN, AOL, iCloud (also me.com and mac.com), Comcast, AT&T (also SBCGlobal and BellSouth), Verizon, Cox, Charter, Earthlink, Proton, GMX, mail.com and Zoho.

Bulk mail to any other address waits in the queue and is tried again the next day at 9:00. It starts going again on its own once the rate drops under 5%, as old bounces age out of the 7-day window. Receipts, alerts and other ordinary mail are not affected. While the brake is on the banner at the top says "X% of the last week bounced (keep under 5%). Bulk mail is going only to Gmail, Yahoo, Outlook and other big providers until it drops back under; the rest waits in the queue." Mail held by the brake isn't counted as stuck.

## What extra checks does bulk mail get?
Shop addresses come from public websites, so bulk mail (shop outreach and campaigns) gets extra address care right before it sends. Member addresses, receipts and alerts don't. Small slips such as "mailto:", a "www." in the domain or a trailing dot are fixed, and website-template placeholders (like hi@mystore.com) or scraped file names (like logo@2x.png) are never sent: the row shows "Not sent · on the do-not-email list" with a red line such as "Not sent: Placeholder address from a website template (mystore.com)", and the address goes on Do not email as "Address doesn't work". The full rules are in [Shop outreach emails](/admin/help/shop-outreach#which-addresses-are-cleaned-up-or-never-mailed).

## How do I test that email works?
Two buttons in **Check it works**:

- **Send me a test** sends "Underground Aquarium test email" to the address you sign in with, even while paused. You see "Test sent to ...". This proves the ordinary (transactional) path only.
- **Run the queue now** runs the worker once by hand, taking up to 40 messages, and reports "Ran the worker: N sent, N failed." If any rows were held back by the Do not email list it adds ", N not sent (on the do-not-email list)". It is greyed out while all email is paused.

To prove the bulk path, use **Send me this one** on a campaign step instead (see [Campaigns](/admin/help/campaigns)); it sends from the bulk address with the unsubscribe headers.

## How do I read the Every message list?
**Every message** lists the newest 100 messages, one row per email. Tabs: **Waiting**, **Failed**, **Sent**, **Everything**. The "find an address" box plus **Search** filters by recipient address (any part of it) within the tab.

Each row shows the subject, a **bulk** tag for bulk mail, the recipient and the kind of email (for example `campaign:outreach`, `shop_review`, `admin_test`), and a status line:

- **"Sent 5m ago"** for sent mail.
- **"Waiting · queued 3m ago"** or **"Waiting until [time]"** for mail not yet due.
- **"Retrying · N tries so far · next [time]"** for mail that failed for a temporary reason, with the last error in red.
- **"Gave up after N tries · [reason]"** for failed mail, with the error in red. Reasons: **bad address**, **sending too fast**, **Resend problem**, **something else**.
- **"Not sent · on the do-not-email list"** for mail the worker refused to send because the address was on the Do not email list by the time it came up. The red line explains which kind of block: "Not sent: this address is on the do-not-email list (bounce), so nothing can go to it." or "Not sent: this person opted out of marketing and outreach email (unsubscribe)." These rows have no **Try again** button, because they would only be held back again. They never count as failed emails. The same goes for **"Not sent: this address already got this email"**: when two shop listings share one inbox, the outreach email goes once.

Empty tabs show "Nothing here.", or "Nothing for "..."." when searching.

## When does the queue retry and when does it give up?
- **A bad address** (Resend says the address is invalid) fails at once and the address goes on the Do not email list as "Address doesn't work".
- **Everything else** (Resend outage, rate limits, a missing API key, a misconfigured sender, network trouble) is retried on a growing delay, about 2 minutes, 4, 8 and so on, capped at 6 hours between tries, for as long as it takes. This applies to mail the worker sends and to background jobs such as shop alerts.
- **A one-off email sent right away because someone pressed a button** is not retried. If it fails, the row is recorded as failed straight away and the person who pressed the button is told. Use **Try again** on it once the problem is fixed.
- A message locked by a worker run that crashed is released after 15 minutes.

## How do I retry or cancel a message?
- On a failed row, **Try again** puts it back in the queue with its tries reset, due now.
- On a failed row you don't want to retry (an old test, a shop that closed), **Clear** keeps it in the history but stops it counting: it leaves the Failed tab, the Email badge, the Dashboard and the AI team's brief. It's still under **Everything**.
- On a waiting row, **Cancel** stops it. The row is kept as failed with "Cancelled from the admin panel", so the history has no holes.

The worker re-checks the Do not email list right before it sends each queued row, so **Try again** on a row whose address has since bounced or opted out doesn't send it: the row comes back as "Not sent". If an address really should get mail again, remove it from Do not email first.

**Known issue:** "Not sent" rows are stored with the failed status, so they are counted with failed messages in the Email badge and the Dashboard pill. They aren't emailed to support as failures.

These buttons don't show errors; if a row doesn't change after the page refreshes, try again.

## What is "What mailboxes did with it"?
Sent by the site isn't the same as landed in the inbox. When the Resend webhook is set up, Resend reports what happened after it accepted each message, and the newest 25 events show here: **Delivered**, **Opened**, **Clicked**, **Bounced**, **Marked as spam**, and delayed deliveries, each with the address, any detail, and when.

Before the webhook is set up it says "Nothing yet. This fills in once the Resend webhook is pointed at the site."

A hard bounce adds the address to Do not email as **all email**. A spam complaint adds it as **marketing only**, the same as an unsubscribe. A soft (temporary) bounce adds nothing. Events for mail sent from other domains on the same Resend account are ignored.

## What is the Do not email list?
**Do not email** shows the newest 50 listed addresses, with the total. Each address has a tag saying how far the block reaches, then why it was listed (**Bounced**, **Marked as spam**, **Unsubscribed**, **Added by hand**, **Address doesn't work**), the date and any detail. The note above the list reads: "Bounces, spam complaints and unsubscribes land here automatically. A bounced address gets nothing at all. An unsubscribe or spam complaint only stops marketing and outreach; account and message emails still go to them. Addresses you add by hand get nothing at all."

The two tags:

- **all email** (red): Bounced, Address doesn't work and Added by hand. Nothing at all is sent to the address, not even account or message email, because the address doesn't work or you blocked it on purpose.
- **marketing only** (amber): Unsubscribed and Marked as spam. Campaign mail, shop outreach and campaign tests stop. Account emails, message alerts, Society dues reminders and shop alerts still go to that person, because those are mail they need.

A block is never weakened: if an address already bounced, a later unsubscribe click leaves it as all email.

- To add one, type it in "add an address" and press **Add** (the button needs an @). It is saved as "Added by hand", which blocks all email.
- To remove one, press the **X** next to it ("Allow email to this address again"). Only do this when you know why it got there, such as a typo fixed or a shop that asked to be put back on.

When you press a button that sends to a listed address, it fails with "That address has opted out of marketing email, or bounced." (for marketing mail) or "That address bounced or was blocked, so nothing can be sent to it." (for account and other mail to an all email address). If the list itself can't be read, the site sends anyway rather than silently dropping a whole run.

**Known issue:** the address search on this page only searches the message list. To check whether a specific address is on Do not email when it isn't in the newest 50, look in Supabase (the email_suppressions table).

## What alerts will I get by email?
The email health job (/api/cron/email-health; the page footer says it runs every six hours) writes to support@undergroundaquarium.com only when something is wrong:

- "Action needed: emails are not going out (N stuck)" when mail has waited more than 30 minutes while sending is on. Bulk mail held because bulk is off, or moved to tomorrow by the daily cap or the bounce brake, doesn't count.
- "N bad email addresses, everything else is sending fine" when the only new failures are bad addresses.
- "N emails didn't send, nothing is stuck" for other new failures.
- "Action needed: the email health check can't run" when the check itself fails.

Each failed message is reported once. Alerts ignore the pause switch. If the alert itself fails to send, the next run tries again.

## Which settings does email need?
Set these in Vercel. They are needed for sending to work:

- `RESEND_API_KEY`: without it every send fails with "RESEND_API_KEY is not set" and keeps retrying.
- `RESEND_FROM`: the sender for ordinary mail. If missing, the site uses Underground Aquarium at orders@send.undergroundaquarium.com.
- `RESEND_FROM_BULK`: the sender for bulk and campaign mail. There is no fallback. If it is missing, bulk sends fail with "RESEND_FROM_BULK is missing or has no email address in it. In Vercel set it to: Your Name <you@your-verified-domain.com>"
- `RESEND_WEBHOOK_SECRET`: for the Resend webhook at /api/webhooks/resend.
- `EMAIL_EXTRA_DOMAINS`: optional, comma separated extra sending domains the webhook should accept.
- `CRON_SECRET`: every scheduled job requires it. It also signs unsubscribe and claim links, so changing it breaks every link already emailed.

Replies to any email go to support@undergroundaquarium.com unless a campaign sets its own reply address.

## Common problems
**The red "Mail is not going out" banner.** The worker isn't running. Check that the email worker is scheduled in Vercel and that `CRON_SECRET` is set; without it every scheduled job is refused. Press **Run the queue now** to clear the backlog meanwhile.

**Many rows are "Retrying" with a Resend problem.** Usually the API key or sender address. Fix the setting in Vercel; the queue retries on its own.

**Bulk mail sits in Waiting forever.** Bulk is paused, the daily cap is reached (rows show "Waiting until" tomorrow 9:00), the bounce brake is holding mail to smaller providers until the bounce rate drops under 5%, or `RESEND_FROM_BULK` is missing.

**Opened 7d shows 0%.** Open tracking is most likely off in Resend. It doesn't mean nobody opens the mail.

**"Send me a test" says "That address bounced or was blocked, so nothing can be sent to it."** Your own address is on Do not email as all email. Remove it with the X. (A marketing only entry doesn't block the test, because the test is ordinary mail.)

**A member unsubscribed from outreach but still gets message alerts.** Expected. An unsubscribe only stops marketing and outreach. To stop everything, add the address by hand, which blocks all email.

**Rows show "Not sent · on the do-not-email list".** The address was listed after the mail was queued. Nothing to fix unless the listing was a mistake; then remove the address and queue the mail again.

**Nothing under "What mailboxes did with it".** The Resend webhook isn't pointed at /api/webhooks/resend, or `RESEND_WEBHOOK_SECRET` doesn't match.

**Delivered, Bounced and Opened tiles stay at zero or show a dash.** Same cause as above: those numbers come from the webhook.

**A member says they never got an email.** Search their address. No row means that email type isn't sent through the queue (sign-in emails) or was never triggered.
