---
title: Reviewing store claims
category: Fish stores
summary: How to approve or turn down shop owners asking to manage a store page, what the emailed claim link proves, and how to take a shop back from an owner.
order: 10
keywords: claim queue, approve owner, verify shop owner, claim request, store ownership, release owner, claim token, claim link, one press claim, pending claims
pages: /admin/stores, /claim/[slug], /stores/[slug], /my/shops
---

Store claims are shop owners asking to manage their page in the fish store directory. Nobody gets control of a shop until an admin approves the claim on the **Store claims** screen at /admin/stores.

## Where do store claims show up?
Open the admin area and pick **Store claims** from the side menu (its subtitle is "Owners claiming a shop"), or press the **Store claims** card on the admin [Dashboard](/admin). The card's description reads "Shop owners asking to manage their listing".

The number badge on the menu item and the "N waiting" pill on the Dashboard card both count claims that are still waiting (status pending). That same number is added into the "N things waiting on you." line at the top of the Dashboard. The count is refreshed each time you load an admin page, so a claim filed a minute ago appears on your next page load.

Only admins can open /admin/stores. A signed-out visitor is sent to the sign-in page, and a signed-in member who is not an admin gets a "not found" page.

## What are the Waiting, Approved and Rejected tabs?
The row of three tabs at the top of the page filters the list:

- **Waiting**: claims nobody has decided yet. This is the default view (/admin/stores or /admin/stores?status=pending).
- **Approved**: claims you or another admin approved (/admin/stores?status=approved).
- **Rejected**: claims that were turned down (/admin/stores?status=rejected).

When a tab is empty you see "No claims waiting." on Waiting, or "Nothing approved yet." / "Nothing rejected yet." on the other two.

## What does each claim card show?
Every claim is a card with:

1. **The shop name**, linked to its public page (/stores/[slug]) in a new tab.
2. **City and state** under the name. If the shop already has an owner, an amber "· already has an owner" note appears after the location.
3. **The date the claim was filed**, top right.
4. **The person claiming**, by display name. If they have a username, the name links to their public profile at /u/[username] in a new tab.
5. **Contact email**, if they gave one or the claim came from an emailed link. It is a mailto link so you can write to them directly.
6. **Proof**, the text they wrote explaining how to verify them, shown exactly as typed.

On the Approved and Rejected tabs, the buttons are replaced with a line such as "Approved Sep 27, 2026" or "Turned down Sep 27, 2026", followed by your note if you left one.

## How do I tell a claim came from an emailed claim link?
Claims made from the one-press link in an outreach email fill in the proof for the owner. The proof reads "Opened the claim link emailed to" followed by the address the shop publishes (or "the shop's listed address" when the site has no address on file for that shop). The contact email on the card is the shop's published address, not necessarily the address the person signed up with.

That link is signed specifically for that one shop. It proves the person opened mail sent to the shop's own published address, which is a strong sign they really work there. It does not sign anyone in or grant anything by itself: they still need an account, and you still approve the claim here.

