---
title: Reviewing species requests
category: Content review
summary: How to add a requested fish to the species library, file it as another name for a fish you already have, or turn it down, and what the member gets.
order: 10
keywords: species queue, species suggestions, requested fish, add species, new species page, alias, another name, turn down, cartographer trophy, tank builder species, library
pages: /admin/species, /species, /species/[slug], /tank-builder
---

Members can ask for a fish, shrimp, snail or crayfish that isn't in the species library. Every request waits on the **Species requests** screen at /admin/species until an admin adds it, files it as another name, or turns it down. Members see the request side of this in [Requesting a species](/help/requesting-a-species).

## Where do species requests show up?
Pick **Species** in the admin side menu (subtitle "Suggested fish"), or press the **Species** card on the [Dashboard](/admin) ("Fish and animals the community suggested").

The number badge on the menu item and the "N waiting" pill on the card count requests still marked pending. The same number is added into the "N things waiting on you." line at the top of the Dashboard.

Only admins can open the page. A signed-out visitor is sent to the sign-in page. A signed-in member who isn't an admin sees "Admins only" and "You don't have permission to view this page."

## What does the Species requests page show?
The heading is **Species requests**, with this reminder under it: "Fish the community asked for. **Add to library** creates the care page and puts it in the Tank Builder. **Another name for** adds their name to a fish we already have. Both give the requester 25 bubbles and count toward their species trophies." There's also an **Open the species list** link that opens /species in a new tab.

Requests are listed oldest first, all of them (there is no page limit). When nothing is waiting you see "No species requests waiting."

## What's on each request card?
Each card shows:

- The **common name** the member typed, in large text.
- The **scientific name**, in italics, if they gave one.
- "Requested by @username" (or their full name, or "a member" if neither is set) and the date they asked.
- Their **note**, if they wrote one.
- **Similar in library:** up to 5 fish already in the library that share words with the request (common name, scientific name or other names). Each is a link that opens that species page in a new tab. Short words and the words "fish", "the" and "and" are ignored when matching, so an empty line doesn't prove the fish is new.

Under that are three buttons: **Add to library**, **Another name for…** and **Turn down**. Pressing one opens its panel; pressing it again closes it.

