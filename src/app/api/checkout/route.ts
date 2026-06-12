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
      .select("id, name, price, store_id, is_active")
      .eq("id", productId)
      .maybeSingle();
    if (!product || product.is_active === false) {
      return NextResponse.json({ error: "This item isn't available." }, { status: 404 });
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, owner_id, stripe_account_id")
      .eq("id", product.store_id)
      .maybeSingle();
    if (!store) {
      return NextResponse.json({ error: "Seller not found." }, { status: 404 });
    }

    // TEMPORARILY DISABLED FOR TESTING so you can buy your own listing.
    // Re-enable this block before launch.
    // if (store.owner_id === user.id) {
    //   return NextResponse.json({ error: "You can't buy your own listing." }, { status: 400 });
    // }

    if (!store.stripe_account_id) {
      return NextResponse.json(
        { error: "This seller hasn't set up payouts yet, so they can't accept payments." },
        { status: 400 }
      );
    }

    const amountTotal = Math.round(Number(product.price) * 100);
    const platformFee = Math.round(amountTotal * PLATFORM_FEE_PERCENT);
    if (!amountTotal || amountTotal < 50) {
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
      })
      .select("id")
      .single();
    if (orderError) throw new Error(orderError.message);

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountTotal,
            product_data: { name: product.name },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: platformFee,
        transfer_data: { destination: store.stripe_account_id },
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