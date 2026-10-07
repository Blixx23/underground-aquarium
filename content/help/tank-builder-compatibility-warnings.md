---
title: Tank Builder compatibility warnings explained
category: Tools & learning
summary: Every check the Tank Builder runs, what triggers each Conflict, Check and Tip, the exact thresholds, the one-tap fix buttons, and how the score and labels are worked out.
order: 110
keywords: conflict, caution, check, tip, warning, compatibility score, great match, needs changes, don't do this, fin nipper, temperature mismatch, mixed water types, tight in this tank, needs a group, bully, aggressive, eat tankmates, betta, overstocked, score out of 100, water hardness, gh, dgh, soft water, hard water, eats plants, plant eater, uproots plants, snail eater, one-tap fix, fix button, make it, remove fish, try gallons, keep just one
pages: /tank-builder, /tank-builder/[size]
---

The [Tank Builder](/tank-builder) runs a set of checks on every build and lists what it finds in the **Compatibility** tab. This guide lists every check, what triggers it, how serious it is, and how the score and label are worked out. For the stocking math and gear formulas, see [Stocking level, heater and filter sizing](/help/tank-builder-stocking-and-equipment).

## What do Conflict, Check and Tip mean?
Every problem is tagged with one of three levels, and the list is always sorted **Conflicts** first, then **Checks**, then **Tips**.

- **Conflict** (red warning icon): a real dealbreaker. The builder thinks this combination shouldn't happen as planned.
- **Check** (amber warning icon): workable but risky. Worth fixing, or at least watching closely.
- **Tip** (blue info icon): good to know. Tips barely affect the score and aren't counted in the "to check" number.

Species involved in a **Conflict** or **Check** are highlighted amber in your fish list and glow in the tank picture. Tips don't highlight anything. The two counters next to the score show how many **conflicts** and how many items **to check** you have.

Many problems also have one or two green **fix buttons** under the message, like **Make it 6**, **Remove Oscar** or **Try 55 gallons**. Every fix button is listed in "What are the one-tap fix buttons?" further down this page.

## Which checks can produce a Conflict?
These are the only situations that create a red **Conflict**:

- A fish's tank is under 60% of its recommended minimum ("needs a much bigger tank")
- Fish that need different water types ("Mixed water types")
- No temperature all the fish share ("Temperature mismatch")
- A fin nipper with a betta ("Fin nippers with long fins")
- More than one male betta
- The tank is over 130% stocked ("Overstocked")

Everything else is a **Check** or a **Tip**. Each is explained in its own section below.

## Is my tank big enough? (tank size vs. minimum)
This check runs for every species that has a recommended minimum tank size, but only once you've entered your tank size. The builder divides your tank size by the fish's minimum:

- **Your tank is at or above the minimum**: no message.
- **80% up to 100% of the minimum**: **Tip**, titled "[Fish] would like more room." It says the usual recommendation, that your size "can work, especially with strong filtration and regular maintenance, but plan to upgrade as they grow."
- **60% up to 80%**: **Check**, titled "[Fish] is tight in this tank." It says the tank is "on the small side. Fine short term or for a single fish, but a bigger tank should be the plan."
- **Under 60%**: **Conflict**, titled "[Fish] needs a much bigger tank." It says "At [size] it would be stunted or constantly stressed. Hold off until you can size up."

Example: a fish with a 30 gallon minimum gets a Tip in a 24 to 29 gallon tank, a Check in an 18 to 23 gallon tank, and a Conflict below 18 gallons.

The Check and the Conflict both come with two fix buttons: **Try [minimum] gallons** (for example **Try 30 gallons**), which sets your tank to that fish's recommended minimum, and **Remove [Fish]**. The Tip has no buttons.

## Why does it say "Mixed water types"?
If your fish don't all need the same kind of water (freshwater, brackish or saltwater), you get a **Conflict** titled "Mixed water types." The message lists each water type with its fish and ends "They can't share a tank."

Capitalization doesn't matter ("Freshwater" and "freshwater" are the same). Fish with no water type in our data are left out of this check. To fix it, pick fish that all share one water type.

## Why does it say "Temperature mismatch"?
The builder takes each fish's comfortable temperature range and looks for a range they all share. If there isn't one (and at least two fish have temperature data), you get a **Conflict** titled "Temperature mismatch."

- If you have 3 or more fish with temperature data and removing one would fix it, the message names that fish: "[Fish] ([low]-[high]°F) doesn't share a safe temperature with the rest. Everything else can live together." A **Remove [Fish]** button takes that fish out.
- Otherwise it lists every fish with its range: "There's no temperature that suits all of them: ..."

The **Water each fish likes** chart shows the same thing visually: the Temperature chart reads **No overlap** in red. The heater **Set to** value shows "--" because there's no shared range to aim for.

