import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { POST_AD_PATH } from "@/lib/config";
import NearMeButton, {
  type LocatableRegion,
} from "@/components/marketplace/NearMeButton";

export default function Hero({
  locatable,
  liveListings,
}: {
  locatable: LocatableRegion[];
  liveListings: number;
}) {
  return (
    <section className="relative flex items-center justify-center pt-36 pb-20">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-full h-[420px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(18,100,160,0.22) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <p className="inline-block text-[11px] font-mono tracking-[0.25em] text-ocean-400 uppercase border border-ocean-700/50 rounded-full px-4 py-1.5 mb-8">
          Free · No fees · No commission
        </p>

        <h1 className="font-display text-white leading-[1.08] mb-6 text-[clamp(2.3rem,6.5vw,4.6rem)] glow-text">
          The aquarium hobby,
          <br />
          <span className="text-ocean-300">all in one place</span>
        </h1>

        <p className="font-body text-lg md:text-xl text-ocean-300/85 max-w-xl mx-auto mb-10 leading-relaxed">
          Buy and sell locally, plan your tank, diagnose your water, look up any
          species, find your club, and argue about substrate with people who
          care as much as you do.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/marketplace"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-medium transition-all duration-300 hover:shadow-xl hover:shadow-ocean-600/30 hover:-translate-y-0.5"
          >
            Browse the classifieds
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href={POST_AD_PATH}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-ocean-900/70 border border-ocean-700/50 text-ocean-200 font-medium hover:text-white hover:border-ocean-500 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Post free ad
          </Link>
        </div>

        {locatable.length > 0 && (
          <div className="mt-5 flex justify-center">
            <NearMeButton regions={locatable} />
          </div>
        )}

        <p className="mt-8 text-sm text-ocean-500">
          {liveListings > 0
            ? `${liveListings.toLocaleString()} live ${
                liveListings === 1 ? "listing" : "listings"
              } · 413 metro areas · free to post, always`
            : "413 metro areas · free to post, always"}
        </p>
      </div>
    </section>
  );
}
