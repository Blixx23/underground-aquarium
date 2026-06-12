import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ShippingDetails = {
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
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature check failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;

    const shipping =
      (session as unknown as {
        collected_information?: { shipping_details?: ShippingDetails | null } | null;
      }).collected_information?.shipping_details ??
      (session as unknown as { shipping_details?: ShippingDetails | null })
        .shipping_details ??
      null;

    if (orderId) {
      const { data: updatedOrder, error } = await supabaseAdmin
        .from("orders")
        .update({
          status: "paid",
          stripe_session_id: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          shipping_address: shipping,
        })
        .eq("id", orderId)
        .select("product_id")
        .single();

      if (error) {
        console.error("Failed to mark order paid:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log(`Order ${orderId} marked paid.`);

      // Decrement stock on the sold product (never below 0).
      if (updatedOrder?.product_id) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("stock")
          .eq("id", updatedOrder.product_id)
          .maybeSingle();

        if (product && typeof product.stock === "number") {
          const newStock = Math.max(0, product.stock - 1);
          await supabaseAdmin
            .from("products")
            .update({ stock: newStock })
            .eq("id", updatedOrder.product_id);
          console.log(
            `Product ${updatedOrder.product_id} stock: ${product.stock} -> ${newStock}`
          );
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}