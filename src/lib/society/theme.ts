// ============================================================
// THE SOCIETY'S OWN LOOK
//
// The rest of the site is ocean blue. The Society is brass on deep
// water — the colour of a medal, a charter, an engraved plaque.
//
// This isn't a second theme bolted on. Amber was already the site's
// achievement colour (BAP/HAP trophies, standings, the owner's crown),
// so making it the Society's colour reads as a promotion of something
// that was always there rather than a foreign palette dropped in.
//
// Everything lives in this one file so the Society looks identical on
// every surface it touches, and so it can be restyled in one place.
// ============================================================

import type { CSSProperties } from "react";

/** Small mono eyebrow above a heading. */
export const SOC_EYEBROW =
  "font-mono text-[11px] uppercase tracking-[0.25em] text-amber-300/70";

/** Body copy inside Society surfaces — warmer than ocean-300. */
export const SOC_TEXT = "text-amber-100/70";

/** The accent itself, for numbers, icons and emphasis. */
export const SOC_ACCENT = "text-amber-300";

/** A panel. Brass-edged, lit from inside. */
export const SOC_CARD =
  "rounded-2xl border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.07] to-transparent";

/** The same panel, but clickable. */
export const SOC_CARD_LINK = `${SOC_CARD} transition-all duration-300 hover:border-amber-400/50 hover:from-amber-500/[0.12] hover:-translate-y-0.5`;

/** Shared button geometry, so a Society button row is never ragged. */
const SOC_BTN_BASE =
  "inline-flex h-[52px] items-center justify-center gap-2 rounded-xl px-6 font-medium transition-all duration-300";

/** The join button. The one thing on the page that should be unmissable. */
export const SOC_BTN_PRIMARY = `${SOC_BTN_BASE} bg-amber-400 text-ocean-950 hover:bg-amber-300 hover:shadow-xl hover:shadow-amber-500/20`;

/** Everything secondary. */
export const SOC_BTN_GHOST = `${SOC_BTN_BASE} border border-amber-500/30 bg-amber-500/5 text-amber-200 hover:border-amber-400/60 hover:text-amber-100`;

/** A pill: "Member", "Lifetime", "Founding member". */
export const SOC_PILL =
  "inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300";

/** Hairline rule that fades out at both ends. */
export const SOC_RULE =
  "h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent";

/**
 * The warm glow behind a Society hero. Inline style rather than a class
 * because Tailwind can't express a radial gradient without config.
 */
export const SOC_GLOW: CSSProperties = {
  background:
    "radial-gradient(ellipse, rgba(217,160,60,0.17) 0%, transparent 70%)",
};
