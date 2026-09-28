---
title: Member lookup and accounts
category: Moderation
summary: How to find a member, what suspension really does and how to lift it, how account deletion requests and the 30 day purge work, and what an admin can and can't change on an account.
order: 30
keywords: find user, look up member, search members, user email, suspend, unsuspend, ban, reinstate, delete account, deletion request, purge, gdpr, data export, cancel deletion, deleted user
pages: /admin/bubbles, /admin/site-stats, /admin/shops, /admin/reports, /account, /account/deletion-pending, /u/[username]
---

There is no member directory or account editor in the admin area. Member lookups are spread across a few screens, suspension only comes from a profile report, and account deletion is something members do themselves. Anything else is done in Supabase. This guide covers what exists and the safe way to do the rest.

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

The full list of effects and notifications is in [Working the Reports queue](/admin/help/reports-queue#what-does-suspend-account-do). In short: their public profile shows "not found", their tanks go private, and they get an "Account suspended" bell notification.

## What does a suspended member still have access to?
**Known issue:** in the site code, only the public profile page checks for suspension. A suspended member can still:

- sign in
- post and comment in the feed
- start threads and reply in the forums
- send messages
- keep their classified ads live
- use every tool

Workarounds, in Supabase:

- Hide their ads: in the listings table, filter user_id by their id and change status from active to expired, or delete the rows.
- Stop them signing in: under Authentication, Users, find their email and ban the user. Nothing on the site does this.

## How do I lift a suspension?
There is no button. In the Supabase **Table editor**:

1. Open **profiles** and find the member's row.
2. Clear **suspended_at**. You can also clear **suspended_reason** and **suspended_by** so the record is clean.
3. Save.

Their public profile comes back straight away. Their tanks stay private, because suspending switched every tank to private and nothing remembers which ones were public before. Let the member know so they can make their tanks public again, or set is_public back to true on the tanks you know were public. Nothing notifies the member that the suspension was lifted.

## How does account deletion work?
Members delete their own account from **Account & data** at /account, by typing DELETE to confirm. The member-side flow is in [Deleting your account](/help/deleting-your-account). What happens:

1. **Right away:** their profile is marked deleted and a purge date 30 days out is set. All their tanks are switched to private. Their public profile shows "not found", and they drop out of the Bubbles member search and can't be picked as a new message recipient.
2. **During the 30 days:** if they sign in, they land on /account/deletion-pending with two buttons, **Cancel deletion & reactivate** and **Sign out**. Cancelling clears the deletion and takes them back to their profile page.
3. **After 30 days:** a scheduled job (/api/cron/purge-accounts, which the code says runs daily via Vercel Cron) permanently removes the account. It handles up to 50 accounts per run.

A member who owns a club can't delete their account. They see "You own one or more clubs. Please transfer ownership or delete those clubs first, then delete your account."

## What does the 30 day purge remove?
When the purge job reaches an account, it:

- **Keeps but anonymizes:** their store reviews and the events they created (the author link is removed, the content stays).
- **Deletes:** their tanks, tank votes, notifications, club memberships, Breeder Award submissions, event RSVPs and shop review replies.
- **Deletes their profile.** If something in the database still points at the profile and blocks the delete, the profile is instead kept as a blank placeholder with the username changed to deleted_ followed by the first 8 characters of their id.
- **Deletes their sign-in account** (email and login) last.

The job needs the CRON_SECRET environment variable. The request must carry it, or the job answers "Unauthorized" and does nothing.

**Known issue:** neither the delete request nor the purge touches classified ads (the listings table). A member's live ads stay up during the 30 days, and after the purge they are either left behind or removed only if the database is set to remove them with the profile. The same goes for feed posts, forum posts and messages, which the purge code doesn't mention. After a purge, check the listings table for rows belonging to that member's id and delete them.

## Can I cancel someone's deletion for them?
Yes, in Supabase. In **profiles**, find their row and clear both **deleted_at** and **deletion_scheduled_for**. That is exactly what the member's own **Cancel deletion & reactivate** button does. Their tanks stay private; they need to switch them back on.

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

**A deleted member's ads are still showing.** Known issue: deletion doesn't touch classified ads. Change their ads' status or delete the rows in the listings table.

**A member says they can't delete their account.** If they own a club, they must hand it over or delete it first. See [Deleting your account](/help/deleting-your-account).

**A purged member shows as deleted_xxxxxxxx somewhere.** The profile couldn't be fully deleted because other data still pointed at it, so it was blanked instead. That is expected.

**A member wants their suspended account back.** Follow [How do I lift a suspension?](/admin/help/member-lookup-and-accounts#how-do-i-lift-a-suspension), then tell them to re-publish their tanks.

**The purge job isn't removing anyone.** Check CRON_SECRET is set in Vercel and that the job is scheduled. See [Admin troubleshooting](/admin/help/admin-troubleshooting).
