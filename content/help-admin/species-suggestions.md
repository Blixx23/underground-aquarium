---
title: Reviewing species requests
category: Content review
summary: How to add a requested fish to the species library, file it as another name for a fish you already have, or turn it down, how the AI check helps, and what the member gets.
order: 10
keywords: species queue, ai check, check again, what the checker did, gbif, worms, duplicate guard, we recommend, ai cost, ai's reason, turn down reason, species suggestions, requested fish, add species, new species page, alias, another name, turn down, cartographer trophy, tank builder species, library
pages: /admin/species, /species, /species/[slug], /tank-builder
---

Members can ask for a fish, shrimp, snail or crayfish that isn't in the species library. Every request waits on the **Species requests** screen at /admin/species until an admin adds it, files it as another name, or turns it down. Members see the request side of this in [Requesting a species](/help/requesting-a-species).

## Where do species requests show up?
Pick **Species** in the admin side menu (subtitle "Suggested fish"), or press the **Species** card on the [Dashboard](/admin) ("Fish and animals the community suggested").

The number badge on the menu item and the "N waiting" pill on the card count requests still marked pending. The same number is added into the "N things waiting on you." line at the top of the Dashboard.

Only admins can open the page. A signed-out visitor is sent to the sign-in page. A signed-in member who isn't an admin sees "Admins only" and "You don't have permission to view this page."

## What does the Species requests page show?
The heading is **Species requests**, with a line saying the AI checks each request against the whole library and recommends what to do, and an **Open the species list** link (opens /species in a new tab). Under it are three numbered steps:
1. Read the green **We recommend** box on a request.
2. Press its green button, or open one of the three options yourself. Nothing is saved yet.
3. Check the form, then press the button at the bottom of it. That's the only step that saves.

Requests are listed oldest first, all of them (there is no page limit). When nothing is waiting you see "No species requests waiting."

## What's on each request card?
From top to bottom:

- The **common name** the member typed, in large text, the **scientific name** in italics if they gave one, and "Requested by @username" with the date.
- **Their note**, if they wrote one.
- **Fish we already have with similar names:** up to 6 library fish that share words with the request. Each opens its species page in a new tab.
- The green **We recommend** box (see "What does the AI check do?").
- **Your options**: the three choices, each with one line saying exactly what happens if you pick it. The one the AI recommends is tagged **Recommended**.
  - **Add it to the library**: opens the care form. Saving creates the species page, puts it in the Tank Builder, gives the member their bubbles and drafts a breeding guide.
  - **It's another name for a fish we have**: you pick the fish and the member's name is added to it. No new page and no automatic bubbles.
  - **Turn it down**: the member sees your reason and gets 10 thank-you bubbles unless you untick it.

Pressing an option opens its panel; pressing it again closes it. Every panel has a plain sentence above its final button saying what that button will do.

