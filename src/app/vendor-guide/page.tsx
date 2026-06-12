import Link from "next/link";
import {
  Store,
  Camera,
  DollarSign,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Wallet,
  Clock,
  MessageCircle,
} from "lucide-react";

export const metadata = {
  title: "Vendor Guide — UndergroundAquarium",
  description:
    "Everything you need to start selling fish, plants, and gear on UndergroundAquarium — from your first listing to your first payout.",
};

// --- Edit your content here ---------------------------------------------

const steps = [
  {
    icon: Store,
    title: "Open your shop",
    body: "Sign up and create your storefront in minutes. It's free, with no monthly fees and no code required.",
  },
  {
    icon: Camera,
    title: "List your products",
    body: "Add clear photos, honest descriptions, and a fair price for your fish, plants, or gear.",
  },
  {
    icon: DollarSign,
    title: "Make a sale",
    body: "Buyers check out securely on-site. You're notified instantly with the order and shipping details.",
  },
  {
    icon: Truck,
    title: "Ship & get paid",
    body: "Pack it with care, ship it out, and your earnings are paid out automatically — minus our 5% commission.",
  },
];

const listingTips = [
  {
    icon: Camera,
    title: "Photos do the selling",
    body: "Use natural light and show the actual animal or plant — not a stock photo. A short clip of fish swimming builds huge trust.",
  },
  {
    icon: CheckCircle2,
    title: "Be honest and specific",
    body: "List size, age, sex (if known), and any quirks. Accurate listings mean happy buyers and far fewer disputes.",
  },
  {
    icon: DollarSign,
    title: "Price it fairly",
    body: "Factor in your time, livestock cost, and the 5% commission. Competitive, honest pricing wins repeat buyers.",
  },
  {
    icon: MessageCircle,
    title: "Reply quickly",
    body: "Fast, friendly answers turn browsers into buyers. Hobbyists love sellers who clearly know their stuff.",
  },
];

const shippingTips = [
  "Ship live animals early in the week (Mon–Wed) so they're never stuck in a depot over the weekend.",
  "Use insulated boxes with heat or cold packs to match the season and the species' needs.",
  "Double-bag livestock in breathable fish bags with plenty of air, and cushion against movement.",
  "Always use a tracked, expedited service and share the tracking number with your buyer.",
  "State your live-arrival / DOA policy clearly in every listing so expectations are set up front.",
];

const faqs = [
  {
    q: "How much does it cost to sell?",
    a: "Nothing to join, and no monthly fees. We take a flat 5% commission only when you make a sale.",
  },
  {
    q: "When do I get paid?",
    a: "Your earnings are paid out automatically through our secure payments partner once an order is completed, straight to the bank account linked to your shop.",
  },
  {
    q: "What can I sell?",
    a: "Healthy livestock you've bred or raised, aquatic plants, equipment, and aquarium decor or 3D-printed gear. If it serves the hobby, it likely has a home here.",
  },
  {
    q: "Who handles shipping?",
    a: "You do — which means you control packaging and timing. We pass you the buyer's shipping details at checkout so you can get the order out fast.",
  },
];

// ------------------------------------------------------------------------

export default function VendorGuidePage() {
  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-4">
            For Sellers
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-white mb-5 leading-tight">
            Turn your tank into a storefront
          </h1>
          <p className="text-ocean-200 text-lg mb-8">
            Most of our sellers started exactly where you are — as hobbyists.
            This guide walks you through everything from your first listing to
            your first payout.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors"
            >
              Open your shop <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-white font-medium hover:bg-white/5 transition-colors"
            >
              Browse the marketplace
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: "Free", label: "to join" },
            { value: "5%", label: "commission per sale" },
            { value: "Fast", label: "automatic payouts" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center"
            >
              <div className="font-display text-3xl text-emerald-400">
                {stat.value}
              </div>
              <div className="text-ocean-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="mt-20">
          <h2 className="font-display text-2xl sm:text-3xl text-white mb-8">
            How selling works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="rounded-2xl bg-white/5 border border-white/10 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="font-display text-ocean-400 text-lg">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-white font-medium text-lg mb-1">
                    {step.title}
                  </h3>
                  <p className="text-ocean-400 text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Listing tips */}
        <section className="mt-20">
          <h2 className="font-display text-2xl sm:text-3xl text-white mb-2">
            Make listings that sell
          </h2>
          <p className="text-ocean-400 mb-8 max-w-2xl">
            A great listing is the difference between a quick sale and a stale
            one. A few habits go a long way.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listingTips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div
                  key={tip.title}
                  className="rounded-2xl bg-white/5 border border-white/10 p-6 flex gap-4"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-medium mb-1">{tip.title}</h3>
                    <p className="text-ocean-400 text-sm leading-relaxed">
                      {tip.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Shipping live arrivals */}
        <section className="mt-20">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl text-white">
                Shipping live arrivals
              </h2>
            </div>
            <p className="text-ocean-200 mb-6 max-w-2xl">
              Safely shipping fish and plants is what separates great sellers
              from the rest. Treat every package like the animal's life depends
              on it — because it does.
            </p>
            <ul className="space-y-3">
              {shippingTips.map((tip) => (
                <li key={tip} className="flex gap-3 text-ocean-200">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Fees & payouts */}
        <section className="mt-20">
          <h2 className="font-display text-2xl sm:text-3xl text-white mb-8">
            Fees &amp; payouts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">
                Simple 5% commission
              </h3>
              <p className="text-ocean-400 text-sm leading-relaxed mb-4">
                We only earn when you do. No listing fees, no monthly costs —
                just a flat 5% on completed sales.
              </p>
              <div className="rounded-xl bg-black/20 border border-white/10 p-4 text-sm">
                <div className="flex justify-between text-ocean-200">
                  <span>You list a plant for</span>
                  <span className="text-white">$40.00</span>
                </div>
                <div className="flex justify-between text-ocean-400 mt-1">
                  <span>Commission (5%)</span>
                  <span>– $2.00</span>
                </div>
                <div className="flex justify-between text-white font-medium mt-2 pt-2 border-t border-white/10">
                  <span>You keep</span>
                  <span className="text-emerald-400">$38.00</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-medium text-lg mb-2">
                Getting paid
              </h3>
              <p className="text-ocean-400 text-sm leading-relaxed">
                Payments are processed securely at checkout, and your earnings
                are paid out automatically to the bank account linked to your
                shop. No invoicing, no chasing — you ship, you get paid.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="font-display text-2xl sm:text-3xl text-white mb-8">
            Seller FAQ
          </h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl bg-white/5 border border-white/10 p-6"
              >
                <h3 className="text-white font-medium mb-2">{faq.q}</h3>
                <p className="text-ocean-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-10 text-center">
            <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
            <h2 className="font-display text-3xl text-white mb-3">
              Ready to open your shop?
            </h2>
            <p className="text-ocean-200 mb-8 max-w-xl mx-auto">
              Your storefront goes live the moment you create it. List your
              first fish, plant, or piece of gear today.
            </p>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors"
            >
              Open your shop <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}