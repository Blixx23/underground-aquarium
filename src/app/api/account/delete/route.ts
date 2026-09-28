import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const GRACE_DAYS = 30;

// app_metadata key holding the tanks that were public before deletion.
// Read back by /api/account/reactivate.
const DELETION_HIDDEN_TANKS_KEY = "ua_deletion_public_tanks";

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

  // Blocker 1: orders still in progress (as buyer or seller).
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

  // Blocker 2: clubs the user owns.
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

  // Soft delete: schedule purge and hide content immediately.
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

  // Take live classified ads down by marking them expired. That hides them
  // from the marketplace right away, and if the member reactivates they can
  // repost each one from My listings, exactly like an ad that ran out.
  await supabaseAdmin
    .from("listings")
    .update({ status: "expired" })
    .eq("user_id", user.id)
    .eq("status", "active");

  // Old paid-marketplace products (not shown anywhere any more, but archive
  // them so nothing lingers if the paid side is ever switched back on).
  if (storeIds.length > 0) {
    await supabaseAdmin
      .from("products")
      .update({ archived_at: now.toISOString(), is_active: false })
      .in("store_id", storeIds)
      .is("archived_at", null);
  }

  // Make tanks private, but remember which ones were public so reactivating
  // can switch exactly those back on. There is no column for this, so the
  // ids go on the auth user's app_metadata, which only the server can write.
  const { data: publicTanks } = await supabaseAdmin
    .from("tanks")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_public", true);
  const publicTankIds = (publicTanks ?? [])
    .map((t) => (t as { id: string }).id)
    .slice(0, 200);
  await supabaseAdmin
    .from("tanks")
    .update({ is_public: false })
    .eq("user_id", user.id);
  const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    { app_metadata: { [DELETION_HIDDEN_TANKS_KEY]: publicTankIds } }
  );
  if (metaErr) {
    // Deletion is still scheduled. Only the tank undo list is missing, and
    // the reactivation page tells the member to check their tanks.
    console.error("account delete: couldn't save public tank list", metaErr.message);
  }

  return NextResponse.json({
    ok: true,
    deletion_scheduled_for: purgeAt.toISOString(),
  });
}
