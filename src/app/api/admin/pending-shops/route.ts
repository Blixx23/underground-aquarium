import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Action = "publish" | "reject";

type Fields = { name?: string; address?: string; city?: string; state?: string };

// Supabase errors are plain objects, not Error instances, so pull the
// readable parts out by hand.
function errText(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { message?: string; details?: string };
    return [e.message, e.details].filter(Boolean).join(" ") || "Something went wrong.";
  }
  return "Something went wrong.";
}

// Notifications are best-effort: a failed insert should never undo or block
// the decision itself.
async function notify(userId: string | null, title: string, body: string, link: string) {
  if (!userId) return;
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      type: "store_suggestion",
      title,
      body,
      link,
    });
  } catch {
    // swallow, see note above
  }
}

/**
 * Look up map coordinates for a newly published shop, the same free lookup
 * the stores geocode job uses, so it lands on the map right away instead of
 * waiting for the next batch run. Best-effort: if it's slow or finds
 * nothing, the batch job picks the shop up later (it looks for published
 * shops with no coordinates).
 */
async function geocode(address: string | null, city: string | null, state: string | null) {
  if (!address && !city) return null;
  const query = address ? `${address}, ${city ?? ""}, ${state ?? ""}` : `${city ?? ""}, ${state ?? ""}`;
  try {
    const res = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(query),
      {
        headers: { "User-Agent": "UndergroundAquarium/1.0 (store geocoding)" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as { lat: string; lon: string }[];
    if (!arr.length) return null;
    const lat = parseFloat(arr[0].lat);
    const lng = parseFloat(arr[0].lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}

// Trim, drop empties to null, and cap length so a stray paste can't bloat a row.
function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

/**
 * Admin decision on a member-suggested shop. Publish puts it in the Shops
 * directory and on the map; reject sets it to "hidden", the same status the
 * All shops screen uses, so nothing is deleted and it can be switched back
 * on later from there.
 */
export async function POST(req: Request) {
  let body: { id?: string; action?: string; fields?: Fields | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const id = body.id;
  const action = body.action as Action | undefined;
  if (!id || (action !== "publish" && action !== "reject")) {
    return NextResponse.json({ error: "Missing shop or action." }, { status: 400 });
  }

  // Check permission in code before touching anything with the service role.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { data: shop, error: findErr } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, address, city, state, status, submitted_by")
    .eq("id", id)
    .maybeSingle();
  if (findErr) return NextResponse.json({ error: errText(findErr) }, { status: 500 });
  if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  if (shop.status !== "pending") {
    return NextResponse.json({ error: "This shop was already reviewed." }, { status: 409 });
  }

  const suggester = (shop.submitted_by as string | null) ?? null;

  if (action === "reject") {
    const { error } = await supabaseAdmin
      .from("fish_stores")
      .update({ status: "hidden" })
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      const hint = /hidden|check|enum|invalid input/i.test(error.message) ? " Run step 56 in Supabase first." : "";
      return NextResponse.json({ error: errText(error) + hint }, { status: 500 });
    }
    await notify(
      suggester,
      "Shop suggestion reviewed",
      `Thanks for suggesting ${shop.name as string}. We couldn't add it to the directory this time. Questions? Write to support@undergroundaquarium.com.`,
      "/stores"
    );
    return NextResponse.json({ ok: true });
  }

  // Publish, with any edits the admin made first.
  const update: Record<string, unknown> = { status: "published" };
  let name = shop.name as string;
  let address = (shop.address as string | null) ?? null;
  let city = (shop.city as string | null) ?? null;
  let state = (shop.state as string | null) ?? null;
  let moved = false;

  if (body.fields) {
    const f = body.fields;
    const newName = clean(f.name, 120);
    if (!newName) return NextResponse.json({ error: "The shop needs a name." }, { status: 400 });
    const newAddress = clean(f.address, 200);
    const newCity = clean(f.city, 80);
    const newState = clean(f.state, 40);
    moved = newAddress !== address || newCity !== city || newState !== state;
    name = newName;
    address = newAddress;
    city = newCity;
    state = newState;
    Object.assign(update, { name, address, city, state });
  }

  // Place it on the map now. If the address changed, old coordinates (if
  // any) are wrong, so clear them and let the batch job retry on a miss.
  const coords = await geocode(address, city, state);
  if (coords) Object.assign(update, coords);
  else if (moved) Object.assign(update, { lat: null, lng: null });

  const { data: saved, error } = await supabaseAdmin
    .from("fish_stores")
    .update(update)
    .eq("id", id)
    .eq("status", "pending")
    .select("slug")
    .maybeSingle();
  if (error) return NextResponse.json({ error: errText(error) }, { status: 500 });
  if (!saved) return NextResponse.json({ error: "This shop was already reviewed." }, { status: 409 });

  const slug = (saved.slug as string | null) ?? (shop.slug as string | null);
  await notify(
    suggester,
    "Your shop suggestion is live",
    `${name} is now in the Shops directory. Thanks for helping other hobbyists find it.`,
    slug ? `/stores/${slug}` : "/stores"
  );

  revalidatePath("/stores");
  if (slug) revalidatePath(`/stores/${slug}`);
  return NextResponse.json({ ok: true, slug, mapped: Boolean(coords) });
}
