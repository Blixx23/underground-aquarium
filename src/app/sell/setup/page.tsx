import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  Wallet,
  Package,
  Truck,
  ArrowRight,
  PartyPopper,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import SellerTabs from "../SellerTabs";

export const dynamic = "force-dynamic";

export default async function SellerSetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select(
      "id, slug, stripe_account_id, ship_street1, ship_city, ship_state, ship_zip"
    )
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  // Payouts: live status from Stripe, matching what checkout enforces
  let payoutStatus: "none" | "incomplete" | "active" = "none";
  if (store?.stripe_account_id) {
    try {
      const account = await stripe.accounts.retrieve(store.stripe_account_id);
      payoutStatus =
        account.details_submitted && account.payouts_enabled
          ? "active"
          : "incomplete";
    } catch {
      payoutStatus = "incomplete";
    }
  }
  const payoutsDone = payoutStatus === "active";

  // At least one non-draft listing
  let listingCount = 0;
  if (store) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id)
      .eq("is_draft", false);
    listingCount = count ?? 0;
  }
  const listingDone = listingCount > 0;

  // Ship-from address present
  const shipDone = !!(
    store?.ship_street1 &&
    store?.ship_city &&
    store?.ship_state &&
    store?.ship_zip
  );

  const steps = [
    {
      key: "payouts",
      Icon: Wallet,
      title: "Connect payouts",
      desc: "Link your bank through Stripe so buyers can pay you. This is required before anyone can purchase your listings.",
      done: payoutsDone,
      sublabel:
        payoutStatus === "incomplete"
          ? "In progress — pick up where you left off"
          : null,
      ctaLabel:
        payoutStatus === "incomplete" ? "Finish setup" : "Connect payouts",
      ctaHref: "/sell/payouts",
    },
    {
      key: "listing",
      Icon: Package,
      title: "Add your first listing",
      desc: "Create at least one listing so there's something in your shop for buyers to find.",
      done: listingDone,
      sublabel: listingDone
        ? `${listingCount} listing${listingCount === 1 ? "" : "s"} published`
        : null,
      ctaLabel: "Create a listing",
      ctaHref: "/sell",
    },
    {
      key: "shipping",
      Icon: Truck,
      title: "Add your ship-from address",
      desc: "Where your orders ship from. We use it to generate shipping labels when an item sells.",
      done: shipDone,
      sublabel: null,
      ctaLabel: "Add address",
      ctaHref: "/sell/shipping",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <SellerTabs />

        <h1 className="font-display text-3xl text-white mb-2">
          {allDone ? "You're all set up" : "Set up your shop"}
        </h1>
        <p className="text-ocean-400 mb-6">
          {allDone
            ? "Everything's in place. Buyers can purchase your listings and you'll be paid out automatically."
            : "A few quick steps and your shop will be open for business."}
        </p>

        {allDone ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-emerald-200 mb-6">
            <PartyPopper className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-100">
                Your shop is open for business.
              </p>
              {store?.slug && (
                <Link
                  href={`/shop/${store.slug}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-300 hover:text-emerald-200"
                >
                  <Store className="w-4 h-4" /> View your storefront
                </Link>
              )}
            </div>
          </div>
        ) : !payoutsDone ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-200 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>
              <span className="font-medium text-amber-100">
                Your listings can&apos;t be purchased yet.
              </span>{" "}
              Connect payouts below so buyers can check out and you can get
              paid.
            </p>
          </div>
        ) : null}

        {!allDone && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-ocean-400 mb-1.5">
              <span>
                {doneCount} of {steps.length} complete
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-ocean-800/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          {steps.map((step, i) => {
            const isCurrent = !step.done && i === currentIndex;
            return (
              <div
                key={step.key}
                className={`rounded-2xl border px-5 py-4 transition-colors ${
                  isCurrent
                    ? "border-ocean-600/70 bg-ocean-900/60"
                    : "border-ocean-800/60 bg-ocean-900/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    {step.done ? (
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    ) : (
                      <div
                        className={`grid h-7 w-7 place-items-center rounded-full border text-sm font-semibold ${
                          isCurrent
                            ? "border-ocean-500 bg-ocean-700 text-white"
                            : "border-ocean-700 text-ocean-400"
                        }`}
                      >
                        {i + 1}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <step.Icon
                        className={`w-4 h-4 shrink-0 ${
                          step.done ? "text-emerald-400" : "text-ocean-300"
                        }`}
                      />
                      <p
                        className={`font-medium ${
                          step.done || isCurrent
                            ? "text-white"
                            : "text-ocean-200"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-ocean-400">{step.desc}</p>
                    {step.sublabel && (
                      <p
                        className={`mt-1.5 text-xs ${
                          step.done ? "text-emerald-300" : "text-amber-300"
                        }`}
                      >
                        {step.sublabel}
                      </p>
                    )}

                    <div className="mt-3">
                      {step.done ? (
                        <Link
                          href={step.ctaHref}
                          className="inline-flex items-center gap-1 text-sm text-ocean-400 hover:text-ocean-200 transition-colors"
                        >
                          Manage <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href={step.ctaHref}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                            isCurrent
                              ? "bg-ocean-700 text-white hover:bg-ocean-600"
                              : "border border-ocean-700/70 text-ocean-200 hover:border-ocean-600 hover:text-white"
                          }`}
                        >
                          {step.ctaLabel}
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