## What does "Very narrow temperature window" mean?
If your fish do share a temperature range but it's less than 3°F wide, you get a **Check** titled "Very narrow temperature window." The message says, for example, "They only share 76-78°F. That's hard to hold steady, and it keeps some of them at the edge of what they like." If they share just a single degree, it names that one temperature.

## What does "pH preferences differ" mean?
If at least two fish have pH data and their ranges don't overlap at all, you get a **Check** (not a Conflict) titled "pH preferences differ." The builder treats pH more gently than temperature because many captive-bred fish settle into stable water.

- With 3 or more fish, if one fish is the odd one out, it's named: "[Fish] likes pH [low]-[high], which doesn't overlap with the others. Many fish settle into stable water fine, but it's worth knowing before you mix them." A **Remove [Fish]** button takes that fish out.
- Otherwise: "Their ideal pH ranges don't overlap. Many fish settle into stable water fine, but it's worth knowing before you mix them."

The pH chart in **Water each fish likes** will show **No overlap**.

## What does "Water hardness preferences differ" mean?
The builder also compares each fish's preferred hardness (GH, in dGH). Soft-water and hard-water fish, like tetras and African cichlids, can sometimes pass the pH check and still want very different water. If at least two fish have hardness data and their GH ranges don't overlap at all, you get "Water hardness preferences differ."

- It's a **Check** on its own.
- It drops to a **Tip** if your build already has the "pH preferences differ" Check, so the same problem isn't counted twice.

The message works like the pH one:

- With 3 or more fish, if removing one would fix it, that fish is named: "[Fish] likes [low]-[high] dGH, which doesn't overlap with the others. Soft-water and hard-water fish rarely do their best in the same tank." A **Remove [Fish]** button takes that fish out.
- Otherwise it lists every fish with its range, for example "Their ideal hardness ranges don't overlap ([Fish] 2-10 dGH, [Fish] 10-20 dGH)."

Fish with no hardness data in our library are left out of this check. Hardness isn't drawn on the **Water each fish likes** chart; each fish's range is on its [species page](/help/reading-a-species-page) under **Hardness**.

## What does "[Fish] needs a group" mean?
Schooling and shoaling fish have a minimum group size in our data. If you have fewer than that minimum, you get a **Check** titled "[Fish] needs a group": "Keep at least [number] together. You have [number]. Too few leaves them stressed, hiding, and often nippier."

In your fish list, that row shows "keep [number]+" and the number box gets an amber border. Raise the count to the minimum to clear it, or tap the **Make it [number]** button under the message (for example **Make it 6**). Fish are always added at their minimum group, so this usually appears only after you lower the number.

## How does the fin nipper check work?
Some fish are marked as fin nippers in our data. The builder then looks for long-finned targets, which it spots by name: bettas (including "Siamese fighting"), angelfish, guppies, gouramis, fancy goldfish, orandas, ryukins, lionheads, telescopes, fantails, and anything with "veil" or "long fin" in its name. Other fin nippers don't count as targets.

- **Nipper plus a betta**: **Conflict**, "Fin nippers with long fins." This is the classic mistake.
- **Nipper plus any other long-finned fish**: **Check**, same title. The message names both sides and says "Swap one side, or keep the nippers in a bigger group to spread it out."

Both the Conflict and the Check have a **Remove [nipper]** button for each fin nipper, up to two of them.
- **Nipper with no long-finned fish** (and at least one other species): **Tip**, "Fin nipper in the mix," saying it should be fine but to avoid adding bettas, angelfish or fancy guppies later.

## Will one of my fish eat the others?
The builder compares adult sizes to spot fish big enough to swallow tankmates.

**Who counts as a hunter**: fish whose diet is listed as carnivore, piscivore or predatory, or whose temperament is aggressive, territorial, predatory or semi-aggressive.

- A **hunter** is flagged if it grows to at least twice the length of another fish and is at least 2.5 inches as an adult.
- **Any other fish** (even peaceful ones) is flagged if it grows to at least four times the length of another fish and is at least 4 inches as an adult. For example, a 6 inch peaceful fish is flagged with a 1.5 inch tetra.

Snails are only safe from fish under 8 inches as adults, because small fish can't crack a shell. A fish that grows to **8 inches or more** (big cichlids, puffers and the like) can be flagged as able to eat your snails, using the same size rules above. Shrimp and snails are never counted as eaters, but crayfish and crabs are. Fish with no adult size in our data are skipped.

You get one message per big fish, titled "[Fish] may eat [smaller fish]" or "[Fish] may eat smaller tankmates" when there are several. It gives the big fish's size and lists each smaller fish with its size, adding "Anything that fits in its mouth is at risk, often at night."

**Severity**: it's always a **Check**. The sizes it compares are full-grown sizes, so the smaller fish is at risk even as an adult.

