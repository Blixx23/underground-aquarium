---
title: Using Water Check
category: Tools & learning
summary: How to use Water Check: entering test kit numbers, reading the banner, colors and fix-it cards, checking against one of your tanks, logging a reading, and the water testing FAQ.
order: 150
keywords: water test, test kit, water parameters, api master test kit, test strips, water quality, is my water ok, water tester, aquarium water check, ammonia, nitrite, nitrate, ph, kh, gh, hardness, cloudy water, fish dying, check against my tank, log reading, save water test, glossary, water testing faq
pages: /water-check, /tank-builder
---

[Water Check](/water-check) reads your aquarium test kit numbers and tells you, in plain English, what's healthy, what isn't, and how to fix it. It's free and needs no account. If you're signed in and have a saved tank, you can also check your numbers against the fish in that tank and log the reading to its history.

## How do I check my water?
1. Open [Water Check](/water-check) (it's also in the **Tools** menu as "Water Check: Read your test results").
2. Test your water with your kit or strips.
3. Type each result into its box under **Your reading**. Fill in only what you have; you don't need every box.
4. Results appear instantly beside the form on wide screens, or below it on phones. There's no submit button.

To start over, tap **Clear** at the top right of **Your reading**. It empties every box.

## What boxes are on the Water Check form?
The form is split into three groups. Each box shows a sample value as a placeholder and a quick guide underneath.

**Temperature & pH** ("The basics: comfort and acidity.")
- **Temperature** in °F. Guide: "Safe 66-86°F · most like 74-80"
- **pH** (no unit). Guide: "Safe 6.0-8.4 · ideal varies by fish"

**The nitrogen cycle** ("Fish waste turns to ammonia, then nitrite, then nitrate. This is where most trouble shows up.")
- **Ammonia** in ppm. Guide: "Should be 0"
- **Nitrite** in ppm. Guide: "Should be 0"
- **Nitrate** in ppm. Guide: "Keep under 20"

**Hardness** ("How mineral-rich your water is, and how stable your pH stays.")
- **GH** in dGH. Guide: "Soft 4-8, hard 8-12"
- **KH** in dKH. Guide: "3+ keeps pH steady"

You can type decimals in any box (for example 0.5 for ammonia or 7.4 for pH). The arrow buttons on each box step by 1 for temperature, GH and KH, 0.1 for pH, 0.25 for ammonia and nitrite, and 5 for nitrate.

## What units does Water Check use?
- **Temperature**: degrees Fahrenheit only. If your thermometer reads Celsius, multiply by 9, divide by 5 and add 32 (25°C is 77°F).
- **Ammonia, nitrite, nitrate**: ppm (parts per million). Kits that read in mg/L give the same number.
- **GH**: dGH (degrees of general hardness). **KH**: dKH (degrees of carbonate hardness). If your kit reports hardness in ppm, divide by about 17.9 to get degrees.
- **pH**: no unit.

There's no switch for Celsius or other units, so convert before typing.

## What does the summary banner mean?
Once you fill in at least one box, a banner at the top of the results sums up your water:

- **Needs attention now** (red): "Something in your water is stressing your fish. See the steps below." At least one value is in the danger zone.
- **A few things to watch** (amber): "Not an emergency, but worth acting on soon." At least one value needs attention, but nothing is dangerous.
- **Looking good, with a couple of notes** (green): "Nothing's wrong. A few values sit at the edge of the ideal range. Details below." Nothing is wrong, but something sits at the edge of normal.
- **Your water looks healthy** (green): "Everything you entered is in a good range. Keep it up."

Under the banner, small counters show how many results are in each level, for example "1 needs action," "2 to watch," "1 heads-up," "3 healthy."

## What do the colors mean?
Water Check uses four levels, and the same colors appear on the result cards, the counters, and the input boxes:

- **Red (needs action)**: a danger reading, like ammonia or nitrite at 0.5 ppm or more, or nitrate over 80 ppm.
- **Amber (to watch)**: a warning, like traces of ammonia or nitrite (above 0 and under 0.5 ppm, so a 0.25 reading), nitrate over 40 ppm, pH outside 6.0 to 8.4, or temperature outside 66 to 86°F. When you check against one of your tanks, pH or temperature outside what your fish share is amber too.
- **Blue (heads-up)**: an edge-of-normal note, like nitrate between 21 and 40 ppm, pH at the soft or hard end of normal, a slightly cool or warm tank, very soft or very hard water (GH under 3 or over 18 dGH), low KH, or GH outside what your tank's fish like.
- **Green (healthy)**: a good reading.

Every threshold is listed in [Water test results explained](/help/water-check-readings-explained).

## How do I read the result cards?
Anything that isn't healthy gets its own card, sorted most urgent first (red, then amber, then blue). Each card shows:

- A **title**, for example "Traces of ammonia" or "Nitrate is creeping up"
- The **value** you entered, on the right, for example "0.1 ppm"
- **What's happening**: a plain-English explanation of what the reading means and the usual causes
- **How to fix**: what to do about it

Cards for ammonia, nitrite, nitrate, pH, GH and KH also end with a link to that word's [Glossary](/glossary) entry, for example "More about ammonia in the glossary," if you want the full story.

Healthy results are listed more briefly under **Looking good**, each with a green check, its title (like "Ammonia is at zero") and your value.

## Why did my input box change color?
After you type a value, the box's border and a small dot next to its label change color to match that result: red, amber, blue or green. This lets you see at a glance which number is the problem.

Every box works this way, including GH and KH. The box shows the general result for that value. The extra checks against your tank's fish (see below) appear as cards but don't change a box's color.

## Which readings does Water Check give results for?
Every one you enter: **ammonia, nitrite, nitrate, pH, temperature, GH and KH**.

- **GH** gives "Very soft water" (heads-up) under 3 dGH, "Very hard water" (heads-up) over 18 dGH, and "Hardness is in a common range" (healthy) in between.
- **KH** gives "KH is holding your pH steady" (healthy) at 3 dKH or more, and a heads-up that your pH can swing below 3.

The exact cutoffs for every value are in [Water test results explained](/help/water-check-readings-explained).

## How do I check my water against one of my tanks?
If you're signed in and have at least one saved tank, a box called **Check against one of your tanks** appears with the results ("Pick a tank to compare these numbers with the fish in it, and save the reading to its history.").

1. Pick a tank from the list. It starts on **No tank, just check the water**.
2. Water Check loads the fish in that tank and says, for example, "Checking against the 3 kinds of fish in this tank." If the tank has no fish yet, it says only the general checks apply.
3. Your results now include up to three extra checks, based on the range all the fish in that tank share:
   - **"pH doesn't match your stocked fish"** (amber)
   - **"Temperature doesn't match your stocked fish"** (amber)
   - **"Water is softer than your fish like"** or **"Water is harder than your fish like"** (blue heads-up), for GH

These only appear when your number is outside the shared range. If the fish don't share a range at all, there's no fish check for that value; the [Tank Builder](/tank-builder)'s **Compatibility** tab flags that instead.

If you're signed in but haven't saved a tank, you'll see a link instead: "Save a tank in the Tank Builder to check readings against your fish and keep a history." Signed out, the link reads "Keeping fish? Use the Tank Builder for checks tailored to your stock."

## Can I save a reading from Water Check?
Yes, once you've picked one of your tanks:

1. Add an optional note (up to 200 characters, for example "after a 30% water change").
2. Tap **Log reading to this tank**.

You'll see **Logged. See the history in the Tank Builder.** Tap it to open that tank in the [Tank Builder](/tank-builder), where the reading shows in **Recent readings** and in the **Trends** lines. Logging here earns the same bubbles as logging in the Tank Builder (your first water test, and one reading a week). If it fails you'll see "Couldn't log the reading. Please try again."

If you don't log it, nothing you type is stored. Refreshing or leaving the page clears the form. More in [Logging water tests](/help/logging-water-tests).

## Do I need an account to use Water Check?
No. Reading your results works the same for everyone, signed in or not. You only need an account, and a saved tank, to check against your fish and to log readings.

## What's in the Water testing FAQ?
Below the tool, the **Water testing FAQ** answers the questions people most often ask after testing:

- What should ammonia be in a fish tank?
- What does nitrite in my aquarium mean?
- How high is too high for nitrate?
- What pH should my aquarium be?
- What is the difference between GH and KH?
- How do I know when my tank is cycled?
- Can I save my water tests?

Tap a question to open its answer. Under the FAQ, **Keep going** links to **Plan your tank**, **Browse fish species** and the **Aquarium glossary**.

## How often should I test my water?
Water Check doesn't set a schedule or send reminders. Its advice mentions testing again after a fix (for example, doing another water change "tomorrow if it's still high," or re-testing after raising KH). If you log readings to a saved tank, logging at least once each week earns you bubbles. See [Logging water tests](/help/logging-water-tests).

## What's the difference between Water Check and the Tank Builder's Water test tab?
Both use the same thresholds and the same result text, and both can check against your fish and log to a saved tank. The differences:

- **Water Check** ([/water-check](/water-check)): per-box hints, colored input boxes, results sorted by urgency with healthy ones grouped under **Looking good**, glossary links on the result cards, a **Clear** button and the Water testing FAQ. To check against fish, you pick one of your saved tanks.
- **Tank Builder Water test tab**: uses whatever fish are in the builder right now, saved or not. It's where you see a tank's **Recent readings** and **Trends**, and it can save a new tank and log in one step. Its banner wording is a little different ("Something needs attention now," "A few things to keep an eye on," "Your water looks healthy"), it lists every result as a card in a fixed order, and heads-up notes show in gray.

## Common problems
**Nothing shows in the results.**
Fill in at least one box. Until then you'll see "Enter a reading to begin. Fill in at least one value and your results appear here." If you typed something that isn't a number, it's ignored.

**My kit reads 0.25 ppm ammonia and Water Check says "A few things to watch."**
That's correct. Anything above 0 and under 0.5 ppm counts as "Traces of ammonia" (or nitrite): do a 25 to 50 percent water change and ease off feeding. At 0.5 ppm or more it becomes red, **Needs attention now**. Follow the **How to fix** steps either way.

**My thermometer reads Celsius.**
Water Check only takes °F. Multiply by 9, divide by 5 and add 32 before typing.

**My GH box is blue.**
Your GH is under 3 dGH (very soft) or over 18 dGH (very hard). That's a heads-up, not a problem: it suits some fish and not others. Read the card for which.

**I picked a tank but don't see any fish checks.**
Fish checks only appear when a number is outside the range your fish share, so no card means your water suits them. If the tank has no fish, or its fish have no data for that value, there's nothing to compare.

**I don't see "Check against one of your tanks."**
Sign in, and make sure you've saved at least one tank in the [Tank Builder](/tank-builder).

**My numbers disappeared.**
Water Check only keeps a reading if you log it to one of your tanks. Pick a tank and tap **Log reading to this tank** before you leave the page.
