import Link from "next/link";
import { ArrowRight, Fish } from "lucide-react";

export default function CTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-ocean-800 via-ocean-900 to-ocean-950" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-ocean-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Decorative lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px w-[200%] -left-1/2 bg-gradient-to-r from-transparent via-ocean-400 to-transparent"
            style={{ top: `${10 + i * 12}%`, transform: `rotate(-${2 + i * 0.5}deg)` }}
          />
        ))}
      </div>

      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ocean-700/40 border border-ocean-500/30 backdrop-blur-sm mb-8">
          <Fish className="w-3.5 h-3.5 text-ocean-300" />
          <span className="text-xs font-mono tracking-[0.2em] text-ocean-300 uppercase">
            Join the Community
          </span>
        </div>

        <h2 className="font-display text-4xl md:text-6xl text-white glow-text mb-6">
          Your Tank.{" "}
          <span className="text-ocean-300">Your Rules.</span>
          <br />
          Your Community.
        </h2>

        <p className="text-ocean-300/80 text-xl max-w-2xl mx-auto leading-relaxed mb-12">
          This is where the hobby&apos;s getting organized. Browse the marketplace, share your setups, learn from fellow keepers, and find your fish tribe.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="group inline-flex items-center justify-center gap-3 px-9 py-4 bg-white text-ocean-900 rounded-2xl font-medium text-lg hover:bg-ocean-50 transition-all duration-300 hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5"
          >
            Join Free Today
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/marketplace"
            className="group inline-flex items-center justify-center gap-3 px-9 py-4 bg-transparent border border-ocean-500/50 text-ocean-200 rounded-2xl font-medium text-lg hover:bg-ocean-800/60 hover:border-ocean-400/70 transition-all duration-300 hover:-translate-y-0.5"
          >
            Browse First
          </Link>
        </div>

        {/* Trust note */}
        <p className="mt-10 text-xs font-mono text-ocean-600 tracking-wider">
          Free to join · No credit card required · Open a shop whenever you&apos;re ready
        </p>
      </div>
    </section>
  );
}
