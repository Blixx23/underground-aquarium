import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Resend } from "resend";
import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLATFORM_FEE_PERCENT } from "@/lib/config";

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

  // A connected account changed — keep our payout-readiness flag in sync, for
  // BOTH sellers (stores) and clubs. Fires when onboarding finishes
  // (enabled = true) or if Stripe later restricts the account (enabled = false).
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    const enabled = Boolean(
      account.details_submitted && account.payouts_enabled
    );

    const { error: storeErr } = await supabaseAdmin
      .from("stores")
      .update({ payouts_enabled: enabled })
      .eq("stripe_account_id", account.id);
    if (storeErr) {
      console.error("Failed to update store payouts_enabled:", storeErr.message);
    }

    const { error: clubErr } = await supabaseAdmin
      .from("clubs")
      .update({ payouts_enabled: enabled })
      .eq("stripe_account_id", account.id);
    if (clubErr) {
      console.error("Failed to update club payouts_enabled:", clubErr.message);
    }

    console.log(`Account ${account.id} payouts_enabled -> ${enabled}`);
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // --- Club membership dues ---
    if (session.metadata?.type === "club_dues") {
      const clubId = session.metadata.clubId || null;
      const userId = session.metadata.userId || null;
      const memberId = session.metadata.memberId || null;
      const coversMonths =
        parseInt(session.metadata.coversMonths || "12", 10) || 12;

      // Idempotency: if we already recorded this session, do nothing.
      const { data: existingPayment } = await supabaseAdmin
        .from("dues_payments")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();
      if (existingPayment) {
        return NextResponse.json({ received: true });
      }

      const amountTotal = session.amount_total ?? 0;
      const feeAmount = Math.round(amountTotal * PLATFORM_FEE_PERCENT);
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      // Anchor the renewal date: extend from the member's existing paid_through,
      // never from the payment date, so the renewal anniversary never drifts.
      // A late payer is simply "caught up" to the next anniversary with one
      // payment — they don't gain extra time.
      let existingPaidThrough: string | null = null;
      if (memberId) {
        const { data: memberRow } = await supabaseAdmin
          .from("club_members")
          .select("paid_through")
          .eq("id", memberId)
          .maybeSingle();
        existingPaidThrough = memberRow?.paid_through ?? null;
      } else if (clubId && userId) {
        const { data: memberRow } = await supabaseAdmin
          .from("club_members")
          .select("paid_through")
          .eq("club_id", clubId)
          .eq("user_id", userId)
          .maybeSingle();
        existingPaidThrough = memberRow?.paid_through ?? null;
      }

      const addMonths = (d: Date, months: number) => {
        const out = new Date(d);
        out.setMonth(out.getMonth() + months);
        return out;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let coversUntil: Date;
      if (!existingPaidThrough) {
        // First payment ever — set the anchor at today + one period.
        coversUntil = addMonths(today, coversMonths);
      } else {
        const anchor = new Date(existingPaidThrough + "T00:00:00");
        if (anchor >= today) {
          // Active (early or on-time): extend one period from current expiry.
          coversUntil = addMonths(anchor, coversMonths);
        } else {
          // Lapsed: roll the anchor forward to the next anniversary just past
          // today. One payment catches them up; the date stays put, no bonus.
          coversUntil = new Date(anchor);
          while (coversUntil <= today) {
            coversUntil = addMonths(coversUntil, coversMonths);
          }
        }
      }
      const coversUntilStr = coversUntil.toISOString().slice(0, 10);

      // Snapshot identity so the ledger survives club/member deletion.
      let clubName: string | null = null;
      if (clubId) {
        const { data: clubRow } = await supabaseAdmin
          .from("clubs")
          .select("name")
          .eq("id", clubId)
          .maybeSingle();
        clubName = clubRow?.name ?? null;
      }
      const payerName = session.customer_details?.name ?? null;
      const payerEmail = session.customer_details?.email ?? null;

      const { error: dpErr } = await supabaseAdmin.from("dues_payments").insert({
        club_id: clubId,
        member_id: memberId,
        user_id: userId,
        amount_cents: amountTotal,
        platform_fee_cents: feeAmount,
        stripe_session_id: session.id,
        stripe_payment_intent: paymentIntent,
        covers_until: coversUntilStr,
        club_name: clubName,
        payer_name: payerName,
        payer_email: payerEmail,
      });
      if (dpErr) {
        console.error("Failed to record dues payment:", dpErr.message);
        return NextResponse.json({ error: dpErr.message }, { status: 500 });
      }

      // Advance the member's coverage and mark them active.
      if (memberId) {
        await supabaseAdmin
          .from("club_members")
          .update({ status: "active", paid_through: coversUntilStr })
          .eq("id", memberId);
      } else if (clubId && userId) {
        await supabaseAdmin
          .from("club_members")
          .update({ status: "active", paid_through: coversUntilStr })
          .eq("club_id", clubId)
          .eq("user_id", userId);
      }

      // Receipt email to the payer.
      const resend = process.env.RESEND_API_KEY
        ? new Resend(process.env.RESEND_API_KEY)
        : null;
      if (resend && payerEmail) {
        const amountStr = (amountTotal / 100).toFixed(2);
        const coversLabel = new Date(
          coversUntilStr + "T00:00:00"
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        try {
          await resend.emails.send({
            from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
            to: payerEmail,
            subject: `Your ${clubName ?? "club"} dues receipt`,
            html: `<p>Thanks${
              payerName ? `, ${payerName}` : ""
            }! Your payment to <strong>${
              clubName ?? "your club"
            }</strong> was received.</p>
<p><strong>Amount:</strong> $${amountStr}<br>
<strong>Membership active through:</strong> ${coversLabel}</p>
<p>Keep this email as your receipt.</p>`,
          });
        } catch (e) {
          console.error("Dues receipt email failed:", e);
        }
      }

      console.log(
        `Club dues recorded: club ${clubId}, member ${memberId}, paid through ${coversUntilStr}.`
      );
      return NextResponse.json({ received: true });
    }

    // --- Marketplace order ---
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

      // Create the email client only if a key is configured (keeps builds safe).
      const resend = process.env.RESEND_API_KEY
        ? new Resend(process.env.RESEND_API_KEY)
        : null;

      // Email the seller that they made a sale.
      try {
        if (resend && updatedOrder?.store_id) {
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
        if (resend && buyerEmail) {
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
