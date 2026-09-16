import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { POST_AD_PATH } from "@/lib/config";
import NearMeButton, {
  type LocatableRegion,
} from "@/components/marketplace/NearMeButton";

// One shape for all three buttons. Identical padding, identical height,
// so the row can't come out ragged at any width.
const BTN =
  "inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl px-6 font-medium transition-colors sm:w-auto";
const BTN_PRIMARY = `${BTN} bg-ocean-600 text-white hover:bg-ocean-500`;
const BTN_SECONDARY = `${BTN} border border-ocean-700/60 bg-ocean-900/60 text-ocean-200 hover:border-ocean-500 hover:text-white`;

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
          Two columns on a phone with the primary spanning both, one centred
          row from sm up. Every child is a direct flex item at the same fixed
          height, so nothing can sit proud of the others.
        */}
        <div className="mx-auto grid max-w-md grid-cols-2 gap-3 sm:flex sm:max-w-none sm:items-center sm:justify-center">
          <Link
            href="/marketplace"
            className={`group col-span-2 sm:col-span-1 ${BTN_PRIMARY}`}
          >
            Browse the classifieds
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link href={POST_AD_PATH} className={BTN_SECONDARY}>
            <Plus className="h-4 w-4 shrink-0" />
            Post ad
          </Link>

          {locatable.length > 0 && (
            <NearMeButton
              regions={locatable}
              className={BTN_SECONDARY}
              wrapperClassName="w-full sm:w-auto"
            />
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
