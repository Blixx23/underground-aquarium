import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ complete: true });

  const { data: store } = await supabase
    .from("stores")
    .select("id, payouts_enabled, ship_street1, ship_city, ship_state, ship_zip")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!store) return NextResponse.json({ complete: false });

  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id)
    .eq("is_draft", false)
    .is("archived_at", null);

  const payoutsDone = !!store.payouts_enabled;
  const listingDone = (count ?? 0) > 0;
  const shipDone = !!(
    store.ship_street1 &&
    store.ship_city &&
    store.ship_state &&
    store.ship_zip
  );

  return NextResponse.json({
    complete: payoutsDone && listingDone && shipDone,
  });
}
