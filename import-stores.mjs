/**
 * Nationwide local fish store import, from OpenStreetMap.
 *
 * Run it on your own machine:
 *
 *   node --env-file=.env.local import-stores.mjs            # see what it would do
 *   node --env-file=.env.local import-stores.mjs --write    # actually write
 *   node --env-file=.env.local import-stores.mjs --write --state TX   # one state
 *   node --env-file=.env.local import-stores.mjs --write --again      # redo finished states
 *
 * Finished states are remembered in .store-import-progress.json, so if it
 * stops (a closed laptop, a sulking server), running it again picks up
 * where it left off.
 *
 * It asks OpenStreetMap for pet and aquarium shops state by state, keeps
 * the ones that read like a local fish store, throws out the chains, and
 * adds what's missing to fish_stores. Anything already in the table is
 * left alone: it matches on the OSM id first, then on name plus city, so
 * running it twice doesn't duplicate your California shops.
 *
 * OpenStreetMap data is ODbL. Credit "© OpenStreetMap contributors"
 * somewhere on the store pages.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}
const supabase = createClient(url, key);

const WRITE = process.argv.includes("--write");
const ONLY = (() => {
  const i = process.argv.indexOf("--state");
  return i > -1 ? (process.argv[i + 1] || "").toUpperCase() : null;
})();

const PROGRESS_FILE = new URL("./.store-import-progress.json", import.meta.url).pathname;
const AGAIN = process.argv.includes("--again");

function loadProgress() {
  if (AGAIN || !existsSync(PROGRESS_FILE)) return { done: [], places: {} };
  try {
    const p = JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
    p.done = p.done ?? [];
    p.places = p.places ?? {};
    // A state recorded with zero places came from a mirror that didn't
    // really have the data. Don't trust it; do it again.
    p.done = p.done.filter((c) => p.places[c] !== 0);
    return p;
  } catch {
    return { done: [], places: {} };
  }
}
function saveProgress(p) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
  } catch {
    /* progress is a convenience, never a blocker */
  }
}

/**
 * Whole-planet Overpass mirrors only. Regional instances (overpass.osm.ch,
 * overpass.osm.jp) answer a US query with a cheerful 200 and zero results,
 * which looks like "this state has no pet shops" instead of an error.
 */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan",
  MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
  OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

/** Names that mean "this is a fish shop", not a general pet store. */
const FISHY = /aquarium|aquaria|aquatic|aqua\b|fish|reef|coral|cichlid|discus|koi|pond|shrimp|tropical|marine|saltwater|freshwater|guppy|betta|angelfish/i;

/** Chains and franchises we don't want in a local-shop directory. */
const CHAINS = [
  "petsmart", "petco", "pet supplies plus", "petsense", "pet supermarket",
  "petland", "pet valu", "petvalu", "pet people", "pet club", "petstop",
  "walmart", "target", "meijer", "kroger", "tractor supply", "rural king",
  "dollar", "menards", "ace hardware", "petsuites", "petsmart grooming",
  "petco grooming", "chewy", "petsmart®", "pet food express", "pet food center",
  "banfield", "vca ", "aquarium of the", "sea life", "national aquarium",
  "shedd aquarium", "georgia aquarium", "monterey bay aquarium",
];

/**
 * Places that aren't a fish shop even though the name sounds wet:
 * public attractions, and the dog-swimming / grooming world, which is full
 * of "aquatic" businesses that sell no fish at all.
 */
