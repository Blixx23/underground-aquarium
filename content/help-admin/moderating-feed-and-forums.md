---
title: Moderating the feed, forums, comments and tanks
category: Moderation
summary: Exactly what an admin can remove or hide in the feed, the forums, comments and tanks, what can only be done in Supabase, and who finds out.
order: 20
keywords: delete post, remove comment, hide thread, delete thread, edit forum post, edited label, lock thread, pin thread, sticky, moderate forum, moderate feed, spam post, delete tank, private tank, tank reports, moderator tools
pages: /feed, /feed/[id], /forums, /forums/[category]/[thread], /tanks/[id], /admin/reports, /admin/tank-reports
---

Admin moderation tools are spread across the site rather than living in one screen. In the feed you can delete posts and comments directly. In the forums you can edit and delete any post right on the thread page, or hide things through the [Reports queue](/admin/help/reports-queue). Reported tanks are handled on [Tank reports](/admin/help/tank-reports-queue). This guide lists what each place allows and the Supabase workaround when it doesn't.

## What can I do in the feed as an admin?
On any feed post written by a member (not activity items), you can:

- **Delete the post.** Open the **More options** (three dots) menu at the top right of the post and choose **Delete post**.
- **Delete any comment** on it, including replies.

You cannot edit someone else's post. **Edit post** only appears for the post's author.

These powers show on the main feed at /feed, on a member's feed, and on a single post's page at /feed/<id>.

## How do I delete someone's feed post?
1. Find the post in the feed, or open it from a report with **View reported item**.
2. Press the **More options** (three dots) button on the post.
3. Choose **Delete post**.
4. Confirm "Delete this post?".

The post disappears from your screen right away. If you were on the post's own page, you are sent back to /feed. There is no undo on the site.

