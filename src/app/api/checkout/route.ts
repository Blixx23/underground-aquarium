import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { PLATFORM_FEE_PERCENT } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to buy." }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "Missing product." }, { status: 400 });
    }

    const { data: product } = await supabase
      .from("products")
      .select("id, name, price, shipping_price, store_id, is_active")
      .eq("id", productId)
      .maybeSingle();
    if (!product || product.is_active === false) {
      return NextResponse.json({ error: "This item isn't available." }, { status: 404 });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, owner_id, stripe_account_id, payouts_enabled")
      .eq("id", product.store_id)
      .maybeSingle();
    if (!store) {
      return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    }

    // Sellers can't buy their own listings.
    if (store.owner_id === user.id) {
      return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });
    }

    // Seller must have a connected account AND have finished payout setup,
    // so we know the money can actually reach them at release time.
    if (!store.stripe_account_id || !store.payouts_enabled) {
      return NextResponse.json(
        { error: "This seller hasn't finished setting up payouts yet, so they can't accept payments." },
        { status: 400 }
      );
    }

    // Buyer pays item + shipping. The 5% platform fee is on the ITEM only —
    // your shipping revenue comes from the flat label fee at ship time, so we
    // don't take a cut of shipping here. The shipping amount flows through to
    // the seller (it funds the label they'll buy).
    const itemCents = Math.round(Number(product.price) * 100);
    const shippingCents = Math.round(Number(product.shipping_price ?? 0) * 100);
    const amountTotal = itemCents + shippingCents;
    const platformFee = Math.round(itemCents * PLATFORM_FEE_PERCENT);
    if (!itemCents || itemCents < 50) {
      return NextResponse.json({ error: "This item's price is too low to sell online." }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        product_id: product.id,
        product_name: product.name,
        store_id: store.id,
        amount_total: amountTotal,
        platform_fee: platformFee,
        seller_stripe_account_id: store.stripe_account_id,
      })
      .select("id")
      .single();
    if (orderError) throw new Error(orderError.message);

    // Show the item and (if any) shipping as separate lines at checkout.
    // tax_behavior "exclusive" = sales tax is added on top (US norm).
    const lineItems: Array<{
      quantity: number;
      price_data: {
        currency: string;
        unit_amount: number;
        tax_behavior: "exclusive";
        product_data: { name: string };
      };
    }> = [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: itemCents,
          tax_behavior: "exclusive",
          product_data: { name: product.name },
        },
      },
    ];
    if (shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: shippingCents,
          tax_behavior: "exclusive",
          product_data: { name: "Shipping" },
        },
      });
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      line_items: lineItems,
      // Stripe Tax calculates sales tax on YOUR CA registration. Because the
      // charge lands in the platform balance (hold-and-release), the collected
      // tax stays here for you to remit — it is not routed to the seller.
      automatic_tax: { enabled: true },
      payment_intent_data: {
        // Hold-and-release: this charge lands in YOUR platform balance.
        // No transfer happens now — the seller is paid later, after the
        // buyer confirms receipt or the auto-release window passes.
        // transfer_group ties this charge to its future payout.
        transfer_group: order.id,
      },
      metadata: { order_id: order.id },
      success_url: `${origin}/checkout/success?order=${order.id}`,
      cancel_url: `${origin}/marketplace`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
