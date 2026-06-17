"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export default function ShareButton({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    // Mobile / supported browsers: native share sheet
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // user dismissed the sheet — do nothing
      }
      return;
    }
    // Desktop fallback: copy the link
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={share}
      className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 text-ocean-200 px-4 py-2.5 text-sm hover:border-emerald-500/40 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" /> Link copied
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" /> Share
        </>
      )}
    </button>
  );
}