import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CARRIERS } from "@/lib/shipping/carriers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { orderId, tracking, carrier } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing order." }, { status: 400 });
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, store_id, status")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", order.store_id)
      .maybeSingle();
    if (!store || store.owner_id !== user.id) {
      return NextResponse.json({ error: "Not your order." }, { status: 403 });
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: `This order is "${order.status}" and can't be marked shipped.` },
        { status: 400 }
      );
    }

    const cleanTracking =
      typeof tracking === "string" && tracking.trim() ? tracking.trim() : null;
    const validCarrier =
      typeof carrier === "string" && CARRIERS.some((c) => c.value === carrier)
        ? carrier
        : null;

    await supabaseAdmin
      .from("orders")
      .update({
        status: "shipped",
        shipped_at: new Date().toISOString(),
        tracking: cleanTracking,
        tracking_carrier: cleanTracking ? validCarrier : null,
      })
      .eq("id", order.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Ship error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}