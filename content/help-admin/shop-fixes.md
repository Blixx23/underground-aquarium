---
title: Handling shop fixes
category: Fish stores
summary: How to work the Shop fixes queue, where shoppers flag wrong hours, phone numbers, websites, names and moved or closed stores.
order: 20
keywords: store edit suggestions, wrong hours, closed store, moved store, fix report, listing correction, flagged details, suggest a fix, store corrections
pages: /admin/store-fixes, /admin/shops, /my/shops/[slug]/hours, /stores/[slug]
---

Shoppers can flag a wrong detail on any shop page with the **Something wrong here? Suggest a fix** link. Nothing on the shop page changes when they do. Each flag lands in the **Shop fixes** queue at /admin/store-fixes for an admin to check and correct by hand.

## Where do shop fixes show up?
Pick **Shop fixes** in the admin side menu (subtitle "Wrong hours, moved, closed"), or press the **Shop fixes** card on the admin [Dashboard](/admin) ("Wrong hours, moved or closed shops, flagged by shoppers").

The badge on the menu and the "N waiting" pill on the card count fixes that are still open. That number is part of the "N things waiting on you." total at the top of the Dashboard.

The page heading is **Shop fixes**, with the line "Shoppers flagging wrong details. Open the shop, edit it, then mark it done." When nothing is open you see "Nothing waiting."

## What does a shopper see when they flag something?
On the public page of an unclaimed shop (/stores/[slug]) a signed-in member presses **Something wrong here? Suggest a fix**, picks what is wrong, writes a short note (at least 2 characters) and sends it. They then see "Thanks! We'll check it and update the page." Signed-out visitors are asked to sign in first. Claimed shops don't show the button: their owner keeps the details. The member guide is [Suggesting store fixes](/help/suggesting-store-fixes-and-sightings).

## What does each fix card show?
Fixes are listed oldest first, up to 200 at a time. Each card shows:

1. **The shop name**, linked to its public page. If the shop can't be found it says "Unknown shop".
2. **City, state, the date filed, and who sent it**, as @username (or "member" if they have no username).
3. **The kind of fix**, in amber capitals.
4. **What the shopper wrote**, exactly as typed.
5. **"Now:"** followed by what the shop page currently says, for the kinds where there is one field to compare: hours, phone, website, and the street address for "Moved".
6. Two buttons: **Fixed** and **Dismiss**.

## What do the fix kinds mean?
The shopper picks one of these, and the queue shows the short label:

| Shopper picked | Queue shows | Shows "Now:" |
|---|---|---|
| Hours are wrong | Hours | current hours |
| Closed for good | Closed for good | no |
| Moved to a new address | Moved | current street address |
| Phone number is wrong | Phone | current phone |
| Website is wrong | Website | current website |
| Name is wrong | Name | no |
| Something else | Other | no |

## How do I fix a shop's details?
The queue itself never edits the shop. To correct it:

1. Note the shop name from the card.
2. Go to [All shops](/admin/shops), search for the shop and press **Dashboard**. That opens the owner dashboard for the shop at /my/shops/[slug], which admins can open for any shop.
3. Open **Hours & details** and press **Edit store**.
4. Change the field (Street address, City, State, Phone, Website, Hours, Short description or What you carry) and press **Save changes**.
5. Go back to /admin/store-fixes and press **Fixed** on the card.

See [Managing shops](/admin/help/managing-shops) for everything on the dashboard.

## What do Fixed and Dismiss do?
- **Fixed** marks the fix done and stamps the time. It leaves the queue.
- **Dismiss** marks it dismissed (the shopper was wrong, or it's a duplicate) and stamps the time. It leaves the queue.

Neither button changes the shop, and neither sends the shopper a message or notification. There is no list of past fixes on this screen, and no undo button: once a card is gone it can only be found again in Supabase.

## How do I handle "Closed for good"?
Check the shop really closed (its website, phone, or a second report). Then hide it: in [All shops](/admin/shops) press its **Shown in Shops** switch so it reads **Hidden from Shops**. The shop leaves the directory list, the map and its public page, and nothing is deleted. Then press **Fixed**. See [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests).

## How do I handle "Name is wrong"?
**Known issue:** the shop name cannot be changed anywhere on the site. The **Edit store** form has no name field, for owners or admins. Change the `name` on the shop's row in Supabase, then press **Fixed**. Changing the name does not change the page address (slug).

## Does the shop owner hear about a fix?
If the shop is claimed, its owner can also get a shop alert about the flag. The shop alerts job emails it with the subject "A shopper says ..." and a **Check your listing** button that opens their Hours & details page, unless the owner muted that alert type in their notification settings. That email is described for owners in [Shop notifications and emails](/help/shop-notifications-and-emails). For a claimed shop you can leave it to the owner, but the fix stays in your queue until you press **Fixed** or **Dismiss**.

## Common problems
**I pressed Fixed and nothing happened.** The buttons don't show errors. If the card is still there after the page refreshes, the update didn't save. Reload and try again.

**The shop link on the card shows "not found".** The shop is hidden, and hidden pages are not found for everyone, admins included. Use [All shops](/admin/shops) and the **Dashboard** button instead.

**"Now:" is missing.** Either the shop has nothing in that field yet, or the fix kind has no single field to compare (Closed for good, Name, Other).

**The same shop has several cards.** Fix it once, then press **Fixed** on one and **Dismiss** on the rest.

**Edit store saved but the page still shows the old value.** Reload the public page. If it is still wrong, see the known issue about admin edits in [Managing shops](/admin/help/managing-shops).
