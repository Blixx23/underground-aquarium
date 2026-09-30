"use client";

import { useEffect, useState } from "react";
import { Download, Copy, Check, QrCode, Share2, Megaphone, X, Maximize2 } from "lucide-react";
import PdfPreview from "./PdfPreview";

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

type Ink = "light" | "dark";

/** The free marketing kit: printable posters, a website badge, and share links, all previewed before download. */
export default function PromoKit({ slug, name }: { slug: string; name: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const [ink, setInk] = useState<Record<string, Ink>>({});
  const [open, setOpen] = useState<{ key: string; title: string } | null>(null);

  const origin = typeof window === "undefined" ? "https://www.undergroundaquarium.com" : window.location.origin;
  const pageUrl = `${origin}/stores/${slug}`;
  const badge = `<a href="${pageUrl}"><img src="${origin}/api/stores/${slug}/badge" alt="Find us on Underground Aquarium" width="240" height="64" /></a>`;
  const blurb = `We're on Underground Aquarium. Our hours, directions, shop news and reviews are all there: ${pageUrl}`;

  const posterUrl = (key: string, which: Ink) =>
    `/api/stores/${slug}/poster?style=${key}${which === "dark" ? "&ink=dark" : ""}`;
  const inkOf = (key: string): Ink => ink[key] ?? "light";

  function copy(what: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  // The big preview closes with Esc and stops the page scrolling behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const inkSwitch = (key: string) => (
    <div className="inline-flex rounded-xl border border-white/15 p-0.5 text-xs">
      {(["light", "dark"] as const).map((w) => (
        <button
          key={w}
          type="button"
          onClick={() => setInk((m) => ({ ...m, [key]: w }))}
          aria-pressed={inkOf(key) === w}
          className={`rounded-lg px-3 py-1.5 transition-colors ${
            inkOf(key) === w ? "bg-white/10 text-white" : "text-ocean-400 hover:text-white"
          }`}
        >
          {w === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );

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
          Full page, US Letter, with your shop name across the top and your QR code in the middle. Light is
          for printing on plain paper at the shop; Dark is for a print shop or a screen. Tap a poster to see
          it big.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {FLYERS.map((f) => {
            const which = inkOf(f.key);
            return (
              <div key={f.key} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <button
                  type="button"
                  onClick={() => setOpen({ key: f.key, title: f.title })}
                  className="group relative mb-4 block overflow-hidden rounded-lg border border-white/10"
                  aria-label={`Preview the ${f.title} poster`}
                >
                  <PdfPreview key={posterUrl(f.key, which)} src={posterUrl(f.key, which)} alt={`${f.title} poster`} />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] text-white opacity-90 group-hover:opacity-100">
                    <Maximize2 className="h-3 w-3" /> Preview
                  </span>
                </button>
                <p className="font-medium text-white">{f.title}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-emerald-400">{f.cta}</p>
                <p className="mb-4 mt-2 flex-1 text-sm text-ocean-400">{f.blurb}</p>
                <div className="flex items-center gap-2">
                  {inkSwitch(f.key)}
                  <a
                    href={posterUrl(f.key, which)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg text-white">Your website</h2>
        <p className="mb-3 text-sm text-ocean-400">
          Paste this anywhere on your own site. It shows this badge, linking back to your page.
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
        <p className="mb-3 text-sm text-ocean-400">
          Ready to paste into Facebook, Instagram or a text. When you share your link, this is the picture people
          see with it.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/stores/${slug}/share-image`}
            alt={`What ${name} looks like when its link is shared`}
            className="mb-4 aspect-[1200/630] w-full rounded-lg border border-white/10 bg-white/5 object-cover"
            loading="lazy"
          />
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

      {/* Big poster preview */}
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`${open.title} poster`} className="fixed inset-0 z-[80] flex flex-col bg-black/90">
          <div className="flex items-center justify-between gap-3 px-4 pt-[calc(0.75rem_+_env(safe-area-inset-top))] pb-3">
            <p className="truncate font-display text-lg text-white">{open.title}</p>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4" onClick={() => setOpen(null)}>
            <div className="w-full max-w-[34rem] pb-4" onClick={(e) => e.stopPropagation()}>
              <PdfPreview
                key={`big-${posterUrl(open.key, inkOf(open.key))}`}
                src={posterUrl(open.key, inkOf(open.key))}
                alt={`${open.title} poster`}
                className="shadow-2xl"
              />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-white/10 px-4 pt-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]">
            {inkSwitch(open.key)}
            <a
              href={posterUrl(open.key, inkOf(open.key))}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
            >
              <Download className="h-4 w-4" /> Download PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
