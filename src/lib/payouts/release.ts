import { stripe } from "@/lib/stripe/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ReleaseResult =
  | { ok: true; status: "released" | "already_released" }
  | { ok: false; reason: string };

/**
 * Pays a seller for an order: transfers their share from your platform balance
 * to their connected account.
 *
 * Seller's share = order total
 *                  − platform commission
 *                  − the carrier label cost (reimburses what you paid the carrier)
 *                  − your flat label fee (your profit).
 *
 * Safe to call more than once for the same order — it skips orders that are
 * already released, and the Stripe transfer uses an idempotency key, so even
 * a race between the buyer's button and the cron can't create two payouts.
 *
 * Only releases orders that are "paid" (held) or "shipped". It will NOT touch
 * pending, refunded, or cancelled orders.
 */
export async function releaseOrderPayout(orderId: string): Promise<ReleaseResult> {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, status, amount_total, platform_fee, shipping_label_cost, shipping_label_fee, seller_stripe_account_id, stripe_payment_intent, transfer_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error) return { ok: false, reason: error.message };
  if (!order) return { ok: false, reason: "Order not found." };

  // Already paid out — nothing to do.
  if (order.status === "released" || order.transfer_id) {
    return { ok: true, status: "already_released" };
  }

  // Only release money being held for a real, paid sale.
  if (order.status !== "paid" && order.status !== "shipped") {
    return { ok: false, reason: `Order is "${order.status}", not releasable.` };
  }

  if (!order.seller_stripe_account_id) {
    return { ok: false, reason: "No seller payout account on this order." };
  }
  if (!order.stripe_payment_intent) {
    return { ok: false, reason: "No payment on this order." };
  }

  // Seller keeps the total minus our commission, minus the shipping label cost
  // and your flat label fee (both 0 if no label was bought through us).
  const sellerAmount =
    order.amount_total -
    order.platform_fee -
    (order.shipping_label_cost ?? 0) -
    (order.shipping_label_fee ?? 0);
  if (sellerAmount <= 0) {
    return { ok: false, reason: "Nothing to pay out." };
  }

  // Find the original charge so we can tie the payout to it — this lets the
  // transfer go through even if the funds haven't fully settled yet.
  const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent);
  const chargeId =
    typeof pi.latest_charge === "string"
      ? pi.latest_charge
      : pi.latest_charge?.id ?? null;
  if (!chargeId) {
    return { ok: false, reason: "Could not find the charge for this order." };
  }

  // Idempotency key: even if this runs twice at once, Stripe makes ONE payout.
  const transfer = await stripe.transfers.create(
    {
      amount: sellerAmount,
      currency: "usd",
      destination: order.seller_stripe_account_id,
      source_transaction: chargeId,
      transfer_group: order.id,
      metadata: { order_id: order.id },
    },
    { idempotencyKey: `release_${order.id}` }
  );

  await supabaseAdmin
    .from("orders")
    .update({
      status: "released",
      released_at: new Date().toISOString(),
      transfer_id: transfer.id,
    })
    .eq("id", order.id);

  return { ok: true, status: "released" };
}
