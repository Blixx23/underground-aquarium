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
    <section className="relative flex items-center justify-center pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] max-w-full h-[440px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse, rgba(18,100,160,0.22) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
        <p className="inline-block text-[11px] font-mono tracking-[0.25em] text-ocean-400 uppercase border border-ocean-700/50 rounded-full px-4 py-1.5 mb-8">
          Free · No fees · No commission
        </p>

        {/*
          The clamp tops out well below the container width so the headline
          breaks where it's written to break — after "hobby," — instead of
          wrapping mid-phrase on a laptop.
        */}
        <h1 className="font-display text-white leading-[1.12] mb-5 text-[clamp(1.85rem,5vw,3.5rem)] glow-text">
          The aquarium hobby,
          <br />
          <span className="text-ocean-300">all in one place</span>
        </h1>

        <p className="font-body text-base sm:text-lg md:text-xl text-ocean-300/85 max-w-2xl mx-auto mb-9 leading-relaxed">
          Buy and sell locally, plan your tank, check your water, look up any
          species, and find people who care about this as much as you do.
        </p>

        {/*
          Two columns on a phone with the primary spanning both, a single
          centred row from sm up. No nesting, so nothing can drift out of
          alignment at any width.
        */}
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:flex sm:max-w-none sm:flex-wrap sm:items-start sm:justify-center">
          <Link
            href="/marketplace"
            className="group col-span-2 inline-flex items-center justify-center gap-2.5 rounded-xl bg-ocean-600 px-7 py-3.5 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-ocean-500 hover:shadow-xl hover:shadow-ocean-600/30 sm:col-span-1"
          >
            Browse the classifieds
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href={POST_AD_PATH}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-ocean-700/50 bg-ocean-900/70 px-4 py-3.5 font-medium text-ocean-200 transition-all duration-300 hover:border-ocean-500 hover:text-white sm:px-7"
          >
            <Plus className="h-4 w-4 shrink-0" />
            Post ad
          </Link>

          {locatable.length > 0 && (
            <NearMeButton regions={locatable} className="w-full sm:w-auto" />
          )}
        </div>

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
