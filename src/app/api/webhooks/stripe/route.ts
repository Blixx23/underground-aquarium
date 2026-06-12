import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Resend } from "resend";
import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resend = new Resend(process.env.RESEND_API_KEY);

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

function formatAddress(s: ShippingDetails | null): string {
  if (!s || !s.address) return "No shipping address provided.";
  const a = s.address;
  const cityLine = [a.city, a.state, a.postal_code].filter(Boolean).join(", ");
  const lines = [a.line1, a.line2, cityLine, a.country].filter(Boolean);
  return [s.name, ...lines].filter(Boolean).join("<br>");
}

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
        .select("product_id, product_name, amount_total, store_id")
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

      const amount = (updatedOrder.amount_total / 100).toFixed(2);
      const productName = updatedOrder.product_name ?? "Item";

      // Email the seller that they made a sale.
      try {
        if (updatedOrder?.store_id) {
          const { data: store } = await supabaseAdmin
            .from("stores")
            .select("owner_id, name")
            .eq("id", updatedOrder.store_id)
            .maybeSingle();

          if (store?.owner_id) {
            const { data: ownerData } =
              await supabaseAdmin.auth.admin.getUserById(store.owner_id);
            const sellerEmail = ownerData?.user?.email;

            if (sellerEmail) {
              await resend.emails.send({
                from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
                to: sellerEmail,
                subject: `You sold ${productName}`,
                html: `
                  <h2>You made a sale</h2>
                  <p><strong>${productName}</strong> — $${amount}</p>
                  <p><strong>Ship to:</strong><br>${formatAddress(shipping)}</p>
                  <p>Log in to your shop to see the full order.</p>
                `,
              });
              console.log(`Sale email sent to seller ${sellerEmail}.`);
            }
          }
        }
      } catch (emailErr) {
        console.error("Seller email failed:", emailErr);
      }

      // Email the buyer a receipt.
      try {
        const buyerEmail = session.customer_details?.email;
        if (buyerEmail) {
          await resend.emails.send({
            from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
            to: buyerEmail,
            subject: "Your Underground Aquarium order",
            html: `
              <h2>Thanks for your order</h2>
              <p><strong>${productName}</strong> — $${amount}</p>
              <p>The seller has been notified and will ship your order soon.</p>
              <p>You can view your orders any time from your account.</p>
            `,
          });
          console.log(`Receipt email sent to buyer ${buyerEmail}.`);
        }
      } catch (emailErr) {
        console.error("Buyer email failed:", emailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}