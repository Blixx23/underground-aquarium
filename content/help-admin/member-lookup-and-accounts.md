---
title: Member lookup and accounts
category: Moderation
summary: How to find a member, what suspension does and how to lift it, how account deletion requests and the 30 day purge work, and what an admin can and can't change on an account.
order: 30
keywords: find user, look up member, search members, user email, suspend, unsuspend, ban, reinstate, delete account, deletion request, purge, gdpr, data export, cancel deletion, deleted user
pages: /admin/bubbles, /admin/site-stats, /admin/shops, /admin/reports, /account, /account/deletion-pending, /account-suspended, /u/[username]
---

There is no member directory or account editor in the admin area. Member lookups are spread across a few screens, suspension comes from a profile report (and is lifted from the Suspended accounts list on the same page), and account deletion is something members do themselves. Anything else is done in Supabase. This guide covers what exists and the safe way to do the rest.

## How do I find a member?
There is no "all members" screen. Your options:

- **By username, with a live search:** the **Member username** box on [Bubbles](/admin/help/bubbles-admin) (/admin/bubbles). Type part of a username (with or without the @) and up to 8 matches appear, sorted A to Z, each with their full name and bubble balance. It only searches usernames, not names or emails, and it skips accounts scheduled for deletion.
- **Newest 25 sign-ups, with email:** [Site stats](/admin/help/site-stats) (/admin/site-stats) lists the 25 newest accounts with their email address and whether they confirmed it.
- **Shop owners, with email:** **All shops** (/admin/shops) shows who claimed each shop. See [Managing shops](/admin/help/managing-shops).
- **Public profile:** go to /u/<username>. Suspended and deleted members show "not found" here.
- **Anyone, any detail:** in Supabase, the profiles table (username, full name, flags) and Authentication, Users (email, sign-up date, last sign-in).

## How is an account suspended?
Only from a profile report. When a member reports someone's profile, the report on /admin/reports has a **Suspend account** button. There is no other suspend button.

If you want to suspend someone nobody has reported, open their profile at /u/<username>, press **Report**, pick a reason, then act on your own report at /admin/reports. The reason you pick is saved as the suspension reason.

