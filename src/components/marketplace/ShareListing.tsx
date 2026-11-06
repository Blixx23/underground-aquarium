"use client";

import { useState } from "react";
import { Check, Copy, Download, Share2, Sparkles } from "lucide-react";

/**
 * Sharing an ad. For the seller it's the fastest way to buyers: post the link
 * in local fish groups, Reddit or a text, and every buyer who clicks lands
 * here and joins to message them. The shared link shows our branded card
 * (photo, price, where). Only our own links are used: the phone's share sheet
 * picks the app, so no outside sharing sites are linked from the page.
 */
export default function ShareListing({
  path,
  title,
  priceLabel,
  place,
  isOwner,
  justPosted = false,
}: {
  path: string;
  title: string;
  priceLabel: string;
  place: string;
  isOwner: boolean;
  justPosted?: boolean;
}) {
  const [done, setDone] = useState<string | null>(null);
  const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
  const card = `/api/share-card?path=${encodeURIComponent(path)}`;
  const adText = `${title} | ${priceLabel} | ${place}\n\nMessage me on Underground Aquarium (free, no fees): ${url}`;

  const flash = (what: string) => {
    setDone(what);
    setTimeout(() => setDone(null), 2200);
  };
  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(what);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} | ${priceLabel} | ${place}`, url });
        return;
      } catch {
        return; // they closed the sheet
      }
    }
    copy(url, "link");
  }

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-ocean-700/60 px-3 py-2.5 text-sm text-ocean-100 transition-colors hover:border-emerald-500/50 hover:text-white";

  // Buyers just get a quiet Share, to send it to a friend.
  if (!isOwner) {
    return (
      <button type="button" onClick={share} className={`${btn} mt-3 w-full`}>
        {done === "link" ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
        {done === "link" ? "Link copied" : "Share this ad"}
      </button>
    );
  }

  return (
    <div
      className={`mt-4 rounded-xl border p-4 ${
        justPosted ? "border-emerald-500/50 bg-emerald-500/10" : "border-ocean-800/60 bg-ocean-950/50"
      }`}
    >
      <p className="flex items-center gap-2 font-medium text-white">
        {justPosted ? <Sparkles className="h-4 w-4 text-emerald-300" /> : <Share2 className="h-4 w-4 text-emerald-300" />}
        {justPosted ? "Your ad is live. Now get it seen." : "Get more buyers: share your ad"}
      </p>
      <p className="mt-1 text-sm text-ocean-200">
        Post it in your local fish groups on Facebook, on Reddit, or text it to friends. Buyers tap the link and message you here, free.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className={`${btn} col-span-2 border-emerald-500/50 bg-emerald-600 font-medium text-white hover:bg-emerald-500`}>
          <Share2 className="h-4 w-4" /> Share your ad
        </button>
        <button type="button" onClick={() => copy(url, "link")} className={btn}>
          {done === "link" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          {done === "link" ? "Copied" : "Copy link"}
        </button>
        <button type="button" onClick={() => copy(adText, "text")} className={btn}>
          {done === "text" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          {done === "text" ? "Copied" : "Copy text"}
        </button>
        <a href={card} download={`${title.slice(0, 40).replace(/[^\w\- ]+/g, "").trim() || "ad"}.png`} className={`${btn} col-span-2`}>
          <Download className="h-4 w-4" /> Save the share picture
        </a>
      </div>
      <p className="mt-2 text-xs text-ocean-300">
        The link shows a picture with your photo, price and area wherever you paste it. &ldquo;Copy text&rdquo; gives you a ready-to-post line with the link.
      </p>
    </div>
  );
}
