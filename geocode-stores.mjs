import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check your .env.local file."
  );
  process.exit(1);
}

const supabase = createClient(url, key);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function geocode(query) {
  const u =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(query);
  const res = await fetch(u, {
    headers: { "User-Agent": "UndergroundAquarium/1.0 (store geocoding)" },
  });
  if (!res.ok) return null;
  const arr = await res.json();
  if (!arr.length) return null;
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

async function main() {
  const { data: stores, error } = await supabase
    .from("fish_stores")
    .select("id,name,address,city,state,lat,lng")
    .is("lat", null);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(`Geocoding ${stores.length} stores…`);
  let done = 0;

  for (const s of stores) {
    const query = s.address
      ? `${s.address}, ${s.city || ""}, ${s.state || "CA"}`
      : `${s.city || ""}, ${s.state || "CA"}`;

    const coords = await geocode(query);

    if (coords) {
      await supabase
        .from("fish_stores")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", s.id);
      done++;
      console.log(`OK  ${s.name} -> ${coords.lat}, ${coords.lng}`);
    } else {
      console.log(`--  ${s.name} (no match for "${query}")`);
    }

    await sleep(1100);
  }

  console.log(`Done. Updated ${done}/${stores.length}.`);
}

main();
