---
title: Working the Reports queue
category: Moderation
summary: How member reports reach you, what each button in the Reports queue does, who gets notified, how suspension and unsuspension work, and where tank reports go instead.
order: 10
keywords: flagged content, report queue, moderation queue, take down, suspend account, unsuspend, suspended accounts, ban, hide post, hide thread, remove post, dismiss, mark resolved, abuse reports, scam report, spam report
pages: /admin/reports, /account-suspended
---

The Reports screen at /admin/reports lists everything members have flagged with the **Report** button that is still open. For each one you decide: act on it, close it because you already dealt with it, or dismiss it. The buttons you get depend on what was reported. At the bottom of the same page is the **Suspended accounts** list, where you lift a suspension.

## Where do reports come from?
Members press **Report** (a small flag link) on:

- a classified ad page (/listing/<slug>), reported as type **listing**
- a member's public profile (/u/<username>), type **profile**
- a forum thread's opening post or any comment in it, type **forum_post**
- someone else's post in the feed, type **feed_post**

They must be signed in. They pick a reason from: Spam, Scam or fraud, Prohibited or illegal, Offensive or inappropriate, Misleading or inaccurate, Other, and can add optional details. The member sees "Thanks, this has been sent to our moderators." The member-side flow is described in [Reporting content](/help/reporting-content).

Limits kept on each report: reason up to 100 characters, details up to 2,000, the item's label up to 300, the link up to 500.

If the same member reports the same item again while their first report is still open, no second report is created. Different members reporting the same item each create their own report, so one bad item can show up several times.

Tanks use a different **Report this tank** button. Those reports don't appear here; they have their own screen, [Tank reports](/admin/help/tank-reports-queue) at /admin/tank-reports.

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
| feed_post | **Remove post**, **Dismiss**, **Mark resolved** |

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
- Any replies nested under that comment stay up. They move up to the top level of the thread, so they still show and the comment count matches the page.
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
2. Confirm "Suspend this account? They will be blocked from signing in (a session already open ends within about an hour), their public profile will be hidden, their live classified ads will be taken down and their tanks made private. They will be notified. You can undo this from Suspended accounts below."

What happens:

- **Sign-in is blocked.** The member is banned in Supabase Auth. They can't sign in with email and password or with Google; both send them to the page /account-suspended ("This account is suspended"), which tells them to email support@undergroundaquarium.com from the address on the account. A session they already had open can't be refreshed, so it ends within about an hour.
- The member's profile gets a suspended date, the report's reason as the suspension reason, and your account as the admin who did it. Their public profile at /u/<username> shows "not found".
- Every classified ad they had live (status active) is set to removed. The ads leave browsing and search.
- All of their tanks are switched to private.
- The site remembers exactly which ads it took down and which tanks were public, so **Unsuspend** can put back only those. This list is saved on the member's sign-in record in Supabase Auth (app metadata), not in a table.
- The report becomes resolved.
- The member gets a bell notification "Account suspended": "Your account has been suspended by a moderator. If you think this is a mistake, email support@undergroundaquarium.com.", linking to /account-suspended.
- The reporter gets "Report resolved": "Thanks, we took action on <name>, which you reported."

If the sign-in block fails, nothing else is changed and a red message starting "Couldn't block sign-in:" appears, so you never end up with a half-suspended account. Members who were suspended before this change only had the profile date set; if one of them signs in with Google they are signed out and sent to /account-suspended too.

## How do I lift a suspension?
Scroll to **Suspended accounts** at the bottom of /admin/reports ("Members who are blocked from signing in. Unsuspending lets them back in and restores what the suspension hid."). It lists everyone with a suspended date, newest first (up to 200), with their name and @username, "Suspended <date>" and the reason. With nobody suspended it says "No suspended accounts."

1. Press **Unsuspend** next to the member.
2. Confirm "Unsuspend <name>? They will be able to sign in again, their public profile comes back, and the classified ads and tanks that the suspension hid are restored (ads past their expiry date come back as expired). They will be notified."

What happens:

- The Supabase Auth ban is lifted and the suspended date, reason and admin are cleared from the profile.
- Only the ads the suspension took down, and that are still removed, come back. Ads whose expiry date hasn't passed go live again; ads past their expiry date come back as expired, so the member can repost them from **My listings**. Ads they had already ended themselves stay as they were.
- Only the tanks that were public at suspension time go public again. Tanks they kept private stay private.
- The member gets "Account restored": "Your account suspension has been lifted. You can sign in again.", linking to /profile.
- A green line confirms it, for example "@name is unsuspended. Restored 2 live ads and 1 public tank."

**Known issue:** members suspended before this change have no saved list, so **Unsuspend** lets them sign in and shows their profile again but restores no ads or tanks. They can repost ads and make tanks public themselves.

