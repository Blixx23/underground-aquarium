---
title: Reviewing species photos
category: Content review
summary: How to use or reject members' own fish photos for species pages, the 5 photo limit, replacing and cover photos, rejection reasons, and the bubble reward.
order: 20
keywords: photo queue, species photos, member photos, approve photo, use it, reject photo, cover photo, main photo, replace photo, 5 photos, species photographer trophy, photo by
pages: /admin/species-photos, /species/[slug], /species
---

Members can send a photo of their own fish for its species page. Nothing goes live until an admin presses **Use it** on the **Species photos** screen at /admin/species-photos. The member side is described in [Submitting species photos](/help/submitting-species-photos).

## Where do species photos show up?
Pick **Species photos** in the admin side menu (subtitle "Member photos to review"), or press the **Species photos** card on the [Dashboard](/admin) ("Members' own photos waiting to go on species pages").

The badge and the "N waiting" pill count every photo with the status pending, and that number is added into the Dashboard's "N things waiting on you." line.

## What does the Species photos page show?
The heading is **Species photos** with this reminder: "Photos members took of their own fish. Only use the sharp, well lit, correctly identified ones: up to 5 per species. **Use it** puts it on the species page with their name, gives them 50 bubbles and counts toward their Species Photographer trophies. A rejection needs a reason; they see it."

Photos are listed oldest first, one card each. When nothing is waiting you see "Nothing waiting."

**Known issue:** the page only loads the 100 oldest waiting photos. If more than 100 are waiting, the Dashboard count will be higher than the number of cards. Work through the list and reload to see the next ones.

## What's on each photo card?
- The photo, large. Click it to open the full-size file in a new tab.
- The species name, linked to its species page (opens in a new tab), with the scientific name under it.
- "From" and the member's name (linked to their public profile when they have a username), the date sent, and the pixel size. The size turns green when the long side is 2000 pixels or more.
- The member's caption in quotes, if they wrote one.
- A pill on the right: "N of 5 live", how many photos this species already has on its page. It turns amber when the species is full.
- **Already live on the page:** small thumbnails of the photos already approved for this fish. A star marks the current cover photo.

## How do I use a photo?
1. Check it's sharp, well lit, correctly identified and the member's own.
2. Decide on the cover (see the cover section below).
3. Press **Use it**.

The card leaves the queue. The database marks the photo approved, puts it on the species page with **Photo by** and the member's name, sends the member a notification that names the fish, links to its page and mentions the bubbles, and updates their Species Photographer trophies. The site then adds the bubbles (50, set in the bubble rules table) without sending a second generic "you earned bubbles" notice. A tier-up notice and email still go out if the bubbles move them up a tier. The species page and the species list are refreshed straight away.

Other cards for the same fish update to show the new photo in their "Already live" row.

## What happens when a species already has 5 photos?
Each species can show 5 approved photos. When a card says "5 of 5 live":

1. The thumbnails label changes to "Already live. Tap the one this replaces:".
2. Tap the thumbnail to swap out. It dims and shows **Replace**. Tap it again to undo.
3. Press **Use it (replace selected)**.

The chosen old photo is taken off the page and the new one takes its place. If the one you replaced was the cover, the new photo becomes the cover. If you press the button without picking one you see "This fish already has 5 photos. Pick the one this replaces." The database enforces the 5-photo limit too.

## How does the cover photo work?
The cover is the main photo on the species page and on its card in the [Fish Species](/species) directory.

- If the species has no cover yet, the box reads "Will be the cover photo (first one for this fish)" and is ticked and locked.
- Otherwise the box reads **Make this the cover photo**. Tick it to make the new photo the cover. The old cover stays on the page as a normal photo.

**Known issue:** there's no way to change the cover, remove an approved photo, or edit a caption after approval from the admin area. Those changes have to be made in the species photos table in Supabase.

## How do I reject a photo?
1. Press **Reject**. A row of ready-made reasons appears with a text box.
2. Tap a reason to fill the box, or write your own (up to 300 characters). The ready-made reasons are:
   - "It isn't sharp enough."
   - "It's too dark or washed out."
   - "The fish is too small in the frame."
   - "It doesn't look like this species."
   - "It needs to be your own photo of your own fish."
   - "It has a watermark, text or a filter on it."
   - "We already have a better shot of this angle."
3. Press **Reject with this reason**. Press **Cancel** to go back without rejecting.

The member is notified with your reason. The file is deleted from storage (if that cleanup fails the photo is still rejected and the leftover file isn't shown anywhere). Unless you untick **Thank them with 10 bubbles** (do that for spam), they also get 10 thank-you bubbles, added to the same notice with a thank-you line. If the box is empty you see "Pick or write a reason. The member sees it."

## What does the member get when a photo is used?
- A notification naming the fish, linking to its page and mentioning the bubbles.
- 50 bubbles, once per approved photo.
- Credit under the photo: **Photo by** their name, linked to their profile, plus their caption.
- Progress toward the Species Photographer trophies.

See [Bubbles](/help/bubbles) and [Trophies](/help/trophies).

## What limits apply on the member side?
Members can have up to 2 photos of the same species waiting at once. When a species already has 5 approved photos, new ones can still arrive and you choose which to replace. Full member rules are in [Submitting species photos](/help/submitting-species-photos).

## Common problems
**"Couldn't save that." or a database message under the card.** The decision didn't save. Common database messages come from the 5-photo limit (pick one to replace) or a permission check. "Not signed in." means your session expired.

**The Dashboard says more are waiting than I can see.** Only the 100 oldest load at once. Reload after clearing some.

**A member asks to take down their approved photo.** There is no remove button. Change that photo's row in the species photos table in Supabase (or delete it) and the species page updates within the hour, or immediately on the next approval for that fish.

**The new cover didn't show on the species list.** The list is refreshed on approval; do a hard refresh. If it still shows the old one, check that only one photo for the species is marked as the cover in the database.
