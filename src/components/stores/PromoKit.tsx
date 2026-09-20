"use client";

import { useState } from "react";
import { Download, Copy, Check, QrCode, Share2, Megaphone } from "lucide-react";

const FLYERS = [
  {
    key: "save",
    title: "Save us to your phone",
    cta: "Scan to save us",
    blurb: "By the door or the register. Your customer leaves with your hours and number in their pocket.",
  },
  {
    key: "updates",
    title: "Know what just came in",
    cta: "Scan to follow us",
    blurb: "Above the tanks. Turns a one-off visitor into someone who hears every time you post new stock.",
  },
  {
    key: "review",
    title: "Leave us a review",
    cta: "Scan and tell us",
    blurb: "At the register, where they're happy with what they just bought. Reviews bring new customers.",
  },
  {
    key: "newtank",
    title: "Free help with your tank",
    cta: "Scan for free guides",
    blurb: "By the starter kits. Care guides, a stocking planner and a water checker, so their fish live and they come back to you.",
  },
] as const;

/** The free marketing kit: printable flyers, a website badge, and share links. */
export default function PromoKit({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "https://www.undergroundaquarium.com" : window.location.origin;
  const pageUrl = `${origin}/stores/${slug}`;
  const badge = `<a href="${pageUrl}"><img src="${origin}/api/stores/${slug}/badge" alt="Find us on Underground Aquarium" width="240" height="64" /></a>`;
  const blurb = `We're on Underground Aquarium. Our hours, directions, shop news and reviews are all there: ${pageUrl}`;

  function copy(what: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
        <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
        <p className="text-sm text-ocean-200">
          Everything here is free and made for {name}. Print what you want, hand it out, stick it in
          the window. Each one carries your own QR code, so a scan lands on your page. We don&apos;t
          sell anything or take a cut: the point is to send people through your door.
        </p>
      </div>

      <section>
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg text-white">
          <QrCode className="h-5 w-5 text-emerald-400" />
          Posters
        </h2>
        <p className="mb-4 text-sm text-ocean-400">
          Full page, US Letter, with your shop name across the top and your QR code in the middle.
          Each one is written for somebody standing in your shop, so it tells them what to do next
          rather than trying to talk them into visiting. Plain paper, light on ink.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {FLYERS.map((f) => (
            <div key={f.key} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-medium text-white">{f.title}</p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-emerald-400">{f.cta}</p>
              <p className="mb-4 mt-2 flex-1 text-sm text-ocean-400">{f.blurb}</p>
              <div className="flex gap-2">
                <a
                  href={`/api/stores/${slug}/poster?style=${f.key}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </a>
                <a
                  href={`/api/stores/${slug}/poster?style=${f.key}&ink=dark`}
                  title="Dark version, for a print shop or a screen"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 px-3 py-2 text-xs text-ocean-400 transition-colors hover:bg-white/5"
                >
                  Dark
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg text-white">Your website</h2>
        <p className="mb-3 text-sm text-ocean-400">
          Paste this anywhere on your own site. It shows a badge that links back to your page.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/stores/${slug}/badge`}
            alt="Find us on Underground Aquarium"
            width={240}
            height={64}
            className="mb-3"
          />
          <code className="block overflow-x-auto rounded-lg bg-ocean-950/70 p-3 text-[11px] text-ocean-300">
            {badge}
          </code>
          <button
            type="button"
            onClick={() => copy("badge", badge)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-ocean-200 hover:bg-white/5"
          >
            {copied === "badge" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied === "badge" ? "Copied" : "Copy the code"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-1 flex items-center gap-2 font-display text-lg text-white">
          <Share2 className="h-5 w-5 text-ocean-400" />
          Tell your customers
        </h2>
        <p className="mb-3 text-sm text-ocean-400">Ready to paste into Facebook, Instagram or a text.</p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="mb-3 whitespace-pre-wrap text-sm text-ocean-200">{blurb}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => copy("blurb", blurb)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-ocean-200 hover:bg-white/5"
            >
              {copied === "blurb" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied === "blurb" ? "Copied" : "Copy the post"}
            </button>
            <button
              type="button"
              onClick={() => copy("link", pageUrl)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-ocean-200 hover:bg-white/5"
            >
              {copied === "link" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied === "link" ? "Copied" : "Copy your link"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
