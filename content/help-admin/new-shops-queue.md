---
title: Reviewing new shops members suggest
category: Fish stores
summary: The New shops screen, where shops members send in with Suggest a store wait for review: what each card shows, editing details, what Publish and Reject do, map pins, and who is notified.
order: 50
keywords: new shops, suggested shops, suggest a store, pending shops, publish shop, reject shop, add store, missing store, store suggestion, map pin, geocode, directory
pages: /admin/pending-shops, /stores, /stores/[slug]
---

Members can suggest a fish store that is missing from the directory with **Suggest a store** on the [Shops](/stores) page. Each suggestion is saved as a new shop with the status pending, so it isn't public anywhere. The **New shops** screen at /admin/pending-shops is where you publish it or turn it down. The member side is described in [Suggesting a store](/help/suggesting-a-store).

## Where do I find suggested shops?
Open the admin area and pick **New shops** from the side menu (subtitle "Shops members suggested"), or press the **New shops** card on the admin [Dashboard](/admin) ("Shops members suggested, waiting to go in the directory").

The menu badge and the card's "N waiting" pill count every shop with the status pending. That number is added into the "N things waiting on you." line on the Dashboard. Counts refresh each time an admin page loads.

Only admins can open the screen. Signed out, you are sent to the sign-in page; signed in without the admin flag, you see "Admins only".

## What does the suggester send in?
The **Suggest a store** form asks for the shop name (required), city, state, website, a note and the kinds of store it is. It doesn't ask for a street address. The member must be signed in. They then see "Thanks for the suggestion!" and "We'll review it and add it to the directory."

The shop is saved with the status pending, the member's note as its description, the store types they ticked as tags, and the member as the person who suggested it.

## What does each card show?
Cards are listed oldest first, so the longest waiting shop is at the top. Each card shows:

- The shop name.
- The address, city and state, or "No location given".
- "Suggested by @username" (or their full name, or "a member") and the date.
- The store types they ticked, as small tags.
- "Website:" and the address they typed, shown as plain text on purpose (admin screens don't link out to sites nobody has checked).
- Their note, if they wrote one.
- **Publish**, **Edit details** and **Reject**.

With nothing waiting you see "No suggested shops waiting for review."

## How do I check a suggestion is real?
Look the shop up yourself before publishing: search its name and city, and copy the website into your browser by hand. Reject anything that isn't a fish or aquarium store (pet chains with no fish section, garden centers), anything closed for good, and duplicates of a shop already in the directory. The directory rules for existing shops are in [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests#when-should-a-shop-be-hidden).

## How do I fix the name or address before publishing?
1. Press **Edit details**. The button turns green and a box opens with **Shop name**, **Street address** ("Helps put the pin in the right spot"), **City** and **State**.
2. Change what you need. Suggestions arrive without a street address, so add one when you can: it is what puts the map pin in the right place.
3. Press **Publish**. The box notes "These changes are saved when you press Publish."

Pressing **Edit details** again closes the box and throws away the changes. The shop needs a name: publishing with the name empty shows "The shop needs a name before it can go live." Other details (hours, phone, photos) are filled in later from the shop's dashboard, which admins can open at /my/shops/<shop-slug>; see [Managing shops](/admin/help/managing-shops).

## What does Publish do?
1. Press **Publish** (there is no confirm step).
2. The shop's status becomes published, with any edits from the **Edit details** box saved at the same time.
3. The site immediately tries to look up map coordinates from the address, city and state (a free OpenStreetMap lookup that gives up after 5 seconds). If it finds them, the shop goes on the map straight away.
4. The card leaves the list and the page refreshes, so the badge drops.

The shop now appears in the [Shops](/stores) directory and gets its own page at /stores/<slug>. It is unclaimed, so its page shows the claim button, and if it has a contact email it can be picked up by an outreach campaign (see [Campaigns](/admin/help/campaigns)).

The suggester gets a bell notification "Your shop suggestion is live": "<shop name> is now in the Shops directory. Thanks for helping other hobbyists find it.", linking to the shop's page. No email is sent.

## What if the map pin didn't appear?
If the lookup finds nothing, or you changed the address and the lookup failed, the shop is published without a pin (old coordinates are cleared if you changed the address). The separate store geocoder at /api/stores/geocode picks up published shops with no pin, up to 8 per run. It only runs when that address is called with ?key= followed by the GEOCODE_SECRET environment variable. You can also set lat and lng on the shop's row in Supabase by hand.

## What does Reject do?
1. Press **Reject**.
2. Confirm "Reject this shop? It will be hidden from the directory."

The shop's status becomes hidden. Nothing is deleted: it shows under **Hidden** on [All shops](/admin/help/managing-shops), and you can switch it on later from its dashboard if you change your mind. There is no box for a reason.

The suggester gets a bell notification "Shop suggestion reviewed": "Thanks for suggesting <shop name>. We couldn't add it to the directory this time. Questions? Write to support@undergroundaquarium.com.", linking to the Shops page. No email is sent.

## Who is notified, all in one place
| Action | Suggester gets |
|---|---|
| Publish | "Your shop suggestion is live" |
| Reject | "Shop suggestion reviewed" |

Both are bell notifications in the shops group of the member's notifications. If a notification fails to save, the decision still stands. Notifications never name you.

## Common problems
**"This shop was already reviewed."** Another admin (or another tab) already published or rejected it. Reload.

**"Shop not found."** The row was deleted in Supabase. Reload.

**Reject shows an error ending in "Run step 56 in Supabase first."** The database doesn't yet allow the hidden status. Run that setup step, then try again.

**The badge counts a shop I can't see on the screen.** Reload. The count and the list both read shops with the status pending, so they match after a fresh load.

**A published shop isn't on the map.** It has no pin yet. See [What if the map pin didn't appear?](/admin/help/new-shops-queue#what-if-the-map-pin-didn-t-appear).

**The suggester says the shop is a duplicate after all.** Hide it from its dashboard with the **Shown in Shops** switch. See [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests).