The author is not notified. If you want them to know, message them or email them yourself. If the post came from a report, use **Remove post** on the report instead: it deletes the post the same way, tells the author "Post removed", and closes the report. See [What does Remove post do?](/admin/help/reports-queue#what-does-remove-post-do).

If deleting fails, the error from the database appears under the post in red. The delete is done by a database function, so an error there means that function refused; delete the row from the feed posts table in Supabase instead.

## How do I delete a comment in the feed?
1. Open the comments under the feed item.
2. Press the small trash icon ("Delete comment") on the comment.
3. Confirm "Delete this comment?".

Admins see the trash icon on every comment. Members see it on their own comments and on any comment under their own post. Nobody is notified when a comment is deleted.

## Which feed items can't be deleted from the feed?
The feed mixes members' posts with activity the site creates on its own: new tanks, new classified ads, approved spawns, badges, and forum threads. Only posts have **Delete post**. For the others, you have to act on the thing itself:

- **Tank:** see [What can I do about a tank?](/admin/help/moderating-feed-and-forums#what-can-i-do-about-a-tank).
- **Classified ad:** report it and use **Take down listing**. See [Working the Reports queue](/admin/help/reports-queue#what-does-take-down-listing-do).
- **Forum thread:** see [How do I hide a forum post or thread?](/admin/help/moderating-feed-and-forums#how-do-i-hide-a-forum-post-or-thread).
- **Spawn or badge:** these come from the Society and trophy systems, not from anything the member typed into the feed.

Forum thread items in the feed can't be commented on in the feed at all, so there are no comments there to moderate.

## How do I hide a forum post or thread?
Hiding in the forums only happens through a report:

1. A member (or you) presses **Report** on the opening post or a comment in the thread.
2. On /admin/reports, the report card shows **Hide post** and **Hide thread**.
3. **Hide post** hides only that post. **Hide thread** hides the whole thread.

Both notify the author with a bell notification ("Post hidden" or "Thread hidden") and tell the reporter their report was resolved. Full details are in [Working the Reports queue](/admin/help/reports-queue).

If nobody has reported it, you can report it yourself and act on your own report, or simply use **Delete** on the thread page (next section). Delete doesn't notify the author; the report route does.

## Can I edit or delete forum posts?
Yes. On a thread page, admins see **Edit** and **Delete** under every post, the same buttons authors see under their own posts.

- **Edit** on the opening post lets you change the thread title and the post text. On a reply, only the text. Press **Save** to keep it. The thread's link doesn't change when the title changes, so shared links keep working. Photos on an existing thread can't be changed ("Photos stay as they are. To change them, delete the thread and post it again.").
- The edit boxes have live character counters: title 3 to 160 characters, opening post up to 20,000, reply up to 10,000. Going over shows a message such as "Your reply is 10,250 characters. The limit is 10,000, so please shorten it by 250." and nothing is saved or cut off.
- After an edit, the post shows "(edited)" next to its time. Hovering shows the exact time it was edited. This label needs step58_fixes.sql (see below); until it has been run, edits still save but no "(edited)" appears.
- **Delete** on a reply asks "Delete this reply? This can't be undone." The reply is hidden (not erased), the comment count is recounted, and any replies under it move up to the top level of the thread so they still show.
- **Delete thread** on the opening post asks "Delete this whole thread? The opening post and every reply will stop showing. This can't be undone." The whole thread is hidden, the same as **Hide thread** from a report.

In a locked thread, only admins can edit. Authors can still delete their own posts there.

Neither Edit nor Delete notifies the author, and neither creates a record of what the old text was. If the author should know, message them, or use the report route so they get "Post hidden" or "Thread hidden".

**Setup:** run step58_fixes.sql (in the sql folder) once in the Supabase SQL Editor. It adds the edited time to forum posts. The last query it runs should say ok on every row.

## How do I lock or pin a forum thread?
There is no button for either. Both are yes/no values on the thread's row in the forum_threads table in Supabase:

- **is_locked** set to true: the thread page shows "This thread is locked." with a lock icon in place of the comment box, and the reply boxes under comments disappear. Anyone who tries to reply anyway gets "This thread is locked." Existing comments stay visible.
- **is_pinned** set to true: the thread sorts to the top of its category list and shows a small pin icon.

Set the value back to false to undo either one. While a thread is locked, members can't edit posts in it, but admins still can.

## How do I unhide a forum post or thread?
In Supabase, open forum_posts (for a single post) or forum_threads (for a whole thread), find the row, and clear its hidden_at value. The post or thread shows again on the next page load.

When you unhide a comment, the thread's comment count isn't recounted. It will be corrected the next time a comment in that thread is hidden, or you can fix the reply_count value on the thread by hand.

## Can I hide a whole forum category?
Yes, in Supabase only. Each category in forum_categories has an is_public value. When it is false, the category and every thread in it show "not found". There is no admin screen for categories.

## What can I do about a tank?
There are still no admin buttons on tank pages themselves:

- You can't delete or edit someone's tank from the site.
- On a tank's own page (/tanks/<id>), the comment delete button only shows for the tank's owner and the comment's writer, not for admins.

Members report tanks with **Report this tank**. Those reports go to **Tank reports** at /admin/tank-reports, where **Make tank private** takes a tank out of public view and tells the owner. See [Tank reports](/admin/help/tank-reports-queue).

Workarounds in Supabase:

- **Hide a tank nobody reported:** open the tanks table, find the tank by its id (the last part of /tanks/<id>), and set is_public to false. The owner can make it public again. Nobody is notified.
- **Remove a tank comment:** delete the row in the tank_comments table.
- **Hide all of one member's tanks:** suspending the member from a profile report switches all their tanks to private (and Unsuspend puts back the ones that were public). See [Working the Reports queue](/admin/help/reports-queue#what-does-suspend-account-do).

## Does the member find out when I moderate?
| What you did | Author told? |
|---|---|
| Deleted a feed post from its menu | No |
| Remove post (from a report) | Yes, "Post removed" bell notification |
| Deleted a feed comment | No |
| Edited or deleted a forum post on the thread page | No |
| Hide post (from a report) | Yes, "Post hidden" bell notification |
| Hide thread (from a report) | Yes, "Thread hidden", to the thread starter |
| Make tank private (from Tank reports) | Yes, "Tank made private" |
| Anything done in Supabase | No |

Notifications never name the admin; they say "a moderator".

## Common problems
**I don't see Delete post on a feed item.** The item is activity (a tank, ad, spawn, badge or thread), not a post, or you aren't signed in as an admin. Only posts can be deleted.

**Delete post shows a red error.** The database function refused the delete. Remove the row in Supabase instead, then reload.

**Replies jumped to the top of the thread.** When a comment is hidden or deleted, the replies under it move up to the top level so they still show. That is expected.

**No "(edited)" label after an edit.** step58_fixes.sql hasn't been run yet. Run it in the Supabase SQL Editor.

**A hidden thread still appears in the hot threads box.** Known issue: see [Working the Reports queue](/admin/help/reports-queue#what-does-hide-thread-do).

**I need to stop a heated thread without hiding it.** Lock it by setting is_locked to true on the thread in Supabase.

**I can't find where to moderate a tank comment.** Admins have no delete button on tank pages. Delete the row in tank_comments in Supabase.
