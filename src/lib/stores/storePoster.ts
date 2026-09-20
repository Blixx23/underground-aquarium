import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { CINZEL_600, GARAMOND_400, GARAMOND_600, GARAMOND_400_ITALIC } from "@/lib/society/certificateFonts";

/** Underground Aquarium print colours. */
const NAVY: RGB = rgb(0.016, 0.082, 0.145);
const SEA: RGB = rgb(0.055, 0.29, 0.463);
const TIDE: RGB = rgb(0.229, 0.639, 0.91);
const INK: RGB = rgb(0.06, 0.09, 0.12);
const SOFT: RGB = rgb(0.42, 0.49, 0.56);
const PAPER: RGB = rgb(1, 1, 1);
const MIST: RGB = rgb(0.86, 0.93, 0.98);

export type FlyerStyle = "visit" | "updates" | "review" | "community";

const W = 612;
const H = 792;

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));

type Fonts = { caps: PDFFont; serif: PDFFont; bold: PDFFont; italic: PDFFont };

function widthOf(font: PDFFont, text: string, size: number, spacing = 0) {
  const chars = [...text];
  return chars.reduce((n, c) => n + font.widthOfTextAtSize(c, size), 0) + spacing * Math.max(0, chars.length - 1);
}

function centered(page: PDFPage, text: string, cx: number, y: number, font: PDFFont, size: number, color: RGB, spacing = 0) {
  let x = cx - widthOf(font, text, size, spacing) / 2;
  for (const c of text) {
    page.drawText(c, { x, y, size, font, color });
    x += font.widthOfTextAtSize(c, size) + spacing;
  }
}

function fit(font: PDFFont, text: string, max: number, width: number, min: number, spacing = 0) {
  let size = max;
  while (size > min && widthOf(font, text, size, spacing) > width) size -= 0.5;
  return size;
}

/** The fish mark, same drawing as the Society seal. */
function fishMark(page: PDFPage, cx: number, cy: number, size: number, color: RGB, weight = 2.4) {
  const k = size / 60;
  const o = { x: cx - 100 * k, y: cy + 100 * k, scale: k };
  const s = { borderColor: color, borderWidth: weight * k };
  page.drawSvgPath("M 78,92 C 90,80 112,80 124,92 C 112,104 90,104 78,92 Z", { ...o, ...s });
  page.drawSvgPath("M 78,92 L 66,84 L 70,92 L 66,100 Z", { ...o, ...s });
  page.drawSvgPath("M 96,83 C 100,75 108,74 112,79", { ...o, ...s });
  page.drawSvgPath("M 97,101 C 99,107 105,108 108,104", { ...o, ...s });
  page.drawSvgPath("M 74,110 Q 82,104 90,110 Q 98,116 106,110 Q 114,104 122,110", { ...o, ...s });
  page.drawCircle({ x: cx + 15 * k, y: cy + 11 * k, size: 2.6 * k, color });
}

/** QR code with the mark knocked out of the middle. Error correction H. */
function qrWithMark(page: PDFPage, text: string, x: number, y: number, size: number, dark: RGB, markColor: RGB, disc: RGB) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = modules.size;
  const cell = size / n;
  const hole = Math.round(n * 0.22);
  const from = Math.floor((n - hole) / 2);
  const to = from + hole;

  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules.get(r, c)) continue;
      if (r >= from && r < to && c >= from && c < to) continue;
      d += `M ${c} ${r} h 1 v 1 h -1 Z `;
    }
  }
  page.drawSvgPath(d, { x, y: y + size, scale: cell, color: dark });

  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = (hole * cell) / 2 + cell;
  page.drawCircle({ x: cx, y: cy, size: r, color: disc });
  page.drawCircle({ x: cx, y: cy, size: r, borderColor: markColor, borderWidth: 1.2 });
  fishMark(page, cx, cy, r * 1.3, markColor, 2.2);
}

/** Wordmark: the fish, then UNDERGROUND over AQUARIUM. */
function wordmark(page: PDFPage, cx: number, y: number, fonts: Fonts, scale: number, color: RGB) {
  const topW = widthOf(fonts.caps, "UNDERGROUND", 13 * scale, 3.2 * scale);
  fishMark(page, cx - topW / 2 - 18 * scale, y + 3 * scale, 22 * scale, color);
  centered(page, "UNDERGROUND", cx + 12 * scale, y + 6 * scale, fonts.caps, 13 * scale, color, 3.2 * scale);
  centered(page, "AQUARIUM", cx + 12 * scale, y - 7 * scale, fonts.caps, 9 * scale, color, 5.4 * scale);
}

type Copy = {
  kicker: string;
  headline: string[];
  cta: string;
  bullets: string[];
  footnote: string;
};

