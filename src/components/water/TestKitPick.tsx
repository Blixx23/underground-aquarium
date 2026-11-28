"use client";

import { track } from "@vercel/analytics";
import { ExternalLink, TestTube } from "lucide-react";
import { RgbFrame } from "@/components/stores/FeaturedShopCard";

/**
 * "Don't have a test kit?" for people who open Water Check with nothing to
 * enter. Two choices, tracked separately (Vercel Analytics > Events >
 * "Test kit clicked", by kind and spot), so Chris can see how many visitors
 * want strips versus a liquid kit before ordering his own strips.
 *
 * The one allowed exception to "no third-party links": an Amazon Associates
 * link here only. When our own strips launch, swap the strips link for ours.
 */

// Chris's Amazon Associates tracking ID (e.g. "undergroundaq-20"). Empty = plain links, no commission.
const AMAZON_TAG = "undergroundaq-20";

// Specific products Chris picked (Amazon ASINs), so it's a real recommendation, not a search page.
const KITS = [
  {
    kind: "strips",
    title: "Test strips",
    sub: "API 5-in-1 strips, 100 count. Dip, wait a minute, match the colors.",
    asin: "B077YS7Y4Y",
  },
  {
    kind: "liquid",
    title: "Liquid test kit",
    sub: "API Freshwater Master Test Kit. Most accurate, about 10 minutes with test tubes.",
    asin: "B000255NCI",
  },
] as const;

function amazonUrl(asin: string): string {
  const u = new URL(`https://www.amazon.com/dp/${asin}`);
  if (AMAZON_TAG) u.searchParams.set("tag", AMAZON_TAG);
  return u.toString();
}

/** The top-of-page version: one line in the same turning rainbow frame the shop strip used. */
function TopStrip({ spot }: { spot: string }) {
  return (
    <RgbFrame>
      <div className="flex flex-col gap-2 rounded-[14px] bg-ocean-900/40 px-3.5 py-2.5 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2 text-sm text-white">
          <TestTube className="h-4 w-4 shrink-0 text-emerald-400" />
          Need a test kit?
        </span>
        <span className="flex flex-wrap gap-2 sm:ml-auto">
          {KITS.map((k) => (
            <a
              key={k.kind}
              href={amazonUrl(k.asin)}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              onClick={() => track("Test kit clicked", { kind: k.kind, spot })}
              className="inline-flex items-center gap-1.5 rounded-full border border-ocean-700/60 bg-ocean-950/60 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:border-emerald-500/60"
            >
              {k.kind === "strips" ? "API test strips" : "API Master liquid kit"}
              <ExternalLink className="h-3 w-3 text-ocean-500" />
            </a>
          ))}
        </span>
      </div>
      <p className="rounded-b-[14px] bg-ocean-950 px-3.5 pb-1.5 text-[10px] text-ocean-500">
        Opens Amazon. We may earn a small commission, at no cost to you.
      </p>
    </RgbFrame>
  );
}

export default function TestKitPick({
  spot,
  compact = false,
  top = false,
}: {
  spot: string;
  compact?: boolean;
  top?: boolean;
}) {
  if (top) return <TopStrip spot={spot} />;
  return (
    <div className={compact ? "mt-3" : "mt-6 border-t border-white/10 pt-5 text-left"}>
      <p className={compact ? "mb-2 text-xs text-ocean-300" : "mb-3 text-sm font-medium text-white"}>
        {compact ? "Cycling means testing every day or two. Need a kit?" : "Don't have a test kit yet?"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {KITS.map((k) => (
          <a
            key={k.kind}
            href={amazonUrl(k.asin)}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={() => track("Test kit clicked", { kind: k.kind, spot })}
            className="group rounded-xl border border-ocean-700/60 bg-ocean-900/40 px-4 py-3 transition-colors hover:border-emerald-500/60"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-white">
              {k.title}
              <ExternalLink className="h-3.5 w-3.5 text-ocean-500 group-hover:text-emerald-400" />
            </span>
            {!compact && <span className="mt-0.5 block text-xs text-ocean-400">{k.sub}</span>}
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ocean-500">Opens Amazon. We may earn a small commission, at no cost to you.</p>
    </div>
  );
}
