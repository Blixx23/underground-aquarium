import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { CheckCircle2, AlertCircle } from "lucide-react";
import SetupButton from "./setup-button";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let status: "none" | "incomplete" | "active" = "none";

  if (user) {
    const { data: store } = await supabase
      .from("stores")
      .select("stripe_account_id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();

    if (store?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(store.stripe_account_id);
        status =
          account.details_submitted && account.payouts_enabled
            ? "active"
            : "incomplete";
      } catch {
        status = "incomplete";
      }
    }
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-md mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Payouts
        </p>
        <h1 className="font-display text-3xl text-white mb-3">
          {status === "active" ? "Payouts active" : "Set up payouts"}
        </h1>

        {status === "active" ? (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-300 mb-6">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                You&apos;re all set to receive payouts. When your items sell, your
                earnings will be deposited to your bank automatically.
              </p>
            </div>
            <SetupButton label="Update payout details" />
          </>
        ) : status === "incomplete" ? (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-300 mb-6">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Your payout setup isn&apos;t finished yet. Pick up where you left
                off to start receiving payments.
              </p>
            </div>
            <SetupButton label="Finish setup" />
          </>
        ) : (
          <>
            <p className="text-ocean-400 mb-8">
              Connect your bank through Stripe so you can get paid when your items
              sell. It only takes a couple of minutes.
            </p>
            <SetupButton label="Set up payouts" />
          </>
        )}
      </div>
    </main>
  );
}