const COPY: Record<FlyerStyle, Copy> = {
  visit: {
    kicker: "BEFORE YOU DRIVE OVER",
    headline: ["FIND US", "ONLINE"],
    cta: "SCAN THIS CODE",
    bullets: [
      "Hours, directions and phone",
      "Our latest news and restock posts",
      "Photos of the shop and the tanks",
    ],
    footnote: "Point your phone camera at the code. That's it.",
  },
  updates: {
    kicker: "NEVER MISS A DROP",
    headline: ["GET OUR", "SHOP", "UPDATES"],
    cta: "SCAN TO FOLLOW US",
    bullets: [
      "We post when new fish land",
      "You get a notification, free",
      "Sales and events too",
    ],
    footnote: "Follow us on Underground Aquarium. Takes ten seconds.",
  },
  review: {
    kicker: "HOW DID WE DO?",
    headline: ["LEAVE US", "A REVIEW"],
    cta: "SCAN AND TELL US",
    bullets: [
      "One minute, from your phone",
      "Helps other keepers find us",
      "We read every single one",
    ],
    footnote: "Thanks for shopping local. It keeps this hobby alive.",
  },
  community: {
    kicker: "FOR EVERY FISH KEEPER",
    headline: ["JOIN THE", "LOCAL FISH", "COMMUNITY"],
    cta: "SCAN TO JOIN US",
    bullets: [
      "Free classifieds between hobbyists",
      "Care guides for hundreds of species",
      "Forums, tank planner and water check",
    ],
    footnote: "Free to join. Come say hello, and find us on there too.",
  },
};

/**
 * One full-page flyer, built around a single instruction: scan this.
 * Everything sits on a fixed grid, so nothing shifts or collides whatever
 * the shop is called. Dark for a window, light to save ink.
 */
function drawFlyer(
  page: PDFPage,
  fonts: Fonts,
  opts: { name: string; place: string; url: string; copy: Copy; dark: boolean }
) {
  const { copy, dark } = opts;
  const bg = dark ? NAVY : PAPER;
  const head = dark ? PAPER : INK;
  const muted = dark ? MIST : SOFT;
  const accent = dark ? TIDE : SEA;
  const cx = W / 2;
  const pad = 54;
  const inner = W - pad * 2;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
  page.drawRectangle({ x: 0, y: H - 12, width: W, height: 12, color: dark ? TIDE : NAVY });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 12, color: dark ? TIDE : NAVY });

  // Who this is, first.
  centered(page, opts.name, cx, 712, fonts.bold, fit(fonts.bold, opts.name, 30, inner, 15), head);
  if (opts.place) centered(page, opts.place, cx, 692, fonts.italic, 13.5, muted);

  centered(page, copy.kicker, cx, 674, fonts.caps, 11.5, accent, 3.4);

  // Headline: two or three heavy lines, bottom-anchored so the grid holds.
  const lines = copy.headline;
  const step = lines.length >= 3 ? 42 : 48;
  let hy = lines.length >= 3 ? 640 : 616;
  for (const line of lines) {
    const size = fit(fonts.caps, line, lines.length >= 3 ? 36 : 42, inner, 20, 1.5);
    centered(page, line, cx, hy, fonts.caps, size, head, 1.5);
    hy -= step;
  }

  // The code, on a white panel so it scans off any background.
  const qr = 224;
  const panel = qr + 40;
  const px = cx - panel / 2;
  const py = 276;
  page.drawRectangle({ x: px, y: py, width: panel, height: panel, color: PAPER });
  page.drawRectangle({ x: px, y: py, width: panel, height: panel, borderColor: accent, borderWidth: 2 });
  qrWithMark(page, opts.url, px + 20, py + 20, qr, INK, SEA, PAPER);

  // The instruction, as a solid band that reads like a button.
  const ctaH = 42;
  const ctaY = 216;
  const ctaW = Math.min(inner, widthOf(fonts.caps, copy.cta, 17, 3) + 76);
  page.drawRectangle({ x: cx - ctaW / 2, y: ctaY, width: ctaW, height: ctaH, color: accent });
  centered(page, copy.cta, cx, ctaY + 14, fonts.caps, 17, dark ? NAVY : PAPER, 3);

  // Three reasons, ticked.
  let by = 182;
  for (const b of copy.bullets) {
    const size = fit(fonts.serif, b, 13.5, inner - 34, 10);
    const bx = cx - (widthOf(fonts.serif, b, size) + 24) / 2;
    // A tick, drawn from the text baseline up (drawSvgPath's y runs downward).
    page.drawSvgPath("M 0 5 L 4 9 L 11 0", {
      x: bx,
      y: by + 11,
      borderColor: accent,
      borderWidth: 1.9,
      scale: 1.1,
    });
    page.drawText(b, { x: bx + 24, y: by, size, font: fonts.serif, color: muted });
    by -= 21;
  }

  // Footer.
  centered(page, copy.footnote, cx, 100, fonts.italic, 12, muted);
  page.drawLine({ start: { x: pad, y: 84 }, end: { x: W - pad, y: 84 }, thickness: 0.8, color: dark ? SEA : MIST });
  wordmark(page, cx, 58, fonts, 1.05, head);
  centered(page, opts.url.replace(/^https?:\/\//, ""), cx, 30, fonts.bold, 11, accent);
}

export async function buildStorePoster(opts: {
  style: FlyerStyle;
  name: string;
  city: string | null;
  state: string | null;
  url: string;
  dark?: boolean;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fonts: Fonts = {
    caps: await pdf.embedFont(b64(CINZEL_600), { subset: true }),
    serif: await pdf.embedFont(b64(GARAMOND_400), { subset: true }),
    bold: await pdf.embedFont(b64(GARAMOND_600), { subset: true }),
    italic: await pdf.embedFont(b64(GARAMOND_400_ITALIC), { subset: true }),
  };

  const page = pdf.addPage([W, H]);
  drawFlyer(page, fonts, {
    name: opts.name,
    place: [opts.city, opts.state].filter(Boolean).join(", "),
    url: opts.url,
    copy: COPY[opts.style] ?? COPY.visit,
    dark: opts.dark ?? true,
  });

  return pdf.save();
}
