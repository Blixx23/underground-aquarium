---
title: Working the Reports queue
category: Moderation
summary: How member reports reach you, what each button in the Reports queue really does, who gets notified, and which kinds of reports need a manual fix.
order: 10
keywords: flagged content, report queue, moderation queue, take down, suspend account, hide post, hide thread, dismiss, mark resolved, abuse reports, scam report, spam report
pages: /admin/reports
---

The Reports screen at /admin/reports lists everything members have flagged with the **Report** button that is still open. For each one you decide: act on it, close it because you already dealt with it, or dismiss it. The buttons you get depend on what was reported, and not every button works the way its label suggests, so read the known issues below.

## Where do reports come from?
Members press **Report** (a small flag link) on:

- a classified ad page (/listing/<slug>), reported as type **listing**
- a member's public profile (/u/<username>), type **profile**
- a forum thread's opening post or any comment in it, type **forum_post**
- someone else's post in the feed, type **feed_post**

They must be signed in. They pick a reason from: Spam, Scam or fraud, Prohibited or illegal, Offensive or inappropriate, Misleading or inaccurate, Other, and can add optional details. The member sees "Thanks, this has been sent to our moderators." The member-side flow is described in [Reporting content](/help/reporting-content).

Limits kept on each report: reason up to 100 characters, details up to 2,000, the item's label up to 300, the link up to 500.

If the same member reports the same item again while their first report is still open, no second report is created. Different members reporting the same item each create their own report, so one bad item can show up several times.

**Known issue:** tanks use a different **Report this tank** button that saves into a separate tank reports table. Those reports never appear on /admin/reports or anywhere else in the admin area, and they don't add to any count. Workaround: check the tank_reports table in the Supabase table editor from time to time.

## What does each report card show?
Reports are listed newest first. Each card shows:

- A small pill with the report type: listing, profile, forum_post or feed_post.
- A heading: the item's label (the ad title, the member's display name, the forum thread title, or "Post by <name>" for feed posts). If there is no label, the link is shown instead, or "Reported content".
- **View reported item**: opens the item in a new tab.
- "Reported by @username" (or their full name, or "a member") and the date.
- "Reason:" and the reason they picked.
- Their details text, if they wrote any.

For forum reports, the heading is always the thread title and the link goes to the top of the thread, even when the report is about one comment deep in it. Use the reporter's details to find the comment.

When the queue is empty you see "No reports waiting for review."

## Which buttons will I see?
It depends on the report type:

| Type | Buttons |
|---|---|
| listing | **Take down listing**, **Dismiss**, **Mark resolved** |
| profile | **Suspend account**, **Dismiss**, **Mark resolved** |
| forum_post | **Hide post**, **Hide thread**, **Dismiss**, **Mark resolved** |
| feed_post | **Dismiss**, **Mark resolved** only |

Every button except **Mark resolved** asks you to confirm first. After any action the card disappears from the list and the page refreshes, which also updates the Reports badge in the side menu. There is no bulk action; each report is handled on its own.

## What does Dismiss do?
Use it when the report doesn't need any action.

1. Press **Dismiss**.
2. Confirm "Dismiss this report? No action will be taken."

The report's status becomes dismissed and it leaves the queue. Nothing happens to the reported item. The reporter gets a bell notification titled "Report reviewed": "We reviewed your report about <item>. No action was needed." The reported person is not told anything.

## What does Mark resolved do?
Use it when you have already handled the problem yourself (for example, you deleted a feed post from its menu). Its hover text says it closes the report without an automatic action.

There is no confirm step. The report's status becomes resolved and it leaves the queue. Nothing happens to the reported item. The reporter gets "Report resolved": "Your report about <item> has been resolved." The reported person is not notified.

## What does Hide post do?
Only on forum reports. It hides the single post the member reported: a comment, or the opening post if that is what they flagged.

1. Press **Hide post**.
2. Confirm "Hide just this post/comment? It will be removed from the thread and the author will be notified."

What happens:

- The post is marked hidden (not deleted) and disappears from the thread page.
- The thread's comment count is recounted without it.
- Any replies nested under that comment also stop showing, because the thread page only shows replies whose parent is visible. They still count in the comment total.
- The report becomes resolved.
- The post's author gets a bell notification "Post hidden": "A post of yours was hidden by a moderator.", linking to the thread.
- The reporter gets "Report resolved": "Thanks, we took action on <thread title>, which you reported."

If you hide the opening post, the thread stays up with its title and comments but no opening text. Use **Hide thread** if the whole discussion should go.

## What does Hide thread do?
Only on forum reports. It hides the entire thread the reported post belongs to.

1. Press **Hide thread**.
2. Confirm "Hide the entire thread? The whole discussion will be removed and the author will be notified."

What happens:

- The thread is marked hidden. Its page now shows "not found", and it drops out of its category list, the sitemap and the thread count on the starter's profile.
- The thread's starter (not necessarily the person whose comment was reported) gets "Thread hidden": "A thread of yours was hidden by a moderator.", linking to /forums.
- The reporter gets "Report resolved": "Thanks, we took action on <thread title>, which you reported."

