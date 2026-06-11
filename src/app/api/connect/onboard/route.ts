import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    let store: { id: string; stripe_account_id: string | null };
    const { data: existing } = await supabase
      .from("stores")
      .select("id, stripe_account_id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      store = existing as { id: string; stripe_account_id: string | null };
    } else {
      const username =
        user.user_metadata?.username || user.email?.split("@")[0] || "seller";
      const storeSlug = `${slugify(username)}-${user.id.slice(0, 6)}`;
      const { data: newStore, error: createError } = await supabase
        .from("stores")
        .insert({ owner_id: user.id, name: `${username}'s Shop`, slug: storeSlug })
        .select("id, stripe_account_id")
        .single();
      if (createError) throw new Error(`Store: ${createError.message}`);
      store = newStore as { id: string; stripe_account_id: string | null };
    }

    let accountId = store.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        capabilities: { transfers: { requested: true } },
      });
      accountId = account.id;
      const { error: updateError } = await supabase
        .from("stores")
        .update({ stripe_account_id: accountId })
        .eq("id", store.id);
      if (updateError) throw new Error(`Save: ${updateError.message}`);
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/sell/payouts`,
      return_url: `${origin}/sell/payouts`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Onboard error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}