const NOT_A_SHOP =
  /public aquarium|zoo\b|museum|science center|aquarium of |sea life|oceanarium|dog|canine|puppy|groom|kennel|hydrotherapy|veterinar|animal hospital|car wash|laundr|nail|salon|swim school/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(name, city, state) {
  const base = `${name} ${city || ""} ${state || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `shop-${Math.random().toString(36).slice(2, 8)}`;
}

function tagsFor(name, t) {
  const out = new Set();
  const hay = `${name} ${t.description || ""}`.toLowerCase();
  if (/reef|coral|saltwater|marine/.test(hay)) out.add("Saltwater");
  if (/freshwater|tropical|cichlid|discus|guppy|betta/.test(hay)) out.add("Freshwater");
  if (/plant|aquascap/.test(hay)) out.add("Plants");
  if (/shrimp/.test(hay)) out.add("Shrimp");
  if (/koi|pond/.test(hay)) out.add("Pond");
  if (out.size === 0) out.add("Freshwater");
  return [...out];
}

function clean(v) {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}

/** How long to wait on a mirror, per round. Patience grows, but not forever. */
const ROUND_TIMEOUTS = [60000, 90000, 120000];

/** Prints a dot every 10s so a slow server never looks like a frozen script. */
function heartbeat() {
  const t = setInterval(() => process.stdout.write("."), 10000);
  return () => clearInterval(t);
}

/**
 * Ask OpenStreetMap for one state. The free servers are busy and hand out
 * 504s, so every mirror gets tried, three rounds, with a longer wait each
 * time before giving up on the state.
 */
async function fetchState(code) {
  const query = `
[out:json][timeout:180];
area["ISO3166-2"="US-${code}"]->.a;
(
  nwr["shop"="pet"](area.a);
  nwr["shop"="aquarium"](area.a);
  nwr["shop"="aquatics"](area.a);
  nwr["craft"="aquarium"](area.a);
);
out center tags;`.trim();

  for (let round = 1; round <= 3; round++) {
    for (const endpoint of ENDPOINTS) {
      const host = endpoint.split("/")[2];
      const stop = heartbeat();
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "UndergroundAquarium/1.0 (store directory; hello@undergroundaquarium.com)",
          },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(ROUND_TIMEOUTS[round - 1]),
        });
        if (res.ok) {
          const json = await res.json();
          stop();
          const elements = json.elements ?? [];
          // No US state has zero pet shops. An empty answer means a mirror
          // that doesn't hold this part of the planet, so keep looking.
          if (elements.length > 0) return elements;
          process.stdout.write(`[${host} empty] `);
        } else {
          stop();
          process.stdout.write(`[${host} ${res.status}] `);
        }
      } catch (err) {
        stop();
        process.stdout.write(`[${host} ${err.name === "TimeoutError" ? "slow" : "down"}] `);
      }
      await sleep(3000);
    }
    if (round < 3) {
      process.stdout.write(`pausing ${round * 15}s… `);
      await sleep(round * 15000);
    }
  }
  return null;
}

function toStore(el, stateCode) {
  const t = el.tags ?? {};
  const name = clean(t.name);
  if (!name) return null;

  const lower = name.toLowerCase();
  if (CHAINS.some((c) => lower.includes(c))) return null;
  if (NOT_A_SHOP.test(name)) return null;

  // A general pet shop only counts if its name, or its own tags, say fish.
  const saysFish =
    FISHY.test(name) ||
    t.shop === "aquarium" ||
    t.shop === "aquatics" ||
    t["pet"] === "fish" ||
    /fish|aquarium|aquatic/i.test(t.description ?? "");
  if (!saysFish) return null;

  const lat = el.lat ?? el.center?.lat ?? null;
  const lng = el.lon ?? el.center?.lon ?? null;

  const house = clean(t["addr:housenumber"]);
  const street = clean(t["addr:street"]);
  const address = house && street ? `${house} ${street}` : street;

  return {
    name,
    slug: slugify(name, clean(t["addr:city"]), stateCode),
    address,
    city: clean(t["addr:city"]),
    state: stateCode,
    country: "US",
    lat,
    lng,
    phone: clean(t.phone || t["contact:phone"]),
    website: clean(t.website || t["contact:website"]),
    hours: clean(t.opening_hours),
    description: null,
    tags: tagsFor(name, t),
    source: "osm",
    external_ref: `osm:${el.type}/${el.id}`,
    status: "published",
  };
}

async function main() {
  const progress = loadProgress();
  const doneAlready = new Set(progress.done ?? []);
  const codes = (ONLY ? [ONLY] : Object.keys(STATES)).filter((c) => ONLY || !doneAlready.has(c));
  if (!ONLY && doneAlready.size > 0) {
    console.log(`Picking up where it stopped: ${doneAlready.size} states already done.\n`);
  }
  console.log(`${WRITE ? "Importing" : "Dry run"}: ${codes.length} state${codes.length === 1 ? "" : "s"}\n`);

  // What's already there, so nothing gets added twice.
  const existing = new Map();
  const seenRefs = new Set();
  const slugs = new Set();
  {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("fish_stores")
        .select("id,name,city,state,slug,external_ref")
        .range(from, from + 999);
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      for (const s of data ?? []) {
        slugs.add(s.slug);
        if (s.external_ref) seenRefs.add(s.external_ref);
        existing.set(`${(s.name || "").toLowerCase()}|${(s.city || "").toLowerCase()}`, s.id);
      }
      if (!data || data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`Already in the directory: ${existing.size}\n`);

  let added = 0;
  let skipped = 0;
  const failedStates = [];

  for (const code of codes) {
    process.stdout.write(`${code} ${STATES[code] ?? ""}… `);
    const elements = await fetchState(code);
    if (elements === null) {
      console.log("could not reach OpenStreetMap, will need a retry");
      failedStates.push(code);
      await sleep(5000);
      continue;
    }

    const rows = [];
    for (const el of elements) {
      const row = toStore(el, code);
      if (!row) continue;
      if (seenRefs.has(row.external_ref)) {
        skipped++;
        continue;
      }
      const key = `${row.name.toLowerCase()}|${(row.city || "").toLowerCase()}`;
      if (existing.has(key)) {
        skipped++;
        continue;
      }
      let slug = row.slug;
      let n = 2;
      while (slugs.has(slug)) slug = `${row.slug}-${n++}`;
      row.slug = slug;

      slugs.add(slug);
      seenRefs.add(row.external_ref);
      existing.set(key, true);
      rows.push(row);
    }

    console.log(`${elements.length} places, ${rows.length} new fish shops`);

    if (WRITE && rows.length > 0) {
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("fish_stores").insert(chunk);
        if (error) console.error(`  insert failed: ${error.message}`);
      }
    }
    added += rows.length;
    if (WRITE) {
      progress.done = [...new Set([...(progress.done ?? []), code])];
      progress.places = { ...(progress.places ?? {}), [code]: elements.length };
      saveProgress(progress);
    }
    await sleep(3000); // be kind to a free service
  }

  console.log(`\n${WRITE ? "Added" : "Would add"}: ${added}. Already had: ${skipped}.`);
  if (failedStates.length) {
    console.log(`Could not reach OpenStreetMap for: ${failedStates.join(" ")}`);
    console.log("Run the same command again later and it will retry just those.");
  }
  if (!WRITE) console.log("\nNothing was written. Add --write when the numbers look right.");
}

main();
