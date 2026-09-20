/**
 * Import aquarium shops from the Overture Maps dump into fish_stores.
 *
 * First run overture-stores.py --dump to produce overture-stores.json,
 * then:
 *
 *   node --env-file=.env.local import-overture.mjs            # see what it would do
 *   node --env-file=.env.local import-overture.mjs --write    # actually write
 *   node --env-file=.env.local import-overture.mjs --write --min-confidence 0.5
 *
 * Overture places are CDLA-Permissive 2.0: credit required, no
 * share-alike. Nothing here touches a shop that an owner has claimed.
 *
 * Existing shops are matched three ways before anything is inserted — by
 * Overture id, by name plus city, and by sitting within ~150m of a shop
 * already in the table — so running this over the OpenStreetMap rows
 * recognises the same shop rather than listing it twice.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}
const supabase = createClient(url, key);

const WRITE = process.argv.includes("--write");
const argNum = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const MIN_CONFIDENCE = argNum("--min-confidence", 0.3);
const SAME_PLACE_M = 150;
const INFILE = "overture-stores.json";

/** Chains and franchises: a local-shop directory has no use for them. */
const CHAIN = new RegExp(
  "\\b(petsmart|petco|pet supplies plus|petsense|pet supermarket|petland|pet valu|" +
    "petvalu|walmart|target|meijer|kroger|tractor supply|rural king|dollar general|" +
    "dollar tree|menards|ace hardware|chewy|pet food express|banfield|vca|" +
    "aquarium of the|national aquarium|shedd aquarium|georgia aquarium|" +
    "monterey bay aquarium|petsuites|woof gang|camp bow wow|scenthound)\\b",
  "i"
);

/** Never a fish shop, whatever else the name says. */
const NEVER = /\b(canine|groom\w*|kennel|hydrotherapy|veterinar\w*|animal hospital|petting zoo|car wash|laundr\w*|nail salon|swim school)\b/i;

/** "Dog" in a name is only disqualifying when nothing says water. */
const DOGGY = /\bdogs?\b/i;
const WATERY = /aquari|aquatic|reef|coral|fish|salt|marine|cichlid|discus|koi|pond|shrimp|betta|tropical/i;

function isShop(name) {
  if (!name) return false;
  if (CHAIN.test(name)) return false;
  if (NEVER.test(name)) return false;
  if (DOGGY.test(name) && !WATERY.test(name)) return false;
  return true;
}

function clean(v) {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
}

