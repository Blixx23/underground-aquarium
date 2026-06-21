import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const GRACE_DAYS = 30;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // The user's stores (for seller-side checks and content hiding).
  const { data: stores } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", user.id);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);

  // Blocker 1 — orders still in progress (as buyer or seller).
  const { count: buyerInflight } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("buyer_id", user.id)
    .in("status", ["paid", "shipped"]);

  let sellerInflight = 0;
  if (storeIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("store_id", storeIds)
      .in("status", ["paid", "shipped"]);
    sellerInflight = count ?? 0;
  }

  if ((buyerInflight ?? 0) > 0 || sellerInflight > 0) {
    return NextResponse.json(
      {
        error:
          "You have orders still in progress. Please wait until they're delivered and paid out before deleting your account.",
      },
      { status: 409 }
    );
  }

  // Blocker 2 — clubs the user owns.
  const { data: ownerRows } = await supabaseAdmin
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id)
    .eq("role", "owner");

  if ((ownerRows ?? []).length > 0) {
    return NextResponse.json(
      {
        error:
          "You own one or more clubs. Please transfer ownership or delete those clubs first, then delete your account.",
      },
      { status: 409 }
    );
  }

  // Soft delete — schedule purge and hide content immediately.
  const now = new Date();
  const purgeAt = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);

  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({
      deleted_at: now.toISOString(),
      deletion_scheduled_for: purgeAt.toISOString(),
    })
    .eq("id", user.id);
  if (profErr) {
    return NextResponse.json(
      { error: "Couldn't schedule deletion. Please try again." },
      { status: 500 }
    );
  }

  // Hide listings (archive) and public tanks right away.
  if (storeIds.length > 0) {
    await supabaseAdmin
      .from("products")
      .update({ archived_at: now.toISOString(), is_active: false })
      .in("store_id", storeIds)
      .is("archived_at", null);
  }
  await supabaseAdmin
    .from("tanks")
    .update({ is_public: false })
    .eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    deletion_scheduled_for: purgeAt.toISOString(),
  });
}
