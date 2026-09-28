---
title: Tank Builder compatibility warnings explained
category: Tools & learning
summary: Every check the Tank Builder runs, what triggers each Conflict, Check and Tip, the exact thresholds, and how the score and labels are worked out.
order: 110
keywords: conflict, caution, check, tip, warning, compatibility score, great match, needs changes, don't do this, fin nipper, temperature mismatch, mixed water types, tight in this tank, needs a group, bully, aggressive, eat tankmates, betta, overstocked, score out of 100
pages: /tank-builder, /tank-builder/[size]
---

The [Tank Builder](/tank-builder) runs a set of checks on every build and lists what it finds in the **Compatibility** tab. This guide lists every check, what triggers it, how serious it is, and how the score and label are worked out. For the stocking math and gear formulas, see [Stocking level, heater and filter sizing](/help/tank-builder-stocking-and-equipment).

## What do Conflict, Check and Tip mean?
Every problem is tagged with one of three levels, and the list is always sorted **Conflicts** first, then **Checks**, then **Tips**.

- **Conflict** (red warning icon): a real dealbreaker. The builder thinks this combination shouldn't happen as planned.
- **Check** (amber warning icon): workable but risky. Worth fixing, or at least watching closely.
- **Tip** (blue info icon): good to know. Tips barely affect the score and aren't counted in the "to check" number.

Species involved in a **Conflict** or **Check** are highlighted amber in your fish list and glow in the tank picture. Tips don't highlight anything. The two counters next to the score show how many **conflicts** and how many items **to check** you have.

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

## Why does it say "Mixed water types"?
If your fish don't all need the same kind of water (freshwater, brackish or saltwater), you get a **Conflict** titled "Mixed water types." The message lists each water type with its fish and ends "They can't share a tank."

Capitalization doesn't matter ("Freshwater" and "freshwater" are the same). Fish with no water type in our data are left out of this check. To fix it, pick fish that all share one water type.

## Why does it say "Temperature mismatch"?
The builder takes each fish's comfortable temperature range and looks for a range they all share. If there isn't one (and at least two fish have temperature data), you get a **Conflict** titled "Temperature mismatch."

- If you have 3 or more fish with temperature data and removing one would fix it, the message names that fish: "[Fish] ([low]-[high]°F) doesn't share a safe temperature with the rest. Everything else can live together."
- Otherwise it lists every fish with its range: "There's no temperature that suits all of them: ..."

The **Water each fish likes** chart shows the same thing visually: the Temperature chart reads **No overlap** in red. The heater **Set to** value shows "--" because there's no shared range to aim for.

## What does "Very narrow temperature window" mean?
If your fish do share a temperature range but it's less than 3°F wide, you get a **Check** titled "Very narrow temperature window." The message says, for example, "They only share 76-78°F. That's hard to hold steady, and it keeps some of them at the edge of what they like." If they share just a single degree, it names that one temperature.

## What does "pH preferences differ" mean?
If at least two fish have pH data and their ranges don't overlap at all, you get a **Check** (not a Conflict) titled "pH preferences differ." The builder treats pH more gently than temperature because many captive-bred fish settle into stable water.

- With 3 or more fish, if one fish is the odd one out, it's named: "[Fish] likes pH [low]-[high], which doesn't overlap with the others. Many fish settle into stable water fine, but it's worth knowing before you mix them."
- Otherwise: "Their ideal pH ranges don't overlap. Many fish settle into stable water fine, but it's worth knowing before you mix them."

The pH chart in **Water each fish likes** will show **No overlap**.

## Does the Tank Builder check water hardness (GH)?
No. The builder doesn't give any warning about GH (general hardness), even if your fish prefer very different hardness. Hardness isn't shown on the **Water each fish likes** chart either. Check each fish's care guide on its [species page](/help/reading-a-species-page) for hardness preferences.

## What does "[Fish] needs a group" mean?
Schooling and shoaling fish have a minimum group size in our data. If you have fewer than that minimum, you get a **Check** titled "[Fish] needs a group": "Keep at least [number] together. You have [number]. Too few leaves them stressed, hiding, and often nippier."

In your fish list, that row shows "keep [number]+" and the number box gets an amber border. Raise the count to the minimum to clear it. Fish are always added at their minimum group, so this usually appears only after you lower the number.

## How does the fin nipper check work?
Some fish are marked as fin nippers in our data. The builder then looks for long-finned targets, which it spots by name: bettas (including "Siamese fighting"), angelfish, guppies, gouramis, fancy goldfish, orandas, ryukins, lionheads, telescopes, fantails, and anything with "veil" or "long fin" in its name. Other fin nippers don't count as targets.