The full list of effects and notifications is in [Working the Reports queue](/admin/help/reports-queue#what-does-suspend-account-do). In short: they are banned from signing in (Supabase Auth ban), their public profile shows "not found", their live classified ads are set to removed, their tanks go private, and they get an "Account suspended" bell notification.

## What does a suspended member still have access to?
Very little. A suspended member:

- can't sign in. Email and password sign-in and **Continue with Google** both send them to /account-suspended, which says "This account is suspended" and asks them to email support@undergroundaquarium.com from the address on the account.
- loses any session they already had open within about an hour, because it can't be refreshed.
- has no public profile, no live classified ads and no public tanks while suspended.

Their feed posts, forum posts and messages are not removed by a suspension. Remove individual posts from reports or from the posts themselves if needed (see [Moderating the feed and forums](/admin/help/moderating-feed-and-forums)).

## How do I lift a suspension?
Use the **Suspended accounts** list at the bottom of [Reports](/admin/reports) and press **Unsuspend**. It lifts the sign-in ban, clears the suspension from the profile, puts back only the ads and tanks the suspension hid (ads past their expiry date come back as expired), and sends the member an "Account restored" notification. Step by step: [How do I lift a suspension?](/admin/help/reports-queue#how-do-i-lift-a-suspension).

**Known issue:** members suspended before the 27 September 2026 change have no saved list of what was hidden, so their ads and tanks aren't restored. Tell them to repost ads from **My listings** and make tanks public again themselves.

Don't lift a suspension by clearing suspended_at in Supabase. That leaves the sign-in ban in place and restores nothing.

## How does account deletion work?
Members delete their own account from **Account & data** at /account: they type DELETE, tick "I understand my account will be permanently deleted after 30 days unless I sign in and reactivate it before then.", and press **Delete my account**. The member-side flow is in [Deleting your account](/help/deleting-your-account). What happens:

1. **Right away:** their profile is marked deleted and a purge date 30 days out is set. Their live classified ads are marked expired. All their tanks are switched to private, and the site remembers which ones were public (saved on their sign-in record in Supabase Auth). Their public profile shows "not found", and they drop out of the Bubbles member search and can't be picked as a new message recipient.
2. **During the 30 days:** if they sign in, with email and password or with Google, they land on /account/deletion-pending with two buttons, **Cancel deletion & reactivate** and **Sign out**. Cancelling clears the deletion, makes the tanks that were public visible again, and takes them to their profile page. Their ads stay expired; they repost the ones they want from **My listings**. For deletions requested before this change there is no saved tank list, so they see "Welcome back" and are told their tanks are still private and to make them public again in the Tank Builder.
3. **After 30 days:** a scheduled job (/api/cron/purge-accounts, which the code says runs daily via Vercel Cron) permanently removes the account. It handles up to 50 accounts per run.

A member who owns a club can't delete their account. They see "You own one or more clubs. Please transfer ownership or delete those clubs first, then delete your account."

## What does the 30 day purge remove?
When the purge job reaches an account, it:

- **Keeps but anonymizes:** their store reviews and the events they created (the author link is removed, the content stays).
- **Deletes:** their classified ads (if the database refuses because something still points at an ad, such as a message thread, the ads are set to removed instead so they stay hidden), their ad photos, tanks, tank votes, notifications, club memberships, Breeder Award submissions, event RSVPs and shop review replies.
- **Deletes their profile.** If something in the database still points at the profile and blocks the delete, the profile is instead kept as a blank placeholder with the username changed to deleted_ followed by the first 8 characters of their id.
- **Deletes their sign-in account** (email and login) last.

The job needs the CRON_SECRET environment variable. The request must carry it, or the job answers "Unauthorized" and does nothing.

**Known issue:** the purge code doesn't mention feed posts, forum posts or messages. Whether they go depends on how the database links them to the profile. If you need them gone, check those tables for the member's id after the purge.

## Can I cancel someone's deletion for them?
Yes, in Supabase. In **profiles**, find their row and clear both **deleted_at** and **deletion_scheduled_for**. The member's own **Cancel deletion & reactivate** button also makes their previously public tanks public again from the saved list; doing it by hand in Supabase doesn't, so their tanks stay private until they switch them back on. Better: ask the member to sign in and press the button themselves.

This only works before the purge job runs. Once purged, the account is gone.

## Can I delete an account for a member?
Not from the site. The safe way is to ask the member to do it from /account. If you must do it yourself, the closest match to the real flow is to set **deleted_at** to now and **deletion_scheduled_for** to the date you want it purged on the member's profiles row, and let the purge job do the rest. That runs the same cleanup as a member-initiated deletion. Deleting the user directly under Authentication skips all the cleanup steps above.

## How do I see which accounts are waiting to be deleted?
There's no admin screen for it. In Supabase, filter the profiles table for rows where deleted_at is not empty. deletion_scheduled_for shows when each will be purged.

## Can I change a member's username, email or profile?
Not from the site. Members change their own profile at /profile and their password at /account. If you must change something for them:

- **Username, name, bio:** edit the row in profiles. Usernames must be unique; the site's rule is 3 to 24 letters, numbers or underscores.
- **Email:** change it under Authentication, Users in Supabase.

## Can I export a member's data for them?
Members can download their own copy from /account. There is no admin version. If a member asks for their data and can't sign in, pull it from Supabase by their id.

## Common problems
**The member search on Bubbles doesn't find someone.** It searches usernames only, and skips accounts scheduled for deletion. Try part of the username, or look them up in Supabase.

**A member reactivated and their ads are gone.** Deleting the account marked their live ads expired. They repost them from **My listings**.

**A member says they can't delete their account.** If they own a club, they must hand it over or delete it first. See [Deleting your account](/help/deleting-your-account).

**A purged member shows as deleted_xxxxxxxx somewhere.** The profile couldn't be fully deleted because other data still pointed at it, so it was blanked instead. That is expected.

**A member wants their suspended account back.** Follow [How do I lift a suspension?](/admin/help/member-lookup-and-accounts#how-do-i-lift-a-suspension).

**The purge job isn't removing anyone.** Check CRON_SECRET is set in Vercel and that the job is scheduled. See [Admin troubleshooting](/admin/help/admin-troubleshooting).
