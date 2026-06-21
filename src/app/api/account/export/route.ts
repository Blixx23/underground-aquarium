import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, bio, location, website")
    .eq("id", user.id)
    .maybeSingle();

  const { data: tanks } = await supabase
    .from("tanks")
    .select("*")
    .eq("user_id", user.id);

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);

  let listings: unknown[] = [];
  let sales: unknown[] = [];
  if (storeIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, slug, price, category, stock, is_active, is_draft, archived_at, created_at"
      )
      .in("store_id", storeIds);
    listings = products ?? [];

    const { data: storeOrders } = await supabase
      .from("orders")
      .select("id, product_name, amount_total, platform_fee, status, created_at")
      .in("store_id", storeIds);
    sales = storeOrders ?? [];
  }

  const { data: purchases } = await supabase
    .from("orders")
    .select(
      "id, product_name, amount_total, status, created_at, tracking, tracking_carrier"
    )
    .eq("buyer_id", user.id);

  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id, role, status, joined_at")
    .eq("user_id", user.id);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const payload = {
    exported_at: new Date().toISOString(),
    note: "This is a copy of the personal data Underground Aquarium holds about your account.",
    account: {
      id: user.id,
      email: user.email,
      username: meta.username ?? null,
      created_at: user.created_at,
      terms_accepted_at: meta.terms_accepted_at ?? null,
      terms_version: meta.terms_version ?? null,
    },
    profile: profile ?? null,
    tanks: tanks ?? [],
    stores: stores ?? [],
    listings,
    purchases: purchases ?? [],
    sales,
    club_memberships: memberships ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="underground-aquarium-data-${user.id.slice(
        0,
        8
      )}.json"`,
    },
  });
}
