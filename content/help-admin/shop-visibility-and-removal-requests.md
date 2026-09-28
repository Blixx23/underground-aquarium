---
title: Shop visibility and removal requests
category: Fish stores
summary: How hiding and showing a shop works, the policy for shops that ask to be removed, bringing a shop back, and finding shops members suggested.
order: 40
keywords: hide shop, unhide shop, remove shop, take down page, delete store, not a fish store, closed shop, removal request, suggested shops, pending shops, publish store
pages: /admin/shops, /my/shops/[slug], /admin/campaigns, /stores, /stores/[slug]
---

Every shop in the directory is either shown or hidden. Hiding a shop takes it out of the directory without deleting anything, and it comes straight back when you switch it on again. This guide also covers the policy for shops that ask to be removed, and the shops members suggest.

## What does hiding a shop do?
A hidden shop:

- disappears from the Shops directory list at /stores and from the map,
- has its public page (/stores/[slug]) show "not found" to everyone, including admins,
- is left out of "nearby shops" lists,
- keeps all its data: reviews, photos, updates, owner and contact details are untouched,
- is dropped from any outreach campaign on the next planner run (see below),
- no longer notifies followers when an update is posted.

Its owner, if it has one, can still open the shop dashboard, and admins can too. An emailed claim link for it still works. Nothing tells the owner or anyone else that the shop was hidden.

## How do I hide or show a shop?
The switch is in two places:

- on each row of [All shops](/admin/shops), and
- at the top of the shop's dashboard (/my/shops/[slug]) when you are signed in as an admin.

It reads **Shown in Shops** (green) or **Hidden from Shops** (amber). Press it to flip it. While it saves it reads "Saving…", then the page refreshes. The directory and the shop's page are refreshed at the same moment, so the change is live straight away.

Only admins see this switch and only admins can use it. Owners cannot hide their own shop.

## When should a shop be hidden?
Hide a shop when it should not be in a fish store directory at all: it closed for good, it isn't a fish store (the directory was built from public listings, and some are pet or garden stores), or it's a duplicate. Hidden shops can be brought back at any time.

## What is the policy when a shop asks to be removed?
A shop asking to be removed comes **off the outreach emails**, but **its page stays up**, unclaimed and open to reviews like every other shop. Removal from outreach does not take the page down. The directory is a public listing of real shops, the same way a map app lists them.

The one exception: the very first batch of outreach emails promised to take the page down if asked. Only for shops that got that promise, tick **Also hide their page** when you remove them (see below).

Shops can also unsubscribe themselves with the link at the bottom of any outreach email; that does the same thing as **Remove**, without hiding the page. The owner-side explanation is in [Stopping shop emails](/help/stopping-shop-emails).

## How do I remove a shop from outreach?
Use the **Remove from outreach** box. It is at the bottom of the [Campaigns](/admin/campaigns) page and also on each campaign's own page.

1. In the box that says "sales@shop.com or shop.com", paste the address they wrote from, or just their domain (for example reeflifeaquariums.com) to cover every address at that shop.
2. Leave **Send them a confirmation email** ticked to send one short "You've been unsubscribed" email from you. Untick it to send nothing.
3. Leave **Also hide their page** unticked, unless this is a first-batch shop that was promised a take-down.
4. Press **Remove**.

The full list of what **Remove** changes is in [Shop outreach](/admin/help/shop-outreach#what-exactly-does-remove-do).

## What do the Remove results mean?
A green box reports what happened, for example "Done. [shop names] won't get outreach emails again. Their page stays up. Cancelled 1 waiting email." If you ticked hide it says "Their page is hidden." instead. It then lists who the confirmation went to, or warns "The confirmation to ... didn't send. Check the Email page. They're still off the list."

A claimed shop is never hidden, even with the box ticked, because that page belongs to its owner now.

## How do I bring a shop back?
When a shop that was removed changes its mind and wants to claim:

1. Type their address or domain in the same **Remove from outreach** box.
2. Press **Bring back**.

This puts any hidden page for that shop back in the directory, takes every address for that shop off the Do not email list so account mail can reach them, and shows "Back up and able to receive email again. Reply to them with their claim link:" with the shop name and a **Copy claim link** button. Paste that link into your reply. It is the one-press claim link described in [Store claims](/admin/help/store-claims).

They still won't get campaign emails. The box says so: "They still won't get campaign emails. They're coming in on their own."

**Known issue:** **Bring back** unhides every hidden shop matching that address or domain, whatever the reason it was hidden, and it removes those addresses from Do not email even if they got there by bouncing or a spam complaint. Only use it for a shop that asked.

## What about shops members suggest?
Members can suggest a missing shop with **Suggest a store** on the Shops page (see [Suggesting a store](/help/suggesting-a-store)). The suggestion is saved as a new shop with the status pending, which isn't shown anywhere public and isn't listed in All shops. Pending shops wait on the **New shops** screen at /admin/pending-shops, where you can fix the name and address, **Publish** the shop (with an instant attempt at a map pin) or **Reject** it. Rejecting sets the shop to hidden, the same hidden status described above, so it then shows under Hidden in All shops and can be switched on later. The suggester gets a bell notification either way. Full details: [New shops](/admin/help/new-shops-queue).

## Common problems
**"Admins only." or "Not signed in." under the switch.** Your session ended or your account isn't an admin. Sign in again.

**The switch shows an error ending in "Run step 56 in Supabase first."** The database doesn't yet allow the "hidden" status. Run that database setup step, then try again.

**"Took them off the emails, but couldn't hide the page: ... Has step 56 been run?"** Same cause. The shop is already off outreach; only the hiding failed.

**"Enter an email address, or a domain like reeflifeaquariums.com."** What you typed isn't an email or a domain. Remove extra words and spaces.

**"gmail.com is shared by lots of shops. Enter their full email address instead."** A shared mail provider (Gmail, Yahoo, Outlook, iCloud, Comcast and similar) can't be used as a domain. Paste their full address.

**"No shop contact found for that. Nothing to remove."** The site has no shop contact or campaign enrollment with that address. Check the spelling, try their domain, or add the address to Do not email on the [Email](/admin/email) page.

**"No shop found for that address."** after **Bring back**. Same cause: no shop is linked to that address.

**A hidden shop still appears in the directory.** Reload the page. The directory is refreshed when you flip the switch, but a browser can show an old copy.
