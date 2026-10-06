---
title: Stocking level, heater and filter sizing
category: Tools & learning
summary: How the Tank Builder works out how full your tank is, which fish count as messy, and how it sizes your heater, filter, heater setting and tankmate ideas.
order: 120
keywords: stocking level, how many fish, inch per gallon rule, bioload, overstocked, stocking percentage, heater wattage, watts per gallon, filter gph, gallons per hour, turnover, flow rate, messy fish, waste, heater temperature, tankmates, suggestions, coldwater, try gallons, bigger tank, temperature window
pages: /tank-builder, /tank-builder/[size]
---

This guide explains the numbers in the [Tank Builder](/tank-builder)'s **How full is it?** and **Gear for [size] gallons** boxes, and how **Tankmates that fit** chooses its ideas. All of them need a tank size entered and at least one fish added.

## How does the Tank Builder work out how full my tank is?
**How full is it?** shows a stocking percentage. In plain words:

1. For each species, the builder takes its **adult size in inches**.
2. It multiplies that by a **waste factor** (messy fish count more, shrimp and snails count less; see the next section).
3. It multiplies by **how many** you have.
4. It adds up every species to get your tank's total "load."
5. It compares that load with a cautious limit of **1.5 waste-adjusted inches of adult fish per gallon**. So a 20 gallon tank's limit is 30, and a 29 gallon's is 43.5.
6. Load divided by limit, times 100, rounded to a whole number, is your percentage.

Example: ten fish that grow to 1.5 inches, with a normal waste factor, add up to 15. In a 29 gallon tank that's 15 ÷ 43.5 = 34%.

If a species has no adult size in our data, it's counted as 1 inch.

Under the bar you'll read: "Worked out from the adult size and waste output of your fish against a deliberately cautious limit. Treat it as a guide: strong filtration and regular water changes give you more headroom."

## Which fish count as messy (the waste factor)?
Each fish's adult size is multiplied by a waste factor before it counts toward stocking:

- **1.6 (messy)**: fish in these groups: Goldfish & Coldwater, New World cichlids, African Rift Lake cichlids, Plecos (L-number catfish), Other Catfish, and Oddballs & Specialty.
- **0.3 (light)**: shrimp, snails, crabs, crayfish and other invertebrates.
- **1.0 (normal)**: everything else, such as tetras, rasboras, livebearers, gouramis, barbs and danios.

So a 6 inch pleco counts as 9.6 "inches," while ten 1 inch shrimp count as just 3. The group a fish belongs to is shown in the search results and on its [species page](/help/reading-a-species-page).

Having any messy fish in the build also raises the top of the recommended filter range (see the filter section).

## What do the stocking labels and colors mean?
Next to the percentage you'll see one of four labels:

- **Lightly stocked**: under 35%
- **Comfortably stocked**: 35% up to 89%
- **Near capacity**: 90% to 130%
- **Overstocked**: over 130%

The bar is green up to 89%, amber from 90% to 130%, and red above 130%. A thin line on the bar marks 90%. The bar stops at full width at 100%, but the percentage keeps counting up past it.

The same percentage shows on the tank picture (for example "42% stocked"), colored the same way. Past 90% the water in the picture gets a faint green-brown tint, stronger past 130%.

Near capacity also adds a **Check** ("Heavily stocked") and Overstocked adds a **Conflict** ("Overstocked") to your compatibility results, and a very overstocked tank caps your score. See [Tank Builder compatibility warnings explained](/help/tank-builder-compatibility-warnings).

Both of those warnings have a **Try [size] gallons** button. It picks the smallest common US size bigger than your tank (5, 10, 20, 29, 40, 55, 75, 90, 125, 150, 180, 220 or 300 gallons) where the same fish would come out at about 85% or less, so you land comfortably below the 90% line. Tapping it sets that size in gallons. For example, a 20 gallon tank at 110% gets **Try 29 gallons**, because 29 gallons brings it down to about 76%.

## Why is the stocking limit so cautious?
The limit is set low on purpose so beginners have a safety margin. A tank at 100% isn't doomed: the builder's own wording says 90 to 130% "can work with strong filtration and regular water changes." Experienced keepers with heavy filtration, lots of plants and frequent water changes often run tanks above the line. Treat the percentage as a guide to how much room you have, not a hard rule.

## Does stocking consider swimming space or territory?
Not directly. Stocking is based only on adult size, waste factor and count. Swimming room is handled separately by each fish's **recommended minimum tank size** (the "tight in this tank" and "needs a much bigger tank" warnings), and territory by the temperament check. The tank picture helps too: it shows where each fish swims, so you can spot a crowded middle or empty bottom.

## How is heater size worked out?
The **Heater** box shows a wattage range of **3 to 5 watts per gallon**, each end rounded to the nearest 5 watts (never below 5). For example:

- 10 gallons: 30-50 W
- 20 gallons: 60-100 W
- 29 gallons: 85-145 W
- 55 gallons: 165-275 W

The builder's advice (in its FAQ) is to use the higher end if your room gets cold or the tank sits near a window or outside wall.

