---
title: Connected data and live numbers
category: Content review
summary: How the species pages, varieties, breeding guides, glossary, courses, Society list and tools share one set of numbers, what placeholders like {{temp}} mean, and the weekly data check.
order: 45
keywords: live numbers, placeholders, tokens, curly braces, temp, ph, fact, data check, conflicting data, discrepancy, varieties inherit, parent species, society list scientific name, facts file, safe ranges, varies
pages: /admin/species, /admin/glossary, /admin/courses, /admin/ops
---

Every number on the site lives in one place, and every other page reads it from there, so two pages can't disagree.

## Where does each number live?
- **A fish's care numbers** (temperature, pH, hardness, size, tank, group): its row in the species library.
- **Varieties and color forms** (koi angelfish, oranda goldfish): their parent species. When you change the parent, every variety that had the same value follows automatically. A variety keeps its own value only where it's truly different, like a fancy goldfish's smaller size.
- **General numbers** (nitrate targets, quarantine weeks, tropical temperature, heater size, CO2, light hours): one shared facts file in the code. The Water Check grades readings with the same file, so its advice and the glossary always match.
- **The Society point list**: each fish links to its species page, and its scientific name follows the species page. Entries without a species page (plants, saltwater fish, "spp." groups) keep their own.

## What are the {{...}} bits in the text?
Live numbers. When you edit text in admin you may see placeholders in curly braces. The site fills them in when the page loads:

| You type | Visitors see |
|---|---|
| `{{temp}}°F` | the species' temperature range, like "72 to 78°F" |
| `pH {{ph}}` | its pH range, like "pH 6 to 7.5" |
| `{{tank}} gallons`, `{{size}} inches`, `{{group}}` | its minimum tank, adult size, group size |
| `{{neon-tetra.temp}}°F` | another species' range (use its page address) |
| `{{fact.nitrate_ok}} ppm` | a shared fact, like "20 ppm" |

Plain `{{temp}}` works on a species page and in a breeding guide tied to a species. In the glossary and courses, name the species (`{{angelfish.tank}}`). Keep the unit in the sentence. If a placeholder can't be filled, the page shows "varies" and the weekly check flags it.

Please use placeholders instead of typing a fish's numbers into text. Numbers that are about something else, like spawning temperature or how long eggs take to hatch, are fine to type.

New species approved from member requests get their numbers turned into placeholders automatically.

## What is the weekly data check?
Every Wednesday morning, before the QA worker runs, a rule-based check (no AI cost) looks for:

- varieties that don't match their parent species
- species numbers outside the safe limits (pH below 5.5 or above 8.6, over 86°F, schooling fish in groups under 6, big fish in small tanks)
- species text, breeding guides, glossary entries or lessons quoting a range outside the species page
- placeholders that can't be filled
- Society list names that differ from the species page

Each kind of problem becomes one finding titled "Data check: ..." on [AI team](/admin/ops), listing every item. Fix the source, and the next check clears it.
