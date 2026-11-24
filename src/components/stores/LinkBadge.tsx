"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

const SITE = "https://www.undergroundaquarium.com";

/**
 * "Find us on Underground Aquarium": a badge and plain link a shop (or club)
 * can paste on their own website, Google Business Profile or Facebook page.
 * Every link back helps Google trust the site, which gets more pages, theirs
 * included, shown in search.
 */
export default function LinkBadge({ path, name }: { path: string; name: string }) {
  const url = `${SITE}${path}`;
  const html = `<a href="${url}" title="${name.replace(/"/g, "&quot;")} on Underground Aquarium"><img src="${SITE}/badges/find-us.svg" alt="Find us on Underground Aquarium" width="240" height="64"></a>`;
  const [copied, setCopied] = useState<"html" | "url" | null>(null);

  async function copy(text: string, which: "html" | "url") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked: the text is still selectable below */
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg text-white">
        <Link2 className="h-4 w-4 text-emerald-300" /> Link to your page
      </h2>
      <p className="mb-4 text-sm text-ocean-300">
        Add this badge to your website, or paste your page link in your Google Business Profile and Facebook page.
        Customers can read your reviews, and links like this help your page show up higher in Google.
      </p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/badges/find-us.svg" alt="Find us on Underground Aquarium" width={240} height={64} className="mb-4" />

      <div className="space-y-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ocean-400">Badge for your website</p>
          <div className="flex items-start gap-2">
            <code className="block min-w-0 flex-1 select-all break-all rounded-lg bg-ocean-950 px-3 py-2 text-[11px] text-ocean-200">
              {html}
            </code>
            <button
              type="button"
              onClick={() => copy(html, "html")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-ocean-950 hover:bg-emerald-400"
            >
              {copied === "html" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "html" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-ocean-400">Your page link</p>
          <div className="flex items-start gap-2">
            <code className="block min-w-0 flex-1 select-all break-all rounded-lg bg-ocean-950 px-3 py-2 text-xs text-ocean-200">
              {url}
            </code>
            <button
              type="button"
              onClick={() => copy(url, "url")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
            >
              {copied === "url" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "url" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