## What does Take down listing do?
Only on listing reports.

1. Press **Take down listing**.
2. Confirm "Take down this listing? It will be hidden from the marketplace and search, marked removed on the seller's My listings page (they can't repost it), and the seller will be notified."

What happens:

- The classified ad's status becomes removed. It disappears from browsing, search and its public page.
- The seller still sees it on **My listings**, marked removed, with no **Repost** button.
- The report becomes resolved.
- The seller gets a bell notification "Listing removed": "Your listing "<title>" was removed by a moderator.", linking to /my/listings.
- The reporter gets "Report resolved": "Thanks, we took action on <ad title>, which you reported."

If the ad was already deleted, you get "That listing no longer exists, so there is nothing to take down. Use Mark resolved or Dismiss." and nothing changes. Very old reports that point at the retired paid-marketplace products are switched off there instead.

## What does Remove post do?
Only on feed post reports.

1. Press **Remove post**.
2. Confirm "Remove this feed post? It will be deleted, the same as using Delete post on the feed, and the author will be notified. This can't be undone."

What happens:

- The post is deleted, exactly as if you had used **Delete post** from its menu on the feed.
- The report becomes resolved.
- The author gets "Post removed": "A post of yours in the feed was removed by a moderator.", linking to /feed.
- The reporter gets "Report resolved": "Thanks, we took action on <item>, which you reported."

If the post was already deleted, you get "That post was already deleted. Use Mark resolved or Dismiss." See [Moderating the feed and forums](/admin/help/moderating-feed-and-forums).

## Who gets notified, all in one place
All of these are bell notifications only. No emails are sent for reports.

| Action | Reporter gets | Reported person gets |
|---|---|---|
| Dismiss | "Report reviewed" (no action needed) | nothing |
| Mark resolved | "Report resolved" (has been resolved) | nothing |
| Hide post | "Report resolved" (we took action) | "Post hidden" |
| Hide thread | "Report resolved" (we took action) | "Thread hidden" (sent to the thread starter) |
| Suspend account | "Report resolved" (we took action) | "Account suspended" |
| Take down listing | "Report resolved" (we took action) | "Listing removed" |
| Remove post | "Report resolved" (we took action) | "Post removed" |
| Unsuspend (Suspended accounts list) | nothing | "Account restored" |

If a member reported their own content, they only get the reporter notice, never both. A notification that fails to save never blocks the action itself.

## Can I see past reports or undo an action?
No history, and only Suspend account has an undo button. The screen only shows open reports; there is no history tab. Closed reports stay in the reports table in Supabase with their status (resolved or dismissed), when they were reviewed, and which admin reviewed them.

To undo by hand in Supabase:

- **Hidden post or thread:** clear the hidden_at value on the row in forum_posts or forum_threads. The comment count is not recounted automatically when you unhide a comment.
- **Suspension:** press **Unsuspend** in the Suspended accounts list. See [How do I lift a suspension?](/admin/help/reports-queue#how-do-i-lift-a-suspension).
- **Taken-down ad:** set the ad's status back to active in the listings table.
- **Removed feed post:** it was deleted and can't be brought back.
- **Reopen a report:** set its status back to open in the reports table. It reappears in the queue.

## Can I hide a forum post nobody reported?
Yes. Admins see **Delete** (or **Delete thread** on the opening post) under every post on the thread page, which hides it the same way, but the author isn't told. If you want the author notified, press **Report** on the post yourself, then act on your own report here with **Hide post** or **Hide thread**; the author gets "Post hidden" or "Thread hidden", and you get the reporter's "Report resolved" notice. See [Moderating the feed and forums](/admin/help/moderating-feed-and-forums#can-i-edit-or-delete-forum-posts).

## Common problems
**Other reports about the same item are still in the queue after I acted.** Each report is separate. Close the rest with **Mark resolved**.

**The seller asks why their ad is gone.** It was taken down from a report and shows as removed on their My listings page. See [What does Take down listing do?](/admin/help/reports-queue#what-does-take-down-listing-do).

**"Report not found."** The report no longer exists or the page was out of date. Reload.

**"Missing report or action." or "Admins only."** The page is stale or you are signed into a non-admin account. Reload, or sign in again as an admin.

**A tank was reported but nothing is in the queue.** Tank reports have their own screen. See [Tank reports](/admin/help/tank-reports-queue).

**A suspended member is still posting.** A session that was already open can last up to about an hour before it ends. If it goes on longer, check the member is on the Suspended accounts list and, in Supabase under Authentication, that their user shows as banned.

**A suspended member says they can't sign in and don't know why.** They should land on /account-suspended. Ask them to email support from the address on the account, then decide whether to press **Unsuspend**.
