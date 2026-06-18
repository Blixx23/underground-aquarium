import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { clubId } = await request.json();
    if (!clubId) {
      return NextResponse.json({ error: "Missing club." }, { status: 400 });
    }

    // Only the club's owner or admin can set up dues collection.
    const { data: me } = await supabase
      .from("club_members")
      .select("role")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!me || !["owner", "admin"].includes(me.role)) {
      return NextResponse.json(
        { error: "Only club owners and admins can set up dues." },
        { status: 403 }
      );
    }

    const { data: club } = await supabase
      .from("clubs")
      .select("id, slug, name, stripe_account_id")
      .eq("id", clubId)
      .maybeSingle();
    if (!club) {
      return NextResponse.json({ error: "Club not found." }, { status: 404 });
    }

    let accountId = club.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
        business_profile: { name: club.name },
      });
      accountId = account.id;
      const { error: updErr } = await supabase
        .from("clubs")
        .update({ stripe_account_id: accountId })
        .eq("id", club.id);
      if (updErr) throw new Error(`Save: ${updErr.message}`);
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/c/${club.slug}/admin`,
      return_url: `${origin}/c/${club.slug}/admin`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Club connect error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
