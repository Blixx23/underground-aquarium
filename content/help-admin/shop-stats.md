---
title: Shop stats
category: Stats & members
summary: What every tile, list and link on the Shop stats screen means, how the 7, 30 and 90 day periods compare, and how to use warm leads for shop outreach.
order: 20
keywords: store analytics, shop views, directions, calls, website taps, warm leads, unclaimed shops, top shops, risers, cities, directory health, claim rate
pages: /admin/shop-stats
---

Shop stats at /admin/shop-stats rolls up how the whole fish store directory is doing: page views, people heading to shops, reviews, follows, how many shops are claimed, and ranked lists of top shops, warm leads, risers and cities. Every number is for the period you pick, compared with the same length of time just before it.

## Where is Shop stats?
Pick **Shop stats** in the Admin side menu (subtitle "Top shops, leads, totals") or the **Shop stats** card on the [Dashboard](/admin/help/admin-hub) ("How every shop is doing: top performers, warm leads, cities"). The heading is **Shop stats**, with "Every shop in the directory, compared with the N days before."

There is no waiting count on this card.

## How do I change the period?
Use the three buttons at the top right: **7 days** (the default), **30 days** and **90 days**. The chosen one is highlighted and the address changes to /admin/shop-stats?days=30 and so on, so you can bookmark a period. Any other value falls back to 7 days.

Every tile, arrow and list on the page uses that period, and each "trend" compares it with the period of the same length right before it.

## What do the four tiles at the top show?
| Tile | Number | Underneath |
|---|---|---|
| **Page views** | Views of shop pages in the period | Trend arrow, then "N shops viewed" (how many different shops got at least one view) |
| **Heading to shops** | Directions, calls and website taps added together | Trend arrow, then "N directions · N calls · N web" |
| **New reviews** | Store reviews written in the period | Trend arrow |
| **New follows** | Times members followed a shop in the period | "N shop updates posted" (updates shop owners posted in the period) |

## How do I read the trend arrows?
Next to a number:

- **Green up arrow and N%**: up by that much on the previous period.
- **Red down arrow and N%**: down by that much.
- **Same** (dash icon): exactly level.
- **New** (green up arrow): the previous period was zero and this one isn't.
- **No change**: zero in both periods.

## What is the row of directory chips?
Under the tiles:

- **N shops listed**: shops currently in the directory.
- **N claimed (X%)**: how many listed shops have an owner, and what share that is. Press it to open **All shops** filtered to claimed shops (/admin/shops?view=claimed), where you can see who claimed each one.
- **N claims waiting**: press to open [Store claims](/admin/help/store-claims). Amber when anything is waiting.
- **N open fix reports**: press to open [Shop fixes](/admin/help/shop-fixes). Coral when any are open.

## What is the Day by day chart?
**Day by day, all shops** is a bar chart with one bar per day across the whole directory. Switch between **Page views** and **Heading to shops** with the two buttons on its right. Hover or tap a bar to read that day, for example "12 page views on Mon, Sep 15". When nothing happened in the period, it says "No page views in this period yet." or "No directions, calls and website taps in this period yet."

## What are Most viewed shops and Sending the most customers?
Two ranked lists, side by side on a computer:

- **Most viewed shops**: ranked by page views. Each row shows the shop's rank, name (linking to its public page), city and state, its views, and a trend arrow against the previous period. Empty: "No shop views in this period yet."
- **Sending the most customers**: "Directions, calls and website taps: people acting on a listing." Ranked by those actions, with the breakdown "N dir · N calls · N web" under the total. Empty: "No directions, calls or website taps yet."

A green **Claimed** pill next to a shop's name means it has an owner. Press the pill to open that shop's dashboard at /my/shops/<slug> (admins can open any shop's dashboard). The note under the first heading says "Tap Claimed to open that shop's dashboard."

## What are Warm leads?
**Warm leads: busiest unclaimed shops** lists shops without an owner that people have been looking at in the period, with their view counts and trend. The note reads: "People are already looking these shops up. The best pitch for your sign-up campaign is their own numbers."

Each lead has a pill:

- **Email on file** (blue): the shop has an email address, so it can be reached by email outreach.
- **No email yet** (gray): no address on record. Add one before it can be emailed.

Empty: "No unclaimed shops were viewed in this period." To act on leads, see [Shop outreach](/admin/help/shop-outreach) and [Campaigns](/admin/help/campaigns).

## What are Biggest risers and Top cities?
- **Biggest risers**: shops whose views grew the most on the previous period, showing "+N" and "previous → current views". The empty message, "No shop gained 3 or more views on the period before.", tells you a shop needs a gain of at least 3 views to appear.
- **Top cities**: cities ranked by shop page views. Each row shows "City, State", "N shops viewed · N heading over", and the views total on the right. Empty: "No city has views in this period yet."

## Where do these numbers come from?
The footnote says: "Counts come from shop pages on Underground Aquarium. Shop owners' own visits aren't counted (from step 52 on)." Views and taps are recorded on the public shop pages at /stores/<slug>, so traffic to a shop's own website or map apps isn't included. Visits a shop owner makes to their own page aren't counted.

The whole report is built by one database function, admin_shop_report. Shop owners see numbers for their own shop on their dashboard's insights page, explained for members in [Shop insights](/help/shop-insights).

## Common problems
**"The report couldn't load. If this is the first time, run step 53's SQL in Supabase."** The database function behind this page is missing or failed. Run that SQL step in the Supabase SQL editor, then reload. See [Admin troubleshooting](/admin/help/admin-troubleshooting).

**Numbers look lower than I expected.** Owners' own visits aren't counted, and only visits to the shop pages on this site are. Also check the period buttons; the page opens on 7 days.

**The claimed count doesn't match All shops.** The two screens count separately (Shop stats through its database function, All shops straight from the shops table), and All shops can include hidden shops. Use All shops with the **Claimed** filter as the list of record.

**A warm lead shows No email yet.** Add the shop's email before trying to reach it by email outreach. See [Managing shops](/admin/help/managing-shops).