**Tanks of 75 gallons and up** get this note: "For a tank this size, two smaller heaters (one at each end) heat more evenly, and if one sticks on or dies the other covers for it."

## When does it say I don't need a heater?
The **Heater** box shows **Not needed** when every fish in your build is happy at room temperature. Specifically, all of these must be true:

- Every fish has a temperature range in our data.
- They share a temperature range.
- The low end of that shared range is 66°F or lower, and the high end is 76°F or lower.

This typically happens with goldfish and other coldwater fish. You'll see: "Everything here is happy at room temperature, so you likely don't need a heater. Keep the tank away from windows and heat vents to hold the temperature steady."

If even one fish is missing temperature data, the builder won't say a heater isn't needed.

## What temperature should I set my heater to?
The **Set to** box shows the middle of the temperature range all your fish share, rounded to a whole degree Fahrenheit. For example, if your fish share 74 to 80°F, it says 77°F.

It shows "--" when there's no shared range (the fish don't overlap, which also triggers a "Temperature mismatch" Conflict) or when none of your fish have temperature data. Open **Water each fish likes** to see each fish's range and the shared band.

## How is filter size worked out?
The **Filter** box shows a flow range in **GPH** (gallons per hour):

- **Low end**: 4 times your tank volume per hour.
- **High end**: 6 times your tank volume, **or 8 times** if your build includes any messy fish (see the waste factor list) or is 90% stocked or more.

Examples for a 29 gallon tank: 116-174 GPH normally, 116-232 GPH with messy fish or heavy stocking.

The [tank size guides](/help/tank-size-guides) use the normal 4 to 6 times range, and mention "up to" the 8 times figure for messy fish or a busy tank.

## Why do the heater and filter numbers use gallons even though I entered litres?
The builder works in US gallons internally and shows gear in watts and gallons per hour, which is how heaters and filters are usually labeled. The heading reads "Gear for [size] gallons" with your litres converted. To convert GPH to litres per hour, multiply by about 3.8.

## How does the Tank Builder pick tankmate suggestions?
**Tankmates that fit** appears once you've entered a size and added at least one fish. The builder tries every species in the library at its minimum group size (or 1) and keeps only ones that pass all of these:

- Not already in your build.
- Its recommended minimum tank isn't bigger than your tank.
- It needs the same water type (freshwater, brackish or saltwater) as your current fish.
- It has at least a temperature range and an adult size in our data.
- It isn't marked as "not recommended" or "expert" level.
- Adding it creates **no new Conflicts or Checks** (Tips are allowed).
- Adding it keeps your stocking **under 90%**.
- With it added, your whole group still shares a temperature window at least **4°F** wide. This keeps the list from suggesting, say, tropical fish that only just touch the top of a goldfish's range.

The keepers are then ranked. A fish gets a big boost if it would live in a part of the tank you haven't filled yet (top, middle or bottom), a smaller boost if it's a beginner or easy fish, a boost for being a popular, familiar species, and a small boost for being peaceful. It loses ground for each new Tip it would add.

Finally the list shows **one species per group** (so you don't get six kinds of tetra) and at most 6 suggestions.

## What do the suggestion reasons mean?
Each suggestion has a short reason under its name:

- **Fills the top / middle / bottom of the tank**: nothing in your build lives in that layer yet.
- **Easy keeper, no conflicts**: listed as beginner-friendly or easy.
- **No conflicts with your fish**: it passes every check but isn't filling a gap or marked easy.

The number before the name (for example "6 ×") is the quantity it would be added at, which is its minimum group size. Tap to add it.

## Why aren't there any tankmate suggestions?
The **Tankmates that fit** section is hidden when:

- You haven't entered a tank size, or haven't added any fish yet.
- Your tank is already near capacity, so anything more would push it to 90% or beyond.
- Every candidate would add a Conflict or Check (common in small tanks or with aggressive fish), or would squeeze the shared temperature window under 4°F.

Try a bigger tank size, fewer fish, or removing the fish causing warnings to see more ideas.

## Common problems
**My stocking is over 100% but the builder says it's only "Near capacity."**
Near capacity runs from 90% all the way to 130%. It becomes "Overstocked" only above 130%.

**The heater box says "Not needed" but I keep tropical fish.**
Check your fish list. The builder says this only when every fish's shared range tops out at 76°F or lower and bottoms out at 66°F or lower. If a tropical fish is in the build, its range should prevent this; if it doesn't, its data may be wrong. Email support@undergroundaquarium.com with the species name.

**Set to shows "--".**
Your fish don't share a temperature range, or none have temperature data. Fix any "Temperature mismatch" Conflict first.

**The filter range jumped up when I added one fish.**
That fish is in a messy group, or it pushed you to 90% stocked or more. Either raises the top of the range from 6 to 8 times your tank volume.

**A shrimp colony shows almost no stocking.**
That's expected. Shrimp and snails count at less than a third of their size because they make very little waste.

**A suggestion I added now shows a warning.**
Suggestions are chosen so they add no new Conflicts or Checks at the moment they're shown, but they can add a Tip. If you later change quantities or add more fish, new warnings can appear.
