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
    <section className="relative flex items-center justify-center pt-28 pb-16 sm:pt-36 sm:pb-20">
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

        <h1 className="font-display text-white leading-[1.1] mb-5 text-[clamp(1.85rem,7.5vw,4.6rem)] glow-text">
          The aquarium hobby,
          <br />
          <span className="text-ocean-300">all in one place</span>
        </h1>

        <p className="font-body text-base sm:text-lg md:text-xl text-ocean-300/85 max-w-xl mx-auto mb-8 leading-relaxed">
          Buy and sell locally, plan your tank, check your water, look up any
          species, and find people who care about this as much as you do.
        </p>

        <div className="mx-auto max-w-md sm:max-w-none">
          <Link
            href="/marketplace"
            className="group flex w-full items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-medium transition-all duration-300 hover:shadow-xl hover:shadow-ocean-600/30 hover:-translate-y-0.5 sm:inline-flex sm:w-auto"
          >
            Browse the classifieds
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Side by side on a phone, inline with the primary from sm up. */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-0 sm:inline-flex sm:gap-3 sm:ml-3 sm:align-top">
            <Link
              href={POST_AD_PATH}
              className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-ocean-900/70 border border-ocean-700/50 text-ocean-200 font-medium hover:text-white hover:border-ocean-500 transition-all duration-300 sm:px-7"
            >
              <Plus className="w-4 h-4 shrink-0" />
              Post ad
            </Link>

            {locatable.length > 0 && (
              <NearMeButton regions={locatable} className="w-full sm:w-auto" />
            )}
          </div>
        </div>

        <p className="mt-7 text-sm text-ocean-500">
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
