import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { releaseOrderPayout } from "@/lib/payouts/release";
import { PAYOUT_AUTO_RELEASE_DAYS } from "@/lib/config";

export async function GET(request: Request) {
  // Only Vercel Cron (or someone with the secret) may run this.
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Orders shipped at/before this moment are past the window and due to pay out.
  const cutoff = new Date(
    Date.now() - PAYOUT_AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: dueOrders, error } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("status", "shipped")
    .lte("shipped_at", cutoff);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { orderId: string; ok: boolean; detail: string }[] = [];
  for (const order of dueOrders ?? []) {
    try {
      const r = await releaseOrderPayout(order.id);
      results.push({
        orderId: order.id,
        ok: r.ok,
        detail: r.ok ? r.status : r.reason,
      });
    } catch (err) {
      results.push({
        orderId: order.id,
        ok: false,
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    ran: true,
    windowDays: PAYOUT_AUTO_RELEASE_DAYS,
    released: results.filter((r) => r.ok).length,
    total: results.length,
    results,
  });
}