import Link from "next/link";
import { Award, ArrowRight, Leaf } from "lucide-react";
import { SOCIETY_CLUB_PATH } from "@/lib/config";

/**
 * The step from reading a guide to doing it: what the Society's breeder
 * certificate for this fish looks like (with the visitor's own name on it
 * when they're signed in), what it's worth, and the buttons to start.
 * Plants earn points in the plant program instead; there's no breeder
 * certificate for them, so none is shown.
 */
export default function BreederCta({
  slug,
  name,
  program,
  points,
  classLetter,
  awardId,
}: {
  slug: string;
  name: string;
  program: "bap" | "hap";
  points: number | null;
  classLetter: string | null;
  awardId: string | null;
}) {
  const worth = points != null ? `${points} points${classLetter ? `, Class ${classLetter}` : ""}` : null;

  if (program === "hap") {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-ocean-900/40 p-5 sm:p-6">
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          <Leaf className="h-4 w-4" /> Underground Aquarium Society
        </p>
        <h2 className="font-display text-2xl text-white">Propagate {name} for Society points</h2>
        <p className="mt-2 text-ocean-200">
          {name} is on the Society&apos;s plant program list{worth ? ` (${worth})` : ""}. Grow it on, document it with dated
          photos, and submit it for review. Points add up to titles that stay on your name.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`${SOCIETY_CLUB_PATH}/awards/submit`}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-amber-300"
          >
            Submit a propagation <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/society" className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-500/10">
            About the Society
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-ocean-900/40 p-5 sm:p-6">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
        <Award className="h-4 w-4" /> Underground Aquarium Society
      </p>
      <h2 className="font-display text-2xl text-white">Become a Certified {name} Breeder</h2>
      <p className="mt-2 text-ocean-200">
        Spawn them, raise the fry to 60 days, and log it as it happens. Other members check the record, and you earn a
        framed-quality certificate with your name on it{worth ? `, plus ${worth}` : ""} toward Society titles.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/breeding/certificate/${slug}?me=1`}
        alt={`Sample Certified ${name} Breeder certificate`}
        width={1200}
        height={927}
        loading="lazy"
        className="mt-4 w-full rounded-lg border border-amber-500/20 shadow-lg shadow-black/30"
      />
      <p className="mt-2 text-xs text-ocean-500">Sample. Signed in, it shows your own name.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={awardId ? `/society/breeder/new?species=${awardId}` : "/society/breeder/new"}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-ocean-950 hover:bg-amber-300"
        >
          Start your spawn log <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href="/society" className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-500/10">
          How the Society works
        </Link>
      </div>
    </section>
  );
}
