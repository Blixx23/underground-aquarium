import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(query: string) {
  const u =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(query);
  const res = await fetch(u, {
    headers: { "User-Agent": "UndergroundAquarium/1.0 (store geocoding)" },
  });
  if (!res.ok) return null;
  const arr = (await res.json()) as { lat: string; lon: string }[];
  if (!arr.length) return null;
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!process.env.GEOCODE_SECRET || key !== process.env.GEOCODE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stores, error } = await supabaseAdmin
    .from("fish_stores")
    .select("id,name,address,city,state")
    .eq("status", "published")
    .is("lat", null)
    .limit(8);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let updated = 0;
  const results: string[] = [];

  for (const s of stores ?? []) {
    const query = s.address
      ? `${s.address}, ${s.city ?? ""}, ${s.state ?? "CA"}`
      : `${s.city ?? ""}, ${s.state ?? "CA"}`;
    const coords = await geocode(query);
    if (coords) {
      await supabaseAdmin
        .from("fish_stores")
        .update({ lat: coords.lat, lng: coords.lng })
        .eq("id", s.id);
      updated++;
      results.push(`OK ${s.name}`);
    } else {
      results.push(`-- ${s.name} (no match)`);
    }
    await sleep(1100);
  }

  return NextResponse.json({
    processed: stores?.length ?? 0,
    updated,
    results,
    note:
      (stores?.length ?? 0) === 8
        ? "Hit this again — there may be more to process."
        : "All caught up.",
  });
}