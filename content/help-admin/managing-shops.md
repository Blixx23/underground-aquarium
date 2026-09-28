---
title: Managing shops as an admin
category: Fish stores
summary: Using the All shops screen to find any shop, see who owns it, open its dashboard as an admin, and show or hide it in the directory.
order: 30
keywords: all shops, shop list, store list, admin shop dashboard, edit any shop, shop owner email, claimed shops, hidden shops, fish stores admin, my shops
pages: /admin/shops, /my/shops/[slug], /my/shops/[slug]/hours, /my/shops/[slug]/updates, /my/shops/[slug]/photos, /my/shops/[slug]/reviews, /my/shops/[slug]/insights, /my/shops/[slug]/promotions
---

The **All shops** screen at /admin/shops lists every shop in the directory. From it you can find a shop, see who owns it and how to reach them, open that shop's dashboard exactly as its owner sees it, and show or hide the shop.

## Where is the All shops screen?
Pick **All shops** in the admin side menu (subtitle "Dashboards, show or hide"). On a phone the menu is the swipeable strip of buttons at the top. There is no card for it on the admin Dashboard, only the menu item, and it has no waiting count.

The page heading is **All shops**, with the line "Find any shop, open its dashboard, or show and hide it in the directory. Only admins can hide a shop."

## How do I search for a shop?
Type in the box that says "Shop name, city or state" and press **Search**. It matches any part of the shop name, city or state, so "reef", "Sacramento" or "CA" all work. Letters, numbers, spaces, periods, apostrophes, ampersands and hyphens are used; other characters are ignored.

The list is sorted by name and shows at most 60 shops. The count on the right says how many matched, for example "412 shops · showing first 60, search to narrow". If your shop isn't in the first 60, search for it by name.

When nothing matches you see "No shops match that."

## What do the All, Claimed and Hidden filters do?
The three pills under the search box:

- **All**: every shop that is either shown or hidden in the directory.
- **Claimed**: only shops someone has claimed (shown or hidden).
- **Hidden**: only shops that are hidden from the directory.

Your search is kept when you switch filters.

Shops suggested by members that nobody has reviewed yet (status pending) are in none of these views. They wait on [New shops](/admin/help/new-shops-queue) at /admin/pending-shops. Once published they show here; a rejected suggestion shows under **Hidden**.

## What does each row show?
- **The shop name.**
- **City and state** (or "No location"), then **Claimed** in green or **Unclaimed** in grey.
- For claimed shops, **the owner**: their full name (or @username) linked to their profile at /u/[username], their @username, and **the email they sign in with** as a mailto link. That sign-in email is shown only to admins.
- **The show or hide switch**, reading **Shown in Shops** (green) or **Hidden from Shops** (amber).
- **Dashboard**, which opens the shop's owner dashboard.
- An **open in new page** icon that goes to the public shop page. It only appears for shown shops, because hidden shop pages are "not found".

## How do I open a shop's dashboard as an admin?
Press **Dashboard** on the shop's row, or go straight to /my/shops/[slug] with the shop's page address. The shop dashboard normally only lets in the member who claimed the shop; admins are let in for every shop, claimed or not, shown or hidden. Anyone else who tries the address gets "not found".

The dashboard is the same one owners use, described for them in [Your shop dashboard](/help/shop-dashboard-overview). At the top it shows "Shop dashboard", the shop name and its location, a **View public page** button, and, for admins only, the same **Shown in Shops / Hidden from Shops** switch as the All shops list.

## What can I do in each dashboard tab?
The menu on the left (a strip on phones) has seven tabs:

- **Overview**: headline numbers for the shop. If the numbers can't load you see a "numbers unavailable" message.
- **Insights**: the longer view of the same numbers.
- **Updates**: post restocks, sales and events. See the note below about who gets notified.
- **Photos**: add and remove shop photos.
- **Hours & details**: press **Edit store** to change Street address, City, State, Phone, Website, Hours, Short description and What you carry, then **Save changes**. Underneath is a summary of Address, Phone, Website, Hours and About ("Not set" when empty), and a section for special hours on upcoming dates.
- **Reviews**: every review, newest first, with a reply box. An amber count on the tab shows reviews with no reply yet.
- **Promotions**: the shop's posters, badges and promotion kit.

The owner guides cover each tab in detail: [shop details and hours](/help/shop-details-and-hours), [shop photos](/help/shop-photos), [shop updates](/help/shop-updates), [replying to reviews](/help/replying-to-reviews), [shop insights](/help/shop-insights) and [posters, badges and promotions](/help/shop-posters-badges-and-promotions).

## What do members see when I post or reply as an admin?
Everything you do on a shop's dashboard is saved under **your own account**, not the owner's:

- **An update** you post is saved with you as the poster. Everyone following the shop gets a bell notification "[shop name] posted an update", but only if the shop is shown in the directory (hidden shops notify nobody), and never the person who posted it. The update also appears on the public shop page.
- **A reply to a review** is saved with you as the responder, and the reviewer gets a notification that the shop answered.
- **Photos, hours and details** simply change what the public page shows.

So if you post on a claimed shop's behalf, tell the owner.

## Can I change a shop's name?
No. The **Edit store** form has no name field for owners or admins. Change the name on the shop's row in Supabase. The page address (slug) stays the same.

## Why does "All my shops" not show the shop I was just in?
The **All my shops** link at the top of the dashboard goes to /my/shops, which lists only shops that you personally own. When you opened someone else's shop as an admin, it won't be there. Go back to [All shops](/admin/shops) instead.

## Why does "View public page" say not found?
The shop is hidden. Hidden shops' public pages are "not found" for everyone, admins included. Turn the switch to **Shown in Shops** if it should be public.

## How do I contact a shop owner?
On All shops, filter to **Claimed**, find the shop, and use the email address on its row. That is the address they sign in with. Unclaimed shops have no owner; their outreach address is not shown on this screen (see [Shop outreach](/admin/help/shop-outreach)).

## How do I take a shop away from its owner?
There is no button for it on this screen. The only **Remove current owner** control is on a waiting claim for that shop in [Store claims](/admin/help/store-claims). With no claim waiting, change it in Supabase.

## Common problems
**"Couldn't save your changes. Please try again." when saving Edit store as admin.** **Known issue:** the dashboard lets admins in, but every save (details, updates, photos, special hours, review replies) is checked by the database's own permission rules for that table, and those rules are not part of this code copy. If a save errors, or appears to save but the value is unchanged after you reload, the database is not letting admins edit that part of a shop you don't own. Make the change in Supabase, or ask the owner to do it.

**The switch shows an error.** See [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests#common-problems).

**Overview shows the numbers are unavailable.** The shop's numbers couldn't be loaded from the database. The other tabs still work.

**The owner's email is missing from the row.** The owner's account has no email address the admin tools can read. Use their profile instead.

**My shop isn't in the list.** Only the first 60 matches show. Search by name. If it still isn't there, it may be a member suggestion still waiting on [New shops](/admin/help/new-shops-queue).