- **Predator, aggressive, or a tankmate a quarter of its size or less:** the fish is a clear mouthful. The Check has a **Remove [big fish]** button.
- **Borderline (about half its size):** the message says the smaller fish sits right at the edge of what the big one can catch, and young ones are well within it. The safe choice is tankmates that stay more than half its size. If you keep them together, add them fully grown, keep the big fish well fed and count them often.

## Why does it warn about my crayfish or crab?
If your build has a crayfish or crab (spotted by group or name) plus any fish, you get a **Check** titled "[Crayfish or crab] can catch fish." It says it "will grab slow or sleeping fish, especially bottom dwellers like..." (naming up to 3 of your fish) and that "Fast, mid-water fish fare best, and lots of cover helps." This applies whatever the sizes, because they grab from the bottom.

## Why does it say "Shrimp babies will get eaten"?
If you have shrimp and at least one fish that grows to 2 inches or more, you get a **Tip**: "Adult [shrimp] can live with [up to 3 fish], but most baby shrimp will be eaten. Thick moss or plants give the colony a chance to grow." If a fish was already flagged as big enough to eat the shrimp outright, you get that warning instead of this Tip.

## Why does it say "[Fish] eats plants"?
Some species are marked in our data as eating or uprooting live plants. If your build has one, you get a **Tip** titled "[Fish] eats plants" (or "Some of these eat plants" when there's more than one). It names the fish and says they tend "to eat or uproot live plants. Go with tough plants like anubias and java fern tied to wood or rock, or plan on an unplanted tank."

It's only a Tip, because plenty of keepers enjoy these fish with tough plants or no live plants at all. It has no fix button.

## Why does it say two fish "can crossbreed" or "will interbreed"?
**"[Fish] and [Fish] can crossbreed"** (Tip) means the two are different species known to produce hybrids, like guppies and Endler's or platies and swordtails. **"[Fish] and [Fish] will interbreed"** (Tip) means they're color forms of the same species, like a red cherry shrimp and a blue dream. Either way they live together fine; it only matters if you want to breed true, so keep just one of them in a breeding tank. The full list is at [Which fish can crossbreed?](/breeding/crossbreeding).

## How does the temperament check work?
The builder sorts fish by temperament from our data: **aggressive** (aggressive, territorial or predatory), **semi-aggressive**, and **peaceful** (peaceful, docile, calm or community). Shrimp and snails aren't counted as peaceful fish here.

- **Aggressive fish plus peaceful fish**: **Check**, "Temperament to watch." It names the aggressive fish and up to 4 peaceful ones, and says "Plenty of plants, hiding spots and broken sightlines help a lot." If one of the aggressive fish is a betta it adds that bettas vary by individual and to have a backup plan. If your tank is under 20 gallons it adds "In a tank this small there's little room to escape, so watch them closely early on."
- **Semi-aggressive fish plus peaceful fish**: a **Tip**, "Some attitude in the mix," but only when the tank is under 20 gallons or you have two or more semi-aggressive species. It says they "can be pushy at feeding time or when claiming a spot. Usually fine with enough room and cover."

Temperament is never a Conflict, because aggression depends so much on the individual fish and the setup.

## Why can't I keep more than one betta?
If the total count of bettas in your build is more than 1, you get a **Conflict**: "More than one [betta name]" (or "More than one betta" if you've added different betta varieties). The message: "Male bettas fight, often to the death. Keep one per tank unless they're fully divided."

The builder counts every species with "betta" in its name together, except names containing "female" or "sorority." So a female betta or sorority entry doesn't trigger this rule. There's no way to tell the builder your tank is divided, so a divided setup will still show this Conflict.

The fix button depends on what you added:

- **One betta entry with a count above 1**: **Keep just one** sets its count to 1.
- **Two or more betta varieties**: a **Remove [betta]** button for each variety except the first one in your list.

## What do "Overstocked" and "Heavily stocked" mean?
Once you've entered a size, the builder compares your stocking percentage with its cautious limit:

- **Over 130%**: **Conflict**, "Overstocked": "You're well past a cautious stocking limit (about [x]%). Size up the tank or trim the list."
- **90% to 130%**: **Check**, "Heavily stocked": "About [x]% of a cautious limit. Workable with strong filtration and steady water changes, but there's little room to add more."
- **Under 90%**: no message.

Both messages come with a **Try [size] gallons** button. It picks the next common US tank size bigger than yours (from 5, 10, 20, 29, 40, 55, 75, 90, 125, 150, 180, 220 and 300 gallons) that's big enough to bring your stocking to about 85% or less, comfortably under the 90% near-capacity line. If even 300 gallons wouldn't do it, there's no button; trim the list instead.

How the percentage is worked out is in [Stocking level, heater and filter sizing](/help/tank-builder-stocking-and-equipment).

## How is the compatibility score worked out?
Your score starts at 100 and loses points for each problem:

- Each **Conflict**: minus 30
- Each **Check**: minus 10
- Each **Tip**: minus 2

Then some caps apply:

- Any Conflict at all: the score can't go above 49.
- Two or more Conflicts: it can't go above 25.
- Stocking over 150%: it can't go above 25.
- Stocking over 130% (up to 150%): it can't go above 40.

The score never goes below 5 or above 100 once you've added a fish. With no fish there's no score.

## What do the score labels mean?
The label under the score comes from the score and whether you have any Conflicts:

- **Don't do this**: at least one Conflict and a score of 25 or less
- **Needs changes**: at least one Conflict (score 26 to 49)
- **Great match**: no Conflicts and 90 or more
- **Good match**: no Conflicts, 75 to 89
- **Workable**: no Conflicts, 55 to 74
- **Risky**: no Conflicts, under 55

The color of the score is separate from the label: **red** if there's any Conflict, **amber** if there's any Check or the score is under 75, and **green** otherwise. That's why a build with a single Check can read **Great match** (100 minus 10 is 90) but show in amber: it's a great fit with one thing to keep an eye on.

## What are the one-tap fix buttons?
Many problems show one or two green buttons under the message. Tap one and the builder makes that change for you, then a short message confirms it, for example "Done: Make it 6." The score and the list update straight away.

| Button | Where you'll see it | What it does |
|---|---|---|
| **Make it [number]** | "[Fish] needs a group" | Raises that fish to its minimum group size |
| **Remove [Fish]** | "Tight in this tank" and "needs a much bigger tank"; the named odd one out on temperature, pH or hardness; fin nippers (up to two) when long-finned fish are present; a big fish in a "may eat" Check | Takes that species out of your build |
| **Try [size] gallons** | "Tight in this tank" and "needs a much bigger tank" (that fish's recommended minimum); "Overstocked" and "Heavily stocked" (the next common size that fits) | Changes your tank size |
| **Keep just one** | "More than one [betta]" with a single betta entry | Sets that betta's count to 1 |
| **Remove [betta]** | "More than one betta" with several betta varieties | Takes out the extra varieties |

Pressing a **Try [size] gallons** button always switches the size box to **Gallons**, even if you were working in litres.

Tips never have fix buttons, and some Checks don't either (for example "Temperament to watch," "Very narrow temperature window" and the crayfish or crab warning), because there's no single change that's clearly right.

## How do I get rid of a warning?
Each warning names the fish causing it, so:

1. Read the title and message to see which fish and why.
2. If there's a fix button, tap it. Otherwise change that part of the build yourself: raise a school to its minimum, remove or swap the odd fish out, enter a bigger tank size, or trim numbers to bring stocking down.
3. The results update instantly. Keep going until the problems you care about are gone.

You can't dismiss or hide a warning. If you've decided a Check or Tip doesn't apply to your setup (for example you're running a divided tank), it's fine to go ahead; the builder is a guide, not a rule.

## Common problems
**It says "No problems found" but I know these fish don't mix.**
The builder can only check what's in our data. If a species is missing temperature, pH, size or temperament data, those checks are skipped for it. Email support@undergroundaquarium.com with the species names so we can review the data.

**My score says Great match but it's amber.**
You have one Check. It still scores 90, so the label reads Great match, but the amber color tells you there's something to look at. Read the Check in the list.

**I have two female bettas and it isn't warning me, or it is.**
Only names containing "female" or "sorority" are excluded from the betta rule. If you added a regular betta entry twice, it's counted as more than one male.

**My divided tank shows a betta Conflict.**
The builder can't know about dividers. The warning itself says "unless they're fully divided," so you can ignore it for a truly divided tank.

**The tank size warning disappeared when I cleared the size.**
Tank size, stocking and gear checks only run when a size is entered. Enter your size to see them again.

**Why is pH only a Check when temperature is a Conflict?**
Many captive-bred fish adapt to stable pH, but no fish can live outside its temperature range. The builder weighs them differently on purpose.

**The hardness warning is only a Tip.**
That happens when the same fish already have a "pH preferences differ" Check. The hardness note is kept as a Tip so one water problem doesn't cost you twice.

**My big fish is now flagged for eating snails.**
Fish that grow to 8 inches or more can crack snail shells, so they're checked against snails like any other tankmate. Smaller fish still leave snails alone.

**I tapped a Try gallons button and my litres changed to gallons.**
Size fixes always set the tank in gallons. Tap **Litres** to convert the view back.

**There's no Try gallons button on my Overstocked warning.**
Even a 300 gallon tank wouldn't bring that stock down to a comfortable level. Remove some fish or lower the counts instead.
