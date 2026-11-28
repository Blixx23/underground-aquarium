import Link from "next/link";
import { CheckCircle2, Bell } from "lucide-react";
import { thumb } from "@/lib/images/thumb";
import { regionHref } from "@/lib/marketplace/regions";

/**
 * What a buyer sees when they open an ad that's been marked sold, from a saved
 * ad, a "Sold" notification or an old link. Friendlier than a 404, and it
 * points them at the same area so they can keep looking.
 */
export default function SoldNotice({
  title,
  image,
  isWanted,
  stateCode,
  regionSlug,
}: {
  title: string;
  image: string | null;
  isWanted: boolean;
  stateCode: string | null;
  regionSlug: string | null;
}) {
  const browse = stateCode && regionSlug ? regionHref({ state_code: stateCode, slug: regionSlug }) : "/marketplace";
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb(image, 640)} alt={title} className="mx-auto mb-6 aspect-[4/3] w-full max-w-sm rounded-2xl object-cover opacity-50" />
      )}
      <p className="inline-flex items-center gap-2 rounded-full bg-ocean-800/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ocean-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {isWanted ? "Found" : "Sold"}
      </p>
      <h1 className="mt-4 break-words text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-ocean-300">
        {isWanted ? "This member found what they were looking for." : "This one has found a new home."}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={browse} className="rounded-xl bg-ocean-600 px-5 py-3 text-white transition-colors hover:bg-ocean-500">
          See what&apos;s listed nearby
        </Link>
        <Link
          href="/my/alerts"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ocean-700/60 px-5 py-3 text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          Set an alert
        </Link>
      </div>
    </main>
  );
}