## How do I add a requested fish to the library?
1. Under **Your options**, press **Add it to the library** (or the green button in the We recommend box). A form opens, pre-filled with the member's common and scientific names.
2. Fill in the care details (see the next section). **Group**, **Temp low °F**, **Temp high °F**, **Adult size (")** and **Min tank (gal)** are required.
3. Press **Save to library and reward** (for a variant it says **Save variant of [fish] and reward**).

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

1. Under **Your options**, press **It's another name for a fish we have**. The panel says the member's name "gets added as another name, so people searching it find the right fish."
2. Pick the fish. The similar fish (and any the AI pointed to) appear as buttons, and the first one is selected already. If the right fish isn't there, type in **Or search the library…** and pick from up to 8 results (it searches common names, scientific names and other names).
3. Press **Add as another name for [fish]**.

The database adds the member's name to that fish's other names, marks the request resolved and notifies the member. The species list, the Tank Builder and that fish's page are refreshed. If no fish is selected the button stays grayed out, and pressing it with nothing picked shows "Pick the fish it's another name for."

Another-name results earn no bubbles automatically: the server only hands them out when a new species is added, and the member guide says so. If you want to reward an another-name request, award the bubbles by hand on [Bubbles](/admin/help/bubbles-admin).

## What does the AI check do?
Every request gets checked automatically, and it starts **the moment the member sends it**, in the background, so the answer is usually waiting when you open the page. If that background check didn't happen (the member sent more than 5 today, or it broke), the page checks the request itself when you open it. A brand-new request that's still being checked in the background is waited for instead of being checked twice.

The check runs in steps. Each one is logged, and any step that breaks is covered by the next:

1. **Your past decisions** (free): reads the last 20 times you chose something different from what it recommended, and follows your lead on similar requests. This learns on its own every time you resolve a request.
2. **Library name match** (free): if the name they typed is already a common name, other name, former name, scientific name or trade code in the library, it's marked "already in the library" straight away with no AI at all.
3. **Name lookup** (free): looks the scientific name up in GBIF and WoRMS, two free scientific databases. They say whether it's a real species, its current name and any older names (so a fish we have under an old name is caught), and whether it lives in fresh, brackish or salt water. If neither can be reached, the careful check searches the web instead.
4. **Quick sort** (fast AI): sorts out names, groups and turn-downs. If it breaks, the careful check steps in.
5. **Careful check** (careful AI): only runs when the quick sort isn't sure, has low confidence, or something would be added. It uses the name lookup instead of searching the web, and only searches when the lookup couldn't help. If it breaks, the quick sort's answer is used and marked low confidence.
6. **Duplicate guard** (free): if the AI says "add new" but a library fish has any of its scientific names, it's changed to "another name" (or "already in the library"), so you never get a second page for the same fish. When the quick sort already wants to add a duplicate, the careful check is skipped to save money.
7. **Care data check** (careful AI, searches the web): for anything that would be added, fact-checks every value on the care form and the summary and care notes, fixes anything wrong or unsafe, and says why anything is left blank. If it breaks, it's tried once more.

If every AI step breaks, the box says the checker couldn't finish, rather than guessing. Press **Check again**, or decide it yourself.

The green **We recommend** box shows one plain sentence saying what to do, its verdict and confidence, and a line saying either that everything is filled in or exactly which required boxes the AI couldn't fill. Anything worth checking yourself (including database facts like "WoRMS lists this as a saltwater species") shows in amber. Its green button says exactly what it sets up (**Add the name to [fish]**, **Add as a variant of [fish]**, **Add it to the library** or **Turn it down with this reply**). It opens the right form already filled in; nothing is saved until you press the button at the bottom of the form.

Under the box:
- **Show the AI's notes**: its summary, the library fish that matter, the reply the member would see if you turn it down, and what the care data check changed.
- **What the checker did**: every step above, in order, marked **Done**, **Skipped**, **Broke** or **Stepped in** (a backup that ran because another step broke or found a problem), with what each one found, what it cost and how long it took.

**Check again** runs the whole check from scratch.

Verdicts:
- **Already in the library**: the fish and that name are already there.
- **Another name for a fish we have**: the fish is there but this name isn't recorded yet.
- **Too broad: a group, not one species**: they asked for a whole group like "Corydora" or "tetra".
- **New variant of a fish we have**: an established color or fin form of a library species. It gets its own page under the parent and copies the parent's care numbers. Only suggested when the parent is already in the library.
- **New: add it to the library**: a real freshwater or brackish species that isn't listed under any name.
- **Turn it down**: saltwater, a plant, made up, or not an aquarium animal.
- **Not sure: check it yourself**: it can't identify the fish with confidence.

## What does the AI check cost?
Exact name matches are free. A name or turn-down sorted by the quick sort costs about 1 to 2 cents. One that would add a fish costs more because of the careful check and the care data check, usually around 8 to 15 cents, and less when the name lookup works (it saves the web searches). **What the checker did** shows the cost of each step and the total.

## What reason will the member see if I turn it down?
The AI always writes the short reply the member would see if you turn the request down, whatever its verdict. It shows in the box as "If you turn it down, they see: ...".

- Opening **Turn it down** fills the reason box with that reply for you. You can send it as is or edit it.
- If you pick another ready-made reason or change the text, the purple **AI's reason** chip (with the sparkle icon) at the start of the reasons puts the AI's reply back.
- Checks saved before recommendations were added are redone automatically when you open the page.

## How do I turn a species request down?
1. Under **Your options**, press **Turn it down**.
2. The reason box starts with the AI's reply if the check wrote one. Keep it, edit it, pick one of the ready-made reasons (or the **AI's reason** chip to go back), or write your own (up to 300 characters). A reason is required: the member sees it. An empty box shows "Pick or write a reason. The member sees it."
3. Leave **Thank them with 10 bubbles** ticked, or untick it for spam.
4. Press **Turn it down** inside the panel.

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

**The same fish was requested twice.** Handle the first one, then use **It's another name for a fish we have** or **Turn it down** on the second.

**The group I need isn't in the Group dropdown.** The list only contains groups already used in the library. Pick the closest one, then change the species row's group in Supabase.

**The species page still shows "not found" after adding.** The page is refreshed when you add it, so reload with a hard refresh. If the add failed, the card would still be in the queue with an error under it.

**The similar fish list is empty, but the fish is already there.** Matching only compares whole words longer than two letters. Search the library in the **It's another name for a fish we have** panel, or open the species list, before adding a duplicate. The duplicate guard also catches a fish we have under any scientific name.

## Does a new species get a breeding guide?
Yes. After you add a new full species, the AI writes and fact-checks a breeding guide in the background and puts it on [Breeding guide drafts](/admin/help/breeding-guide-drafts) for your yes. A variety doesn't need one: its page shows the parent species' guide.