- **Nipper plus a betta**: **Conflict**, "Fin nippers with long fins." This is the classic mistake.
- **Nipper plus any other long-finned fish**: **Check**, same title. The message names both sides and says "Swap one side, or keep the nippers in a bigger group to spread it out."
- **Nipper with no long-finned fish** (and at least one other species): **Tip**, "Fin nipper in the mix," saying it should be fine but to avoid adding bettas, angelfish or fancy guppies later.

## Will one of my fish eat the others?
The builder compares adult sizes to spot fish big enough to swallow tankmates.

**Who counts as a hunter**: fish whose diet is listed as carnivore, piscivore or predatory, or whose temperament is aggressive, territorial, predatory or semi-aggressive.

- A **hunter** is flagged if it grows to at least twice the length of another fish and is at least 2.5 inches as an adult.
- **Any other fish** (even peaceful ones) is flagged if it grows to at least four times the length of another fish and is at least 4 inches as an adult. For example, a 6 inch peaceful fish is flagged with a 1.5 inch tetra.

Snails are never counted as prey (they're safe in their shells). Shrimp and snails are never counted as eaters, but crayfish and crabs are. Fish with no adult size in our data are skipped.

You get one message per big fish, titled "[Fish] may eat [smaller fish]" or "[Fish] may eat smaller tankmates" when there are several. It gives the big fish's size and lists each smaller fish with its size, adding "Anything that fits in its mouth is at risk, often at night."

**Severity**: it's a **Check** if the big fish is a predator or aggressive (not just semi-aggressive), or if any tankmate is a quarter of its size or less. Otherwise it's a **Tip**, with the extra advice "Adding them as adults, bigger than a mouthful, lowers the risk."

## Why does it warn about my crayfish or crab?
If your build has a crayfish or crab (spotted by group or name) plus any fish, you get a **Check** titled "[Crayfish or crab] can catch fish." It says it "will grab slow or sleeping fish, especially bottom dwellers like..." (naming up to 3 of your fish) and that "Fast, mid-water fish fare best, and lots of cover helps." This applies whatever the sizes, because they grab from the bottom.

## Why does it say "Shrimp babies will get eaten"?
If you have shrimp and at least one fish that grows to 2 inches or more, you get a **Tip**: "Adult [shrimp] can live with [up to 3 fish], but most baby shrimp will be eaten. Thick moss or plants give the colony a chance to grow." If a fish was already flagged as big enough to eat the shrimp outright, you get that warning instead of this Tip.

## How does the temperament check work?
The builder sorts fish by temperament from our data: **aggressive** (aggressive, territorial or predatory), **semi-aggressive**, and **peaceful** (peaceful, docile, calm or community). Shrimp and snails aren't counted as peaceful fish here.

- **Aggressive fish plus peaceful fish**: **Check**, "Temperament to watch." It names the aggressive fish and up to 4 peaceful ones, and says "Plenty of plants, hiding spots and broken sightlines help a lot." If one of the aggressive fish is a betta it adds that bettas vary by individual and to have a backup plan. If your tank is under 20 gallons it adds "In a tank this small there's little room to escape, so watch them closely early on."
- **Semi-aggressive fish plus peaceful fish**: a **Tip**, "Some attitude in the mix," but only when the tank is under 20 gallons or you have two or more semi-aggressive species. It says they "can be pushy at feeding time or when claiming a spot. Usually fine with enough room and cover."

Temperament is never a Conflict, because aggression depends so much on the individual fish and the setup.

## Why can't I keep more than one betta?
If the total count of bettas in your build is more than 1, you get a **Conflict**: "More than one [betta name]" (or "More than one betta" if you've added different betta varieties). The message: "Male bettas fight, often to the death. Keep one per tank unless they're fully divided."

The builder counts every species with "betta" in its name together, except names containing "female" or "sorority." So a female betta or sorority entry doesn't trigger this rule. There's no way to tell the builder your tank is divided, so a divided setup will still show this Conflict.

## What do "Overstocked" and "Heavily stocked" mean?
Once you've entered a size, the builder compares your stocking percentage with its cautious limit:

- **Over 130%**: **Conflict**, "Overstocked": "You're well past a cautious stocking limit (about [x]%). Size up the tank or trim the list."
- **90% to 130%**: **Check**, "Heavily stocked": "About [x]% of a cautious limit. Workable with strong filtration and steady water changes, but there's little room to add more."
- **Under 90%**: no message.

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

## How do I get rid of a warning?
Each warning names the fish causing it, so:

1. Read the title and message to see which fish and why.
2. Change that part of the build: raise a school to its minimum, remove or swap the odd fish out, enter a bigger tank size, or trim numbers to bring stocking down.
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
