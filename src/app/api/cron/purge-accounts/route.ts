import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Hard-deletes accounts whose 30-day grace window has passed.
// Personal data is removed; completed order records are retained but
// stripped of the personal link. Runs daily via Vercel Cron.

type StepLog = { step: string; ok: boolean; detail?: string };

async function run(
  log: StepLog[],
  step: string,
  fn: () => PromiseLike<{ error: unknown } | void>
) {
  try {
    const res = await fn();
    const err = res && "error" in res ? res.error : null;
    log.push({ step, ok: !err, detail: err ? String((err as { message?: string })?.message ?? err) : undefined });
  } catch (e) {
    log.push({ step, ok: false, detail: e instanceof Error ? e.message : "error" });
  }
}

async function purgeAccount(uid: string): Promise<StepLog[]> {
  const log: StepLog[] = [];

  // Stores owned by the user.
  const { data: stores } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("owner_id", uid);
  const storeIds = (stores ?? []).map((s) => (s as { id: string }).id);

  // Which stores / products have orders (must be retained).
  let soldProductIds: string[] = [];
  let storesWithOrders: string[] = [];
  if (storeIds.length > 0) {
    const { data: storeOrders } = await supabaseAdmin
      .from("orders")
      .select("product_id, store_id")
      .in("store_id", storeIds);
    soldProductIds = Array.from(
      new Set(
        (storeOrders ?? [])
          .map((o) => (o as { product_id: string | null }).product_id)
          .filter((x): x is string => !!x)
      )
    );
    storesWithOrders = Array.from(
      new Set(
        (storeOrders ?? []).map((o) => (o as { store_id: string }).store_id)
      )
    );
  }

  // Retain orders, sever the personal buyer link.
  await run(log, "orders.buyer_id->null", () =>
    supabaseAdmin.from("orders").update({ buyer_id: null }).eq("buyer_id", uid)
  );

  // Anonymize public contributions (keep content, drop the author link).
  await run(log, "store_reviews anon", () =>
    supabaseAdmin.from("store_reviews").update({ user_id: null }).eq("user_id", uid)
  );
  await run(log, "events anon", () =>
    supabaseAdmin.from("events").update({ created_by: null }).eq("created_by", uid)
  );

  // Delete personal data.
  for (const table of [
    "tanks",
    "tank_likes",
    "tank_votes",
    "notifications",
    "club_members",
    "club_award_submissions",
    "event_rsvps",
    "review_responses",
  ]) {
    await run(log, `delete ${table}`, () =>
      supabaseAdmin.from(table).delete().eq("user_id", uid)
    );
  }

  // Listings: delete never-sold ones; keep sold ones (already archived).
  if (storeIds.length > 0) {
    await run(log, "delete store_posts", () =>
      supabaseAdmin.from("store_posts").delete().in("store_id", storeIds)
    );
    await run(log, "delete unsold products", () => {
      let q = supabaseAdmin.from("products").delete().in("store_id", storeIds);
      if (soldProductIds.length > 0) {
        q = q.not("id", "in", `(${soldProductIds.join(",")})`);
      }
      return q;
    });

    // Stores: delete those with no orders; clear personal address on the rest.
    const emptyStores = storeIds.filter((id) => !storesWithOrders.includes(id));
    if (emptyStores.length > 0) {
      await run(log, "delete empty stores", () =>
        supabaseAdmin.from("stores").delete().in("id", emptyStores)
      );
    }
    if (storesWithOrders.length > 0) {
      await run(log, "scrub kept stores", () =>
        supabaseAdmin
          .from("stores")
          .update({
            ship_name: null,
            ship_street1: null,
            ship_street2: null,
            ship_city: null,
            ship_state: null,
            ship_zip: null,
            ship_phone: null,
          })
          .in("id", storesWithOrders)
      );
    }
  }

  // Best-effort storage cleanup (uploaded images live under <uid>/...).
  try {
    const { data: files } = await supabaseAdmin.storage
      .from("product-images")
      .list(uid);
    if (files && files.length > 0) {
      await supabaseAdmin.storage
        .from("product-images")
        .remove(files.map((f) => `${uid}/${f.name}`));
    }
    log.push({ step: "storage cleanup", ok: true });
  } catch (e) {
    log.push({ step: "storage cleanup", ok: false, detail: e instanceof Error ? e.message : "error" });
  }

  // Remove the profile (fall back to tombstone if a reference blocks deletion).
  const { error: delProfErr } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", uid);
  if (delProfErr) {
    await run(log, "profile tombstone", () =>
      supabaseAdmin
        .from("profiles")
        .update({
          username: `deleted_${uid.slice(0, 8)}`,
          full_name: null,
          bio: null,
          location: null,
          website: null,
          deletion_scheduled_for: null,
        })
        .eq("id", uid)
    );
  } else {
    log.push({ step: "profile delete", ok: true });
  }

  // Finally remove the auth user (clears email + metadata).
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    log.push({ step: "auth user delete", ok: !error, detail: error?.message });
  } catch (e) {
    log.push({ step: "auth user delete", ok: false, detail: e instanceof Error ? e.message : "error" });
  }

  return log;
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lte("deletion_scheduled_for", now)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; steps: StepLog[] }[] = [];
  for (const row of due ?? []) {
    const id = (row as { id: string }).id;
    const steps = await purgeAccount(id);
    results.push({ id, steps });
  }

  return NextResponse.json({
    ran: true,
    processed: results.length,
    results,
  });
}
