import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { PLATFORM_FEE_PERCENT } from "@/lib/config";
import {
  RENEWAL_WINDOW_DAYS,
  daysUntilPaidThrough,
  renewalState,
  formatPaidThrough,
} from "@/lib/society/renewal";

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
        "id, slug, name, dues_amount_cents, lifetime_dues_amount_cents, stripe_account_id, payouts_enabled"
      )
      .eq("id", clubId)
      .maybeSingle();
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }
    const hasAnyDues =
      (club.dues_amount_cents ?? 0) > 0 ||
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
      .select("id, tier, paid_through, status")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();
    // Pending applicants can't pay yet: the webhook marks the payer
    // active, which would skip the officers' approval.
    if (!me || me.status === "pending") {
      return NextResponse.json(
        { error: "Apply to join first. Dues open up once you're approved." },
        { status: 400 }
      );
    }

    // Renewal opens in the last 30 days before the paid-through date (and
    // stays open after a lapse). Earlier than that, refuse, so nobody pays
    // for a year they didn't mean to buy yet. The webhook extends from the
    // current paid-through date, so paying inside the window loses no days.
    // Lifetime is a one-time upgrade, not a renewal, so the window doesn't
    // apply, unless a lifetime payment is already on file (paid through
    // decades from now), in which case there is nothing left to buy.
    const isLifetimeTier = me.tier === "lifetime";
    const yearsLeft = (daysUntilPaidThrough(me.paid_through) ?? 0) / 365;
    if (isLifetimeTier && yearsLeft > 50) {
      return NextResponse.json(
        { error: "Your lifetime membership is already paid. Nothing more to pay." },
        { status: 400 }
      );
    }
    if (!isLifetimeTier && renewalState(me.paid_through) === "current") {
      return NextResponse.json(
        {
          error: `You're paid through ${formatPaidThrough(
            me.paid_through as string
          )}. Renewal opens ${RENEWAL_WINDOW_DAYS} days before that date.`,
        },
        { status: 400 }
      );
    }

    // Charge the right amount for the member's plan. Family plans are
    // retired: anyone still marked "family" simply pays individual dues.
    //  - lifetime: a one-time payment that covers ~100 years (effectively forever)
    //  - everyone else: the standard dues
    const isLifetime = me.tier === "lifetime";

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
    } else {
      amount = club.dues_amount_cents;
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "This club has no dues for your membership type." },
        { status: 400 }
      );
    }
    // The platform takes nothing (PLATFORM_FEE_PERCENT is 0), so the fee is 0.
    // Stripe rejects application_fee_amount: 0 on a destination charge, so the
    // field has to be left off entirely rather than sent as a zero.
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
            name: `${club.name} ${productLabel}`,
          },
          },
        },
      ],
      payment_intent_data: {
        ...(fee > 0 ? { application_fee_amount: fee } : {}),
        transfer_data: { destination: club.stripe_account_id },
      },
      customer_email: user.email ?? undefined,
      metadata: {
        type: "club_dues",
        clubId: club.id,
        userId: user.id,
        memberId: me.id,
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
