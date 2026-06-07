import Link from "next/link";
import { UserPlus, Package, DollarSign, ArrowRight } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: UserPlus,
    title: "Create Your Shop",
    desc: "Sign up in minutes — free, no coding required, no monthly fees. Your storefront is live immediately.",
  },
  {
    num: "02",
    icon: Package,
    title: "List Your Products",
    desc: "Upload photos, set prices, and describe what makes your fish, plants, or gear special. We handle the rest.",
  },
  {
    num: "03",
    icon: DollarSign,
    title: "Get Paid",
    desc: "Orders come in, you ship, and we pay out directly. Just a 10% commission on completed sales — nothing else.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ocean-900 via-ocean-950 to-brine-900/30" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ocean-600/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ocean-600/40 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <p className="text-xs font-mono tracking-[0.25em] text-brine-400 uppercase mb-4">
              For Sellers
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-6">
              Turn Your Passion
              <br />
              <span className="text-brine-300">Into Profit</span>
            </h2>
            <p className="text-ocean-400 text-lg leading-relaxed mb-8">
              Most of our sellers started as hobbyists. If you breed fish, grow plants, or make aquarium gear — there's a buyer here waiting for exactly what you offer.
            </p>
            <Link
              href="/sell"
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-brine-700 hover:bg-brine-600 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-xl hover:shadow-brine-700/30 hover:-translate-y-0.5"
            >
              Open Your Shop Today
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="group flex gap-5 p-6 rounded-2xl bg-ocean-900/50 border border-ocean-800/50 hover:border-brine-600/40 transition-all duration-300 hover:bg-ocean-800/50"
              >
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-brine-900/60 border border-brine-700/40 flex items-center justify-center group-hover:border-brine-500/60 transition-all">
                    <step.icon className="w-5 h-5 text-brine-400" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px h-8 bg-gradient-to-b from-brine-700/40 to-transparent" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-mono text-brine-600">{step.num}</span>
                    <h3 className="font-display text-lg text-white">{step.title}</h3>
                  </div>
                  <p className="text-ocean-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