Claims made from the **Claim it** button on the public shop page have a proof paragraph the owner wrote themselves (the form asks for things like a business email on the store's website, the shop phone number, or a link to their site or social accounts). Check those before approving.

## How do I approve a claim?
1. Open the **Waiting** tab.
2. Check the shop, the person and the proof. Open the shop page and their profile if you need to.
3. Press **Approve**.

The card disappears from the list straight away. After approval the member becomes the shop's owner: the shop shows under **My shops** at /my/shops for them, they can open the shop dashboard at /my/shops/[slug], and the public page shows "This store is managed by its owner." instead of the claim button. Any outreach campaign drops that shop on its next run, because campaigns only write to unclaimed shops (see [Campaigns](/admin/help/campaigns)).

**Known issue:** the claim page tells owners "You'll get an email the moment it's approved", but none of the site's own code sends an approval email or notification; the decision is saved by a database function that is not part of this code copy. After approving, search the owner's address on the [Email](/admin/email) page (Everything tab). If nothing was sent, email them yourself from support@undergroundaquarium.com with a link to /my/shops.

## How do I turn a claim down?
1. Optionally type a message in the box that says "Note to them (sent if you turn it down)".
2. Press **Turn down**.

The card leaves the Waiting list and appears on the Rejected tab with your note. The note is also saved on the claim. The same known issue applies as for approval: the screen says the note is sent, but the site's code does not send it itself, so confirm on the Email page and write to them by hand if needed.

A turned-down person can file a new claim later from the shop page.

## What does "already has an owner" mean, and how do I remove the current owner?
The amber "already has an owner" note means someone else already manages this shop. A second person claiming it can mean staff turnover, a sold shop, or someone trying to take over a page that isn't theirs.

When that note is showing, a **Remove current owner** link appears to the right of the buttons. Pressing it asks "Take this shop back from its current owner?". If you confirm, the shop is released from its current owner and the page reloads. You can then approve the new claim.

Do this before approving: the code does not show what Approve does to a shop that still has an owner, so release first to be safe. Write to the old owner before you release them; nothing in the site's code tells them.

**Known issue:** there is no other button anywhere in the admin area to remove an owner. **Remove current owner** only appears on a waiting claim for an already owned shop. To take a shop back with no claim waiting, you have to change it in Supabase.

## What happens on the owner's side when they claim?
There are two ways in, both described for owners in [Claiming your store](/help/claiming-your-store):

- **From the shop page** (/stores/[slug]): the **Claim it** button at the bottom opens a form with an optional contact email and a required proof box. They press **Submit claim** and see "Claim submitted". Signed-out visitors see "Sign in to claim this store." Outreach emails can link to /stores/[slug]#claim, which opens the form automatically.
- **From an emailed claim link** (/claim/[slug]?t=...): no form. Signed in, they see one button, "Yes, I own or manage [shop name]", and after pressing it, "That's it, [shop name] is yours." with a note that claims are checked by hand. Signed out, they see **Create an account** and **I already have one**, and the link brings them back after sign-in.

If the same person claims the same shop twice, the emailed link shows "You've already asked to claim this shop. I'll get to it shortly." and the shop page form shows "Couldn't submit your claim. You may have already requested this store."

## When does an emailed claim link stop working?
Claim links do not expire on a timer. The link is a signature made from the shop and a server secret. The claim page shows "That link has expired" (with a button back to the shop page) in these cases:

- the `t=` part of the link is missing or was cut off when copied,
- the link was made for a different shop,
- the server secret changed. Links are signed with the `CRON_SECRET` environment variable (or `SUPABASE_SERVICE_ROLE_KEY` if that is missing). **Changing `CRON_SECRET` in Vercel breaks every claim link already emailed**, and every unsubscribe link too.

If the shop is already claimed, the link shows "[shop name] is already claimed" instead, and asks the person to reply to the email.

## Can a hidden shop be claimed?
Yes. The emailed claim link works for a shop even when it is hidden from the directory, because that page reads the shop directly. The ordinary **Claim it** form cannot be reached, because a hidden shop's public page is "not found" for everyone. Also note that the shop name link on the claim card goes to that public page, so it shows "not found" for a hidden shop. Use [All shops](/admin/shops) to check it instead.

## Where do I get a fresh claim link to send someone?
Use **Bring back** in the **Remove from outreach** box on the [Campaigns](/admin/campaigns) page. It gives you a **Copy claim link** button for the shop matching an email address or domain. It also unhides the shop and lets email reach them again, so read [Shop visibility and removal requests](/admin/help/shop-visibility-and-removal-requests) first.

## Common problems
**An error in a red box appeared when I pressed Approve or Turn down.** The message comes straight from the database. The claim stays in the list. Reload the page and try again; if it repeats, the claim may already have been decided by another admin.

**The claim vanished but the person says they still can't manage the shop.** Ask them to sign in with the same account that filed the claim and open /my/shops. Check in [All shops](/admin/shops) that the shop now shows "Claimed" with their name.

**The person claimed with a different email than the shop publishes.** That is normal for emailed links: the proof shows the shop's address, and the account can use any address. Approve if the proof line is there.

**Two people want the same shop.** Decide which is legitimate, email both if you are unsure, and only use **Remove current owner** once you are confident.

**The owner never got an approval email.** See the known issue above. Email them yourself.

**I approved the wrong person.** Wait for the right person to file a claim, then use **Remove current owner** on it, or change the owner in Supabase.
