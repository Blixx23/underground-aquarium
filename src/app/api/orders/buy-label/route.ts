import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buyCheapestLabel, type LabelFormat } from "@/lib/shipping/shippo";
import { SHIPPING_LABEL_FEE_CENTS } from "@/lib/config";

type ShippingAddress = {
  name?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { orderId, weightOz, lengthIn, widthIn, heightIn, labelFormat } =
      await request.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing order." }, { status: 400 });
    }

    const w = Number(weightOz);
    const l = Number(lengthIn);
    const wd = Number(widthIn);
    const h = Number(heightIn);
    if (![w, l, wd, h].every((n) => Number.isFinite(n) && n > 0)) {
      return NextResponse.json(
        { error: "Enter a valid weight and box size." },
        { status: 400 }
      );
    }

    // Default to a clean 4x6 label; only "PDF" (full sheet) is the alternative.
    const fmt: LabelFormat = labelFormat === "PDF" ? "PDF" : "PDF_4x6";

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, store_id, status, shipping_address")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Only the seller who owns the store for this order can buy a label.
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select(
        "owner_id, ship_name, ship_street1, ship_street2, ship_city, ship_state, ship_zip, ship_country, ship_phone"
      )
      .eq("id", order.store_id)
      .maybeSingle();
    if (!store || store.owner_id !== user.id) {
      return NextResponse.json({ error: "Not your order." }, { status: 403 });
    }

    if (order.status !== "paid") {
      return NextResponse.json(
        { error: `This order is "${order.status}" and can't get a new label.` },
        { status: 400 }
      );
    }

    if (!store.ship_street1 || !store.ship_city || !store.ship_state || !store.ship_zip) {
      return NextResponse.json(
        { error: "Add your ship-from address first (under Sell → Shipping)." },
        { status: 400 }
      );
    }

    const ship = order.shipping_address as ShippingAddress | null;
    const to = ship?.address;
    if (!to?.line1 || !to.city || !to.state || !to.postal_code) {
      return NextResponse.json(
        { error: "This order doesn't have a valid shipping address." },
        { status: 400 }
      );
    }

    const label = await buyCheapestLabel(
      {
        name: store.ship_name,
        street1: store.ship_street1,
        street2: store.ship_street2,
        city: store.ship_city,
        state: store.ship_state,
        zip: store.ship_zip,
        country: store.ship_country ?? "US",
        phone: store.ship_phone,
      },
      {
        name: ship?.name ?? undefined,
        street1: to.line1,
        street2: to.line2,
        city: to.city,
        state: to.state,
        zip: to.postal_code,
        country: to.country ?? "US",
      },
      { weightOz: w, lengthIn: l, widthIn: wd, heightIn: h },
      fmt
    );

    await supabaseAdmin
      .from("orders")
      .update({
        status: "shipped",
        shipped_at: new Date().toISOString(),
        tracking: label.trackingNumber,
        tracking_carrier: label.carrier,
        shipping_label_cost: label.costCents,
        shipping_label_fee: SHIPPING_LABEL_FEE_CENTS,
        shipping_label_url: label.labelUrl,
      })
      .eq("id", order.id);

    return NextResponse.json({
      ok: true,
      trackingNumber: label.trackingNumber,
      labelUrl: label.labelUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Buy label error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
