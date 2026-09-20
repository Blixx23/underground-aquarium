/**
 * Fill in missing city / address / zip for shops that have coordinates.
 *
 * Run it on your own machine:
 *
 *   node --env-file=.env.local geocode-stores.mjs            # see what it would do
 *   node --env-file=.env.local geocode-stores.mjs --write    # actually write
 *
 * Every OSM shop has a lat/lng, so this asks Nominatim what's at that spot
 * and fills in only the fields that are empty. Nothing you typed by hand
 * gets overwritten.
 *
 * Nominatim's usage policy allows one request per second from a single
 * source with a real User-Agent. This obeys both, so ~150 shops takes about
 * three minutes. Don't run several copies at once.
 *
 * Progress is remembered in .store-geocode-progress.json, so stopping it
 * and starting again picks up where it left off.
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
const AGAIN = process.argv.includes("--again");
const PROGRESS_FILE = new URL("./.store-geocode-progress.json", import.meta.url).pathname;

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const AGENT = "UndergroundAquarium/1.0 (store directory; hello@undergroundaquarium.com)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadProgress() {
  if (AGAIN || !existsSync(PROGRESS_FILE)) return { done: [] };
  try {
    const p = JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
    return { done: p.done ?? [] };
  } catch {
    return { done: [] };
  }
}
function saveProgress(p) {
  try {
    writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
  } catch {
    /* a convenience, never a blocker */
  }
}

function clean(v) {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}

/** Administrative areas that aren't what a person would call their city. */
const NOT_A_CITY = /\bcounty\b|\bparish\b|charter township|^township of |\btownship$|^village of |^town of |^city of /i;

/** Nominatim names the city differently depending on how a place is mapped. */
function cityFrom(a) {
  const candidates = [a.city, a.town, a.village, a.hamlet, a.municipality, a.suburb];
  for (const c of candidates) {
    const v = clean(c);
    if (v && !NOT_A_CITY.test(v)) return v;
  }
  return null;
}

/** Roads, highways and trails are not a shop's address. */
const NOT_AN_ADDRESS = /\bfreeway\b|\binterstate\b|^i[- ]\d|\bhighway\b|^[a-z]{2}[- ]?\d+$|\btrail\b|\bexpressway\b|\bturnpike\b|\bservice road\b|\broute \d/i;

/** Metres between two points, so a match half a mile away can be thrown out. */
function metresBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Most of these shops are mapped as a bare point, so reverse geocoding
 * happily returns whatever is nearest: the plaza next door, the freeway,
 * a hiking trail. An address is only worth keeping when it has a house
 * number, isn't a road, and sits within a block of the shop itself.
 */
const ADDRESS_LIMIT_M = 60;

function addressFrom(a, hit, lat, lng) {
  const house = clean(a.house_number);
  const street = clean(a.road);
  if (!house || !street) return null;
  if (NOT_AN_ADDRESS.test(street)) return null;
  const hitLat = Number(hit.lat);
  const hitLon = Number(hit.lon);
  if (Number.isFinite(hitLat) && Number.isFinite(hitLon)) {
    if (metresBetween(lat, lng, hitLat, hitLon) > ADDRESS_LIMIT_M) return null;
  }
  return `${house} ${street}`;
}

async function reverse(lat, lng) {
  const qs = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?${qs}`, {
        headers: { "User-Agent": AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.json();
      process.stdout.write(`[${res.status}] `);
    } catch (err) {
      process.stdout.write(`[${err.name === "TimeoutError" ? "slow" : "down"}] `);
    }
    await sleep(attempt * 5000);
  }
  return null;
}

/** Not every schema has postal_code, so find out once instead of guessing. */
async function hasPostalCode() {
  const { error } = await supabase.from("fish_stores").select("postal_code").limit(1);
  return !error;
}

async function main() {
  const progress = loadProgress();
  const done = new Set(progress.done);
  const ZIP = await hasPostalCode();

  const { data, error } = await supabase
    .from("fish_stores")
    .select(`id,name,city,state,address,lat,lng${ZIP ? ",postal_code" : ""}`)
    .not("lat", "is", null)
    .not("lng", "is", null);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const needy = (data ?? []).filter(
    (s) => !done.has(s.id) && (!clean(s.city) || !clean(s.address))
  );

  console.log(`${WRITE ? "Filling in" : "Dry run"}: ${needy.length} shops need a city or address\n`);
  if (needy.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  let filled = 0;
  let blank = 0;

  for (const shop of needy) {
    process.stdout.write(`${shop.name} (${shop.state})… `);
    const hit = await reverse(shop.lat, shop.lng);
    if (!hit || !hit.address) {
      console.log("no answer");
      blank++;
      await sleep(1100);
      continue;
    }

    const a = hit.address;
    const patch = {};

    if (!clean(shop.city)) {
      const city = cityFrom(a);
      if (city) patch.city = city;
    }
    if (!clean(shop.address)) {
      const addr = addressFrom(a, hit, shop.lat, shop.lng);
      if (addr) patch.address = addr;
    }
    if (ZIP && !clean(shop.postal_code) && clean(a.postcode)) {
      patch.postal_code = clean(a.postcode);
    }

    const parts = Object.entries(patch).map(([k, v]) => `${k}=${v}`);
    if (parts.length === 0) {
      console.log("nothing new");
      blank++;
    } else {
      console.log(parts.join(", "));
      filled++;
      if (WRITE) {
        const { error: upErr } = await supabase.from("fish_stores").update(patch).eq("id", shop.id);
        if (upErr) console.error(`  update failed: ${upErr.message}`);
      }
    }

    if (WRITE) {
      progress.done = [...new Set([...progress.done, shop.id])];
      saveProgress(progress);
    }
    await sleep(1100); // Nominatim: one request per second, and mean it
  }

  console.log(`\n${WRITE ? "Filled in" : "Would fill in"}: ${filled}. Nothing to add: ${blank}.`);
  if (!WRITE) console.log("\nNothing was written. Add --write when it looks right.");
}

main();