**Known issue:** the hot threads box and the related threads list on thread pages don't filter out hidden threads in the page code, so a hidden thread's title can still show there and lead to a "not found" page. If that matters for a thread, delete it in Supabase instead.

## What does Suspend account do?
Only on profile reports.

1. Press **Suspend account**.
2. Confirm "Suspend this account? Their profile and listings will be hidden and they will be notified."

What happens in the database:

- The member's profile gets a suspended date, the report's reason as the suspension reason, and your account as the admin who did it.
- All of their tanks are switched to private.
- Old paid-marketplace products tied to them are switched off (this does not include classified ads, see below).
- The report becomes resolved.
- The member gets "Account suspended": "Your account has been suspended by a moderator.", linking to /account.
- The reporter gets "Report resolved": "Thanks, we took action on <name>, which you reported."

What members see: the suspended member's public profile at /u/<username> now shows "not found".

**Known issue:** in the site code, the public profile page is the only thing that checks for suspension. A suspended member can still sign in, post in the feed and forums, send messages, and their classified ads stay live. The confirm box's promise that "listings will be hidden" is not true for classified ads. Workaround: after suspending, find their ads in the Supabase **listings** table (filter user_id by their id) and change each ad's status from active to expired, or delete the rows. Nothing on the site can block sign-in; if you need that, ban the user under Authentication in Supabase.

There is no un-suspend button. See [Member lookup and accounts](/admin/help/member-lookup-and-accounts) for how to lift a suspension.

## What does Take down listing do?
Only on listing reports. The confirm box says: "Take down this listing? It will be hidden from the marketplace and the seller will be notified."

**Known issue:** this button does not take down classified ads. It looks for the ad in the old paid-marketplace products table, doesn't find it, and so changes nothing and notifies no seller. It still marks the report resolved, and the reporter gets "Report resolved": "Your report about <ad title> has been resolved." The ad stays live.

Workaround until it is fixed:

1. Open the ad with **View reported item** and copy the part of the address after /listing/ (the slug).
2. In the Supabase **Table editor**, open **listings** and find the row with that slug.
3. To hide it, change **status** from active to expired. It disappears from browsing, search and the ad page for everyone except its owner. The owner can renew it from **My listings**, so to remove it for good, delete the row instead.
4. Back on /admin/reports, press **Mark resolved** to close the report. Tell the seller yourself if you want them to know; nothing notifies them automatically.

## What should I do with a feed post report?
Feed reports only get **Dismiss** and **Mark resolved**. To remove the post:

1. Press **View reported item** to open the post at /feed/<id>.
2. Open the **More options** (three dots) menu on the post and choose **Delete post**, then confirm "Delete this post?".
3. Back on /admin/reports, press **Mark resolved**.

The post's author is not notified when an admin deletes their post. See [Moderating the feed and forums](/admin/help/moderating-feed-and-forums).

## Who gets notified, all in one place
All of these are bell notifications only. No emails are sent for reports.

| Action | Reporter gets | Reported person gets |
|---|---|---|
| Dismiss | "Report reviewed" (no action needed) | nothing |
| Mark resolved | "Report resolved" (has been resolved) | nothing |
| Hide post | "Report resolved" (we took action) | "Post hidden" |
| Hide thread | "Report resolved" (we took action) | "Thread hidden" (sent to the thread starter) |
| Suspend account | "Report resolved" (we took action) | "Account suspended" |
| Take down listing | "Report resolved" (has been resolved), because nothing was taken down | nothing |

If a member reported their own content, they only get the reporter notice, never both. A notification that fails to save never blocks the action itself.

## Can I see past reports or undo an action?
No. The screen only shows open reports; there is no history tab. Closed reports stay in the reports table in Supabase with their status (resolved or dismissed), when they were reviewed, and which admin reviewed them.

To undo by hand in Supabase:

- **Hidden post or thread:** clear the hidden_at value on the row in forum_posts or forum_threads. The comment count is not recounted automatically when you unhide a comment.
- **Suspension:** see [Member lookup and accounts](/admin/help/member-lookup-and-accounts).
- **Reopen a report:** set its status back to open in the reports table. It reappears in the queue.

## Can I hide a forum post nobody reported?
Not directly. A workaround that uses the real tools: press **Report** on the post yourself, then act on your own report from /admin/reports with **Hide post** or **Hide thread**. The author is notified as usual, and you get the reporter's "Report resolved" notice.

## Common problems
**Other reports about the same item are still in the queue after I acted.** Each report is separate. Close the rest with **Mark resolved**.

**The reporter says the ad is still up after I pressed Take down listing.** Expected with the current code. Follow the workaround in [What does Take down listing do?](/admin/help/reports-queue#what-does-take-down-listing-do).

**"Report not found."** The report no longer exists or the page was out of date. Reload.

**"Missing report or action." or "Admins only."** The page is stale or you are signed into a non-admin account. Reload, or sign in again as an admin.

**A tank was reported but nothing is in the queue.** Tank reports go to a separate table. See [Where do reports come from?](/admin/help/reports-queue#where-do-reports-come-from).

**A suspended member is still posting.** Suspension only hides their public profile. See [What does Suspend account do?](/admin/help/reports-queue#what-does-suspend-account-do).
