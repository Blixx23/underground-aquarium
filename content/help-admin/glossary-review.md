---
title: Reviewing glossary suggestions
category: Content review
summary: How to tidy, add or dismiss glossary terms members suggest, how the Category box works, the full write-up every term has, merged terms and redirects, automatic glossary links, and why a new term can take up to an hour to show.
order: 40
keywords: glossary queue, full write-up, common questions, search title, merged terms, redirects, aliases, old address, glossary links, auto links, structured data, suggested terms, add term, dismiss term, glossary category, topic, wordsmith trophy, definitions
pages: /admin/glossary, /glossary, /glossary/[slug]
---

Members can suggest a term for the [Glossary](/glossary). Suggestions wait on the **Glossary suggestions** screen at /admin/glossary until an admin adds or dismisses them. The member side is in [Glossary](/help/glossary).

## Where do glossary suggestions show up?
Pick **Glossary** in the admin side menu (subtitle "Suggested terms"), or press the **Glossary** card on the [Dashboard](/admin) ("Terms waiting to be approved").

The badge and the "N waiting" pill count suggestions with the status pending. The number is added into the Dashboard's "N things waiting on you." line.

## What does the Glossary suggestions page show?
The heading is **Glossary suggestions** with this reminder: "Terms the community has suggested. Tidy the wording if needed, then add it or dismiss it. Adding one puts it in the glossary straight away and credits the person who suggested it."

Each suggestion is a card. When nothing is waiting you see "Nothing waiting."

A signed-in member who isn't an admin sees "Admins only".

## What's on each suggestion card?
- A small line: "From" the member's full name (or username, or "someone") and the date they sent it.
- Three editable boxes, filled with what the member wrote:
  1. The term.
  2. The definition.
  3. The category (placeholder **Category**).
- Two buttons: **Add to glossary** and **Dismiss**.

There is no character counter or limit shown on this screen.

## How do I add a suggested term?
1. Read the term and definition. Fix spelling, tone or accuracy right in the boxes.
2. Check the category (see the next section).
3. Press **Add to glossary**.

Your edited version (not the member's original) is what gets saved. The card leaves the list. The database adds the term to the glossary, marks the suggestion approved and credits the member, which counts toward their Wordsmith trophy.

## How should I fill in the Category box?
The category decides which topic filter the term appears under on the Glossary page. The glossary shows its topics in this order when they're in use:

Water Chemistry, Nitrogen Cycle & Filtration, Equipment, Fish Health & Disease, Fish Behavior & Biology, Plants & Aquascaping, Invertebrates, Breeding, Food & Nutrition, Maintenance, Water Types & Setup, General & Hobby.

Members pick from the topics already in use when they suggest a term, so most cards arrive with a valid category.

**Known issue:** the admin Category box is free text. A typo or new wording (for example "Water chemistry" with a small c) creates a brand new topic chip on the Glossary page, sorted after the standard ones. Copy the topic name exactly as listed above.

## How do I dismiss a suggestion?
Press **Dismiss**. There's no confirmation and no reason box. The card leaves the list and the suggestion is marked dismissed. Nothing is added to the glossary.

## When does a new term appear on the Glossary?
**Known issue:** the page text says "straight away", but the Glossary page and each term's page are rebuilt at most once an hour, and adding a term doesn't force a refresh. A new term can take up to an hour to appear at /glossary and at its own /glossary/[slug] address.

## What do members get?
Approved terms count toward the Wordsmith trophy (in the Library & Glossary section of the trophy cabinet). The admin screen doesn't send a separate notification or bubbles itself; any notice comes from the database. See [Trophies](/help/trophies).

## What does a full glossary write-up include?
Every term in the glossary now has a full write-up, stored in its row in the glossary terms table:

- the **definition** (the short meaning),
- a **summary** paragraph under it,
- **3 to 4 sections** that explain it in more depth,
- **3 common questions** with answers,
- a **search title**, the page title search engines show. Without one the page falls back to "What Is [term]? Meaning for Fish Tanks".

After the bulk update (Claude outputs/step72_glossary_full.sql) there are 228 terms. Adding a suggestion from this screen only saves the term, definition and category, so write the rest of a new term to the same standard in Supabase afterwards.

## Which terms were merged, and do old addresses still work?
Six near-duplicate terms were merged into one page each. Their old addresses now redirect to the page that covers the topic:

- quarantine-tank goes to quarantine
- acclimate goes to acclimation
- cycling-a-tank goes to cycling
- hardscape-scape goes to hardscape
- nitrifying-bacteria goes to beneficial-bacteria
- partial-water-change goes to water-change

Common other names redirect too, for example white-spot to ich, tail-rot to fin-rot and brown-algae to diatoms. The redirects live in the site's code (src/lib/glossary/aliases.ts), not in the database, so adding a new one needs a code change.

## Where do glossary words link automatically?
- On glossary pages, up to 12 other glossary words are linked to their own entries.
- On species pages, up to 8 glossary words are linked.
- Only the first mention of each word is linked. Very everyday words (algae, heater, substrate and similar) are never linked.
- Water Check results link to their glossary entry.

The main Glossary page also carries structured data listing every term, so search engines can read the whole set.

## Can I edit or delete a term that's already in the glossary?
Not from the admin area. The screen only handles waiting suggestions. To fix or remove a live term, edit or delete its row in the glossary terms table in Supabase. The full write-up (summary, sections, common questions and search title) is stored there too. If you delete a term that is a redirect target, its old addresses stop working too.

## Common problems
**An error appears under the card after pressing a button.** The database message is shown as is. The most common cause is a term that already exists; dismiss the duplicate. A permission error means your admin flag isn't set.

**I added a term but it isn't on the Glossary.** Wait up to an hour for the page to rebuild.

**A strange new topic appeared in the Glossary filters.** A term was added with a mistyped category. Fix that term's category in the glossary terms table in Supabase.
