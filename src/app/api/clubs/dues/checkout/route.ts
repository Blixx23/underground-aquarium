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
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const { clubId } = await request.json();
    if (!clubId) {
      return NextResponse.json({ error: "Missing club." }, { status: 400 });
    }

    const { data: club } = await supabase
      .from("clubs")
      .select(
        "id, slug, name, dues_amount_cents, family_dues_amount_cents, lifetime_dues_amount_cents, stripe_account_id, payouts_enabled"
      )
      .eq("id", clubId)
      .maybeSingle();
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }
    const hasAnyDues =
      (club.dues_amount_cents ?? 0) > 0 ||
      (club.family_dues_amount_cents ?? 0) > 0 ||
      (club.lifetime_dues_amount_cents ?? 0) > 0;
    if (!hasAnyDues) {
      return NextResponse.json({ error: "This club has no dues." }, { status: 400 });
    }
    if (!club.stripe_account_id || !club.payouts_enabled) {
      return NextResponse.json(
        { error: "This club isn't set up to collect dues yet." },
        { status: 400 }
      );
    }

    // The member's row, so the webhook can advance the right person.
    const { data: me } = await supabase
      .from("club_members")
      .select("id, tier, family_primary_id")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Family members are covered by the main member's payment — they don't pay.
    if (me?.family_primary_id) {
      return NextResponse.json(
        { error: "Your dues are covered by your family membership." },
        { status: 400 }
      );
    }

    // Charge the right amount for the member's plan.
    //  - lifetime: a one-time payment that covers ~100 years (effectively forever)
    //  - family (main member): the club's family rate
    //  - everyone else: the standard dues
    const isLifetime = me?.tier === "lifetime";
    const isFamily =
      me?.tier === "family" &&
      !me?.family_primary_id &&
      (club.family_dues_amount_cents ?? 0) > 0;

    let amount: number;
    let coversMonths = "12";
    let productLabel = "membership dues";
    if (isLifetime) {
      if ((club.lifetime_dues_amount_cents ?? 0) <= 0) {
        return NextResponse.json(
          { error: "This club hasn't set a lifetime membership rate yet." },
          { status: 400 }
        );
      }
      amount = club.lifetime_dues_amount_cents as number;
      coversMonths = "1200"; // ~100 years
      productLabel = "lifetime membership";
    } else if (isFamily) {
      amount = club.family_dues_amount_cents as number;
      productLabel = "family membership dues";
    } else {
      amount = club.dues_amount_cents;
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "This club has no dues for your membership type." },
        { status: 400 }
      );
    }
    const fee = Math.round(amount * PLATFORM_FEE_PERCENT);
    const origin = request.headers.get("origin") ?? new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
            name: `${club.name} — ${productLabel}`,
          },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: club.stripe_account_id },
      },
      customer_email: user.email ?? undefined,
      metadata: {
        type: "club_dues",
        clubId: club.id,
        userId: user.id,
        memberId: me?.id ?? "",
        coversMonths,
      },
      success_url: `${origin}/c/${club.slug}?dues=success`,
      cancel_url: `${origin}/c/${club.slug}?dues=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Dues checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
