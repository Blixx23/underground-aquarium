"use client";

import { track } from "@vercel/analytics";
import { ExternalLink } from "lucide-react";

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

const KITS = [
  {
    kind: "strips",
    title: "Test strips",
    sub: "Quick and easy. Dip, wait a minute, match the colors.",
    query: "aquarium test strips freshwater",
  },
  {
    kind: "liquid",
    title: "Liquid test kit",
    sub: "Most accurate. Takes about 10 minutes with test tubes.",
    query: "API freshwater master test kit",
  },
] as const;

function amazonUrl(query: string): string {
  const u = new URL("https://www.amazon.com/s");
  u.searchParams.set("k", query);
  if (AMAZON_TAG) u.searchParams.set("tag", AMAZON_TAG);
  return u.toString();
}

export default function TestKitPick({ spot, compact = false }: { spot: string; compact?: boolean }) {
  return (
    <div className={compact ? "mt-3" : "mt-6 border-t border-white/10 pt-5 text-left"}>
      <p className={compact ? "mb-2 text-xs text-ocean-300" : "mb-3 text-sm font-medium text-white"}>
        {compact ? "Cycling means testing every day or two. Need a kit?" : "Don't have a test kit yet?"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {KITS.map((k) => (
          <a
            key={k.kind}
            href={amazonUrl(k.query)}
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
