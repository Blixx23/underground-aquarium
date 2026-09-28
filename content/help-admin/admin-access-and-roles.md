---
title: Admin access and roles
category: Admin basics
summary: How the site decides who is an admin, how to make someone an admin, what admins can do outside /admin, and how site admins differ from Society and club officers.
order: 20
keywords: make admin, grant admin, is_admin, permissions, moderator, staff account, remove admin, officer, club admin, society officer, roles, access denied, officers only
pages: /admin, /profile, /my/shops, /my/shops/[slug], /feed, /forums/[category]/[thread], /c/[slug]/admin
---

There is exactly one site-wide admin switch: a yes/no flag called is_admin on each member's profile row in the database. Everything under /admin, and a handful of extra powers around the site, check that flag. Society and club officer roles are a separate system and do not make anyone a site admin.

## How does the site decide who is an admin?
Each member has a row in the profiles table in Supabase. That row has an is_admin column. When it is true, the member is an admin. When it is false or empty, they are not.

The site checks the flag fresh on every request:

- **The whole /admin area** checks it once at the top (the admin layout). Signed out: you are sent to /login. Signed in without the flag: you get the site's "not found" page.
- **Each admin action** (resolving a report, awarding bubbles, changing feedback status, hiding a shop and so on) checks it again on the server before doing anything. Without the flag the action answers "Admins only." Signed out it answers "Not signed in."
- **Some review actions** (species suggestions, species photos) are checked inside the database function that does the work, so the same flag decides them there.

Several admin pages also have their own "Admins only" screen ("You don't have permission to view this page."). In practice you won't see it, because the layout's "not found" check runs first.

## How do I make someone an admin?
There is no button for this anywhere on the site. It is done directly in the database:

1. Sign in to your Supabase project and open the **Table editor**.
2. Open the **profiles** table.
3. Find the member's row. Searching the username column is easiest.
4. Set **is_admin** to true and save the row.
5. Ask them to reload any page. The check happens on every request, so they don't need to sign out.

Their profile page at /profile now shows an **Admin** link in the **Settings** group, and /admin opens for them.

## How do I remove someone's admin access?
Same place: in the Supabase **Table editor**, open **profiles**, find their row, set **is_admin** to false, and save. Their next page load under /admin shows "not found", and their next admin action fails with "Admins only."

Nothing else is tied to the flag, so there is nothing else to clean up. Anything they did as an admin (resolved reports, awarded bubbles) stays as it was. Reports and bubble awards record which admin did them.

## Are there different admin levels?
No. Every admin can see and do everything in /admin. There are no moderator-only or read-only admin levels in the code. If you want someone to only handle reports, you have to trust them with the whole admin area, or keep them off it.

## What can admins do outside the /admin area?
The flag also unlocks these powers on normal member pages:

- **Delete any feed post.** On any member's post in the feed, open the **More options** (three dots) menu and choose **Delete post**. See [Moderating the feed and forums](/admin/help/moderating-feed-and-forums).
- **Delete any comment in the feed.** Comments shown under feed items get the trash icon ("Delete comment") for admins, not just for their writer and the post owner.
- **Edit or delete any forum post.** On a thread page, admins see **Edit** and **Delete** (or **Delete thread** on the opening post) under every post, and can still edit inside a locked thread. See [Moderating the feed and forums](/admin/help/moderating-feed-and-forums#can-i-edit-or-delete-forum-posts).
- **Open any shop's dashboard.** Go to /my/shops/<shop-slug> for any shop in the directory, claimed or not, and the shop dashboard opens for you just like it does for the owner. The shop won't be listed on your own **My shops** page (/my/shops); you reach it by address, from **All shops** (/admin/shops), or from the **Claimed** pill on [Shop stats](/admin/help/shop-stats).
- **Show or hide a shop in the directory.** On any shop dashboard, admins get an extra switch next to **View public page**, labeled **Shown in Shops** or **Hidden from Shops** (hover text "Admin only"). See [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests).
- **Your visits stop counting in site analytics.** When an admin signs in, the browser remembers to stop sending visits to Vercel Web Analytics (checked once per browser visit). This keeps your own clicking around out of the traffic numbers. You can also turn counting off on any device by opening any page with ?notrack=1 at the end of the address, and back on with ?notrack=0.

Whether a save inside a shop dashboard works for an admin depends on the database rules for that table, since the dashboard saves straight to the database as the signed-in person. If a save fails with a permission error, make the change in the Supabase table editor instead.

## What admins cannot do from the site
The code has no screen or button for these, so they are done in Supabase or not at all:

- Edit another member's feed post or profile.
- Lock or pin a forum thread.
- Suspend a member without a profile report (report their profile yourself, then act on it). Lifting a suspension is done with **Unsuspend** on [Reports](/admin/help/reports-queue#how-do-i-lift-a-suspension).
- Delete a member's account for them.
- Make someone an admin.
- Browse or search all members (the only member search is the username box on [Bubbles](/admin/help/bubbles-admin)).

## Site admins vs Society and club officers
Clubs, including the Underground Aquarium Society, have their own roles stored on the club's membership roster: **owner**, **admin**, **officer** and **member**. These are completely separate from the site admin flag:

- A **club owner, admin or officer** can open that club's management page at /c/<club-slug>/admin. For the Society that is /c/underground-aquarium-society/admin.
- **Owners and club admins** also get **Club settings**. Only the **owner** of an ordinary club gets **Delete club**; the Society has no Delete club section, and the database refuses to delete it. Officers can see the roster, **Member requests** when there are any, **Dues & payouts**, and the **Breeder Award Program** section.
- Officers can have an officer title. The suggestions offered are President, Vice President, Treasurer, Secretary, Events Coordinator and Membership Chair, but any title can be typed.

Being a site admin does **not** give you access to a club's management page. A site admin who isn't on the Society roster as owner, admin or officer sees "Officers only" and "You don't have permission to manage this club." on the Society page, even though the Society card sits on the admin Dashboard.

Being a Society officer does **not** give you access to /admin. They get "not found" there like any member.

To run the Society from your admin account, make sure your account is on the Society roster with the owner, admin or officer role. The roles are managed in the roster on the Society page itself. See [Society admin](/admin/help/society-admin).

## Can a member tell who the admins are?
Nothing on public pages marks someone as an admin. When an admin deletes a post or a report is acted on, notifications to members say "a moderator", never the admin's name.

## Common problems
**I set is_admin to true but still get "not found".** Check you edited the right row: the id on the profiles row must match the account you are signed into. Also check the value saved as true, not the text "true" in a different column. Then reload.

**My admin can open /admin but not the Society page.** Expected. Add them to the Society roster as an officer or admin; see [Site admins vs Society and club officers](/admin/help/admin-access-and-roles#site-admins-vs-society-and-club-officers).

**The Admin link isn't on my profile page.** The link only appears on /profile (your own dashboard page), in the **Settings** group, and only when the flag is set on the account you are signed into.

**An admin action says "Admins only."** Your session belongs to an account without the flag, often because you are signed into a second account in the same browser. Sign out, sign back in with the admin account, and try again.

**My own visits are showing up in analytics.** The "stop counting" check runs once per browser visit after an admin signs in. On a phone or a device you don't sign in on, open any page with ?notrack=1 on the end of the address.
