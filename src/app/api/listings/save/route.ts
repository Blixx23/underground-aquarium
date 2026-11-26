import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Save or unsave an ad (the heart on an ad page). The current price is kept
 * with the save so a later price drop can be announced once.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const { listingId, saved } = (await request.json().catch(() => ({}))) as { listingId?: string; saved?: boolean };
  if (!listingId || typeof saved !== "boolean") return NextResponse.json({ error: "Bad request." }, { status: 400 });

  if (!saved) {
    await supabaseAdmin.from("listing_saves").delete().eq("user_id", user.id).eq("listing_id", listingId);
    return NextResponse.json({ ok: true, saved: false });
  }

  const { data: listing } = await supabaseAdmin.from("listings").select("id, price_cents, status").eq("id", listingId).maybeSingle();
  if (!listing) return NextResponse.json({ error: "Ad not found." }, { status: 404 });
  const { error } = await supabaseAdmin
    .from("listing_saves")
    .upsert({ user_id: user.id, listing_id: listingId, price_cents: listing.price_cents }, { onConflict: "user_id,listing_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, saved: true });
}