/** +19079298335 becomes (907) 929-8335; anything odd is left alone. */
function prettyPhone(raw) {
  const s = clean(raw);
  if (!s) return null;
  const d = s.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (ten.length !== 10) return s;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function slugify(name, city, state) {
  const base = `${name} ${city || ""} ${state || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `shop-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Tags are only worth having when the shop's own name or site says so.
 * An earlier version defaulted to Freshwater, which ended up on three
 * quarters of the directory and told a visitor nothing. No signal, no tag.
 */
function tagsFor(name, website) {
  const out = new Set();
  const hay = `${name} ${website || ""}`.toLowerCase();
  if (/reef|coral|saltwater|marine|salty/.test(hay)) out.add("Saltwater");
  if (/freshwater|tropical|cichlid|discus|guppy|betta/.test(hay)) out.add("Freshwater");
  if (/plant|aquascap/.test(hay)) out.add("Plants");
  if (/shrimp/.test(hay)) out.add("Shrimp");
  if (/koi|pond/.test(hay)) out.add("Pond");
  return [...out].sort(); // tags is NOT NULL, so no signal means an empty list
}

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

/** Coarse grid so we only compare shops that are already close. */
const cellKey = (lat, lng) => `${Math.round(lat * 100)}:${Math.round(lng * 100)}`;
function neighbourCells(lat, lng) {
  const out = [];
  const la = Math.round(lat * 100);
  const ln = Math.round(lng * 100);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) out.push(`${la + i}:${ln + j}`);
  return out;
}

async function main() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(INFILE, "utf8"));
  } catch {
    console.error(`Couldn't read ${INFILE}. Run overture-stores.py --dump first.`);
    process.exit(1);
  }

  // ---- filter the dump -------------------------------------------------
  const rejected = { chain: 0, notShop: 0, lowConfidence: 0, noPlace: 0 };
  const candidates = [];
  for (const p of raw) {
    const name = clean(p.name);
    const state = clean(p.region);
    if (!name || !state || p.lat == null || p.lng == null) {
      rejected.noPlace++;
      continue;
    }
    if (CHAIN.test(name)) {
      rejected.chain++;
      continue;
    }
    if (!isShop(name)) {
      rejected.notShop++;
      continue;
    }
    if ((p.confidence ?? 1) < MIN_CONFIDENCE) {
      rejected.lowConfidence++;
      continue;
    }
    candidates.push({ ...p, name, state });
  }

  console.log(`${INFILE}: ${raw.length} places`);
  console.log(
    `  dropped: ${rejected.chain} chains, ${rejected.notShop} not shops, ` +
      `${rejected.lowConfidence} below confidence ${MIN_CONFIDENCE}, ${rejected.noPlace} unplaceable`
  );
  console.log(`  candidates: ${candidates.length}\n`);

  // The provenance trigger adds osm_ref. If that SQL hasn't been run yet,
  // keep the old reference out of the update rather than failing 114 rows.
  const { error: refErr } = await supabase.from("fish_stores").select("osm_ref").limit(1);
  const HAS_OSM_REF = !refErr;
  if (!HAS_OSM_REF) {
    console.log("  (no osm_ref column yet — old OSM ids won't be kept)\n");
  }

  // ---- what's already in the table ------------------------------------
  const existing = [];
  {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("fish_stores")
        .select(
          "id,name,city,state,slug,lat,lng,source,external_ref,claimed_by,address,phone,website"
        )
        .range(from, from + 999);
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      existing.push(...(data ?? []));
      if (!data || data.length < 1000) break;
      from += 1000;
    }
  }
  console.log(`Already in the directory: ${existing.length}`);

  const byRef = new Set(existing.map((s) => s.external_ref).filter(Boolean));
  const byNameCity = new Map(
    existing.map((s) => [
      `${(s.name || "").toLowerCase()}|${(s.city || "").toLowerCase()}`,
      s,
    ])
  );
  const slugs = new Set(existing.map((s) => s.slug));

  const grid = new Map();
  for (const s of existing) {
    if (s.lat == null || s.lng == null) continue;
    const k = cellKey(s.lat, s.lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(s);
  }
  function nearbyMatch(lat, lng) {
    for (const k of neighbourCells(lat, lng)) {
      for (const s of grid.get(k) ?? []) {
        if (metresBetween(lat, lng, s.lat, s.lng) <= SAME_PLACE_M) return s;
      }
    }
    return null;
  }

  // ---- decide what to insert ------------------------------------------
  const rows = [];
  const supersedes = []; // OSM rows the same shop already occupies
  let skipped = 0;

  for (const p of candidates) {
    const ref = `overture:${p.id}`;
    if (byRef.has(ref)) {
      skipped++;
      continue;
    }
    const city = clean(p.city);
    const nameKey = `${p.name.toLowerCase()}|${(city || "").toLowerCase()}`;
    const hit = byNameCity.get(nameKey) ?? nearbyMatch(p.lat, p.lng);
    if (hit) {
      skipped++;
      // The same shop is already listed from OpenStreetMap. Overture almost
      // always knows more about it, so fill in what the old row is missing
      // rather than leaving a blank address next to a known one.
      if (hit.source === "osm" && !hit.claimed_by && hit.id) {
        const patch = {};
        if (!clean(hit.address) && clean(p.address)) patch.address = clean(p.address);
        if (!clean(hit.phone) && prettyPhone(p.phone)) patch.phone = prettyPhone(p.phone);
        if (!clean(hit.website) && clean(p.website)) patch.website = clean(p.website);
        patch.source = "overture";
        if (HAS_OSM_REF) patch.osm_ref = hit.external_ref;
        patch.external_ref = ref;
        supersedes.push({
          id: hit.id,
          name: hit.name,
          matched: p.name,
          gains: Object.keys(patch).filter((k) => !["source", "osm_ref", "external_ref"].includes(k)),
          patch,
        });
      }
      continue;
    }

    let slug = slugify(p.name, city, p.state);
    const stem = slug;
    let n = 2;
    while (slugs.has(slug)) slug = `${stem}-${n++}`;
    slugs.add(slug);

    const row = {
      name: p.name,
      slug,
      address: clean(p.address),
      city,
      state: p.state,
      country: "US",
      lat: p.lat,
      lng: p.lng,
      phone: prettyPhone(p.phone),
      website: clean(p.website),
      hours: null,
      description: null,
      tags: tagsFor(p.name, p.website),
      source: "overture",
      external_ref: ref,
      status: "published",
    };
    rows.push(row);

    const k = cellKey(p.lat, p.lng);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push({ ...row, id: null });
    byNameCity.set(nameKey, row);
  }

  console.log(`  already listed: ${skipped}`);
  console.log(`  ${WRITE ? "adding" : "would add"}: ${rows.length}\n`);

  const byState = {};
  for (const r of rows) byState[r.state] = (byState[r.state] ?? 0) + 1;
  const top = Object.entries(byState).sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log("New shops by state: " + top.map(([s, n]) => `${s} ${n}`).join(", "));
  const withPhone = rows.filter((r) => r.phone).length;
  const withSite = rows.filter((r) => r.website).length;
  const withAddr = rows.filter((r) => r.address).length;
  if (rows.length) {
    console.log(
      `Completeness: ${Math.round((withAddr / rows.length) * 100)}% address, ` +
        `${Math.round((withPhone / rows.length) * 100)}% phone, ` +
        `${Math.round((withSite / rows.length) * 100)}% website`
    );
  }

  if (supersedes.length) {
    writeFileSync("osm-superseded.json", JSON.stringify(supersedes, null, 1));
    const gained = { address: 0, phone: 0, website: 0 };
    for (const s of supersedes) for (const g of s.gains) gained[g]++;
    console.log(
      `\n${supersedes.length} OpenStreetMap rows are the same shop as an Overture one.` +
        `\n  ${WRITE ? "Filling in" : "Would fill in"}: ` +
        `${gained.address} addresses, ${gained.phone} phones, ${gained.website} websites` +
        `\n  and marking them Overture-sourced. Nothing is deleted; details you` +
        `\n  or an owner typed are kept. Listed in osm-superseded.json.`
    );
  }

  if (!WRITE) {
    console.log("\nNothing was written. Add --write when the numbers look right.");
    return;
  }

  let added = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from("fish_stores").insert(chunk);
    if (error) console.error(`  insert failed at ${i}: ${error.message}`);
    else added += chunk.length;
    process.stdout.write(`\r  inserted ${added}/${rows.length}`);
  }
  console.log(`\n\nAdded ${added} shops.`);

  let upgraded = 0;
  for (const s of supersedes) {
    const { error } = await supabase.from("fish_stores").update(s.patch).eq("id", s.id);
    if (error) console.error(`  upgrade failed for ${s.name}: ${error.message}`);
    else upgraded++;
    process.stdout.write(`\r  upgraded ${upgraded}/${supersedes.length} existing shops`);
  }
  if (supersedes.length) console.log("");
}

main();