## How do I add a requested fish to the library?
1. Press **Add to library**. A form opens, pre-filled with the member's common and scientific names.
2. Fill in the care details (see the next section). **Group**, **Temp low °F**, **Temp high °F**, **Adult size (")** and **Min tank (gal)** are required.
3. Press **Add to library and reward**.

The card disappears from the queue. Behind the scenes the database creates the species page, marks the request as added, sends the member a notification and updates their trophies, then the site gives the member their species bubbles (tier-up notices and emails go out if the bubbles move them up a tier). The species list, the new species page and the [Tank Builder](/tank-builder) are refreshed straight away instead of waiting out their hour-long cache.

If you leave any required field empty you see "Fill in group, temperature, adult size and minimum tank. The Tank Builder needs them." and nothing is saved.

## What does each field on the Add to library form mean?
- **Common name** and **Scientific name**: pre-filled from the request. Fix spelling here.
- **Group**: a dropdown of every group already used in the library (starts on "Choose…"). You can only pick an existing group from this screen.
- **Water**: Freshwater or Brackish (default Freshwater).
- **Temp low °F / Temp high °F**, **pH low / pH high** (steps of 0.1), **GH low / GH high**.
- **Adult size (")**: in inches, steps of 0.1. **Min tank (gal)**: minimum tank size in gallons.
- **Temperament**: Peaceful (default), Semi-aggressive or Aggressive.
- **Social**: Schooling (default), Groups, Social, Pairs, Solitary, Colony or Harem.
- **Min group**: a number, for example 6.
- **Swims**: Top, Mid-top, Middle (default), Mid-bottom, Bottom or All.
- **Diet**: Omnivore (default), Carnivore or Herbivore.
- **Care**: Beginner (default), Intermediate, Advanced or Expert.
- **Suitability**: Common (default), Intermediate, Advanced, Expert or Kept but not recommended.
- **Breeding**: Choose… (blank), Egg-scatterer, Egg-depositor, Egg-layer, Substrate spawner, Cave spawner, Mouthbrooder, Bubble-nester or Livebearer.
- **Family**, **Lifespan** (for example "5-8 years") and **Origin**: free text.
- **Summary (one line)**: up to 140 characters.
- **Care notes (2-3 sentences)**: free text.

Empty optional fields are simply left off the new species.

## How do I file a request as another name for an existing fish?
Use this when the member asked for a trade name or a common name for a fish you already have.

1. Press **Another name for…**. The panel says the member's name "gets added as another name, so people searching it find the right fish."
2. Pick the fish. The **Similar in library** matches appear as buttons, and the first one is selected already. If the right fish isn't there, type in **Or search the library…** and pick from up to 8 results (it searches common names, scientific names and other names).
3. Press **Add name and reward**.

The database adds the member's name to that fish's other names, marks the request resolved and notifies the member. The species list, the Tank Builder and that fish's page are refreshed. If no fish is selected the button stays grayed out, and pressing it with nothing picked shows "Pick the fish it's another name for."

**Known issue:** the page text says both actions give the requester 25 bubbles, but the server only hands out bubbles when the database reports the request as "added" (a new species). The member guide tells members that another-name results earn no bubbles. If you want to reward an another-name request, award the bubbles by hand on [Bubbles](/admin/help/bubbles-admin).

## What does the AI check do?
Every request gets an **AI check** box as soon as the page opens. It reads the member's name, scientific name and note, then checks them against the whole species library: common names, scientific names, other names, former names, trade codes, groups and variants. It catches misspellings and plurals ("Corydora" for Corydoras) and hobby nicknames ("pleco", "cory").

It gives one verdict:
- **Already in the library**: the fish and that name are already there.
- **Another name for a fish we have**: the fish is there but this name isn't recorded yet.
- **Too broad: a group, not one species**: they asked for a whole group like "Corydora" or "tetra" and the library has species in it.
- **New: add it to the library**: a real freshwater species that isn't listed under any name.
- **Turn it down**: saltwater, a plant, made up, or not an aquarium animal.
- **Not sure: check it yourself**: with what to check.

It also shows what it thinks they meant, the library fish that matter, the reason the member would see, anything to double-check, and what the check cost (usually a few cents).

**Use this** puts the suggestion into the right form: picks the fish for **Another name for**, fills in the whole care sheet for **Add to library**, or writes the reason for **Turn down**. Nothing is sent until you check it and press the button. **Re-check** runs it again. Each check is saved, so it only runs once per request (that needs step70 SQL; without it the check runs again each time the page opens).

The checks run one at a time, so with several requests waiting the later ones take a little longer to appear. If the box says the AI isn't set up, the ANTHROPIC_API_KEY setting is missing in Vercel.

## How do I turn a species request down?
1. Press **Turn down**.
2. Pick one of the ready-made reasons or write your own (up to 300 characters). A reason is required: the member sees it. An empty box shows "Pick or write a reason. The member sees it."
3. Leave **Thank them with 10 bubbles** ticked, or untick it for spam.
4. Press **Turn down** inside the panel.

The request leaves the queue, the database marks it turned down and notifies the member with your reason, plus a thank-you line and the 10 bubbles if they were left ticked. The thank-you bubbles are given once per request. No trophy progress, and nothing changes in the library.

## What does the member get when a fish is added?
- A notification that their request was added.
- The species request bubbles. The amount comes from the bubble rules table in the database; the page text says 25. The bubbles are only given once per request, however many times the button is pressed.
- Progress toward the Cartographer species trophies.

See [Requesting a species](/help/requesting-a-species) for what members see, and [Bubbles](/help/bubbles) and [Trophies](/help/trophies) for how rewards work.

## Which member pages change?
- [Fish Species](/species): the new fish appears in the directory.
- /species/[slug]: the new care page goes live. If someone had visited that address before (and seen "not found"), the cached page is replaced.
- [Tank Builder](/tank-builder): the new fish can be picked. This is why the Tank Builder fields are required.

## Can I edit a species after I add it?
Not from this screen. Once a request is added the card is gone, and there is no species editing page in the admin area. To fix a mistake (wrong temperature, typo in the name, wrong group) edit that row in the species table in Supabase, then give the species page up to an hour to refresh.

## Who can resolve species requests?
Only site admins (profiles marked as admin). The database function that does the work checks this again, so a non-admin who somehow reached the page would get an error instead of a change. See [Admin access and roles](/admin/help/admin-access-and-roles).

## Common problems
**The button shows an error under the card.** Whatever the database said is shown as is (for example a duplicate name, or a permission error if your admin flag was removed). "Missing request or action." or "Invalid request." means the page sent a broken request; reload and try again. "Not signed in." means your session expired; sign in again.

**The same fish was requested twice.** Handle the first one, then use **Another name for…** or **Turn down** on the second.

**The group I need isn't in the Group dropdown.** The list only contains groups already used in the library. Pick the closest one, then change the species row's group in Supabase.

**The species page still shows "not found" after adding.** The page is refreshed when you add it, so reload with a hard refresh. If the add failed, the card would still be in the queue with an error under it.

**Similar in library shows nothing, but the fish is already there.** Matching only compares whole words longer than two letters. Search the library in the **Another name for…** panel, or open the species list, before adding a duplicate.
