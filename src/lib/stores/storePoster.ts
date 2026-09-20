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

export type FlyerStyle = "save" | "updates" | "review" | "newtank";

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

/**
 * The Underground Aquarium fish: the same drawing as the site icon, in a
 * 24-unit box. Stroke width is given in path units, which pdf-lib scales
 * along with the path, so the mark keeps the icon's weight at any size.
 */
const FISH_PATHS = [
  "M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z",
  "M18 12v.5",
  "M16 17.93a9.77 9.77 0 0 1 0-11.86",
  "M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33",
  "M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4",
  "m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98",
];

function fishMark(page: PDFPage, cx: number, cy: number, size: number, color: RGB, weight = 1.9) {
  const k = size / 24;
  const o = { x: cx - 12 * k, y: cy + 12 * k, scale: k };
  for (const d of FISH_PATHS) {
    page.drawSvgPath(d, { ...o, borderColor: color, borderWidth: weight });
  }
}

/** A circle as an SVG path, in drawSvgPath's y-down space. */
function circlePath(cx: number, cy: number, r: number) {
  const k = r * 0.5523;
  return (
    `M ${cx - r} ${cy} ` +
    `C ${cx - r} ${cy - k}, ${cx - k} ${cy - r}, ${cx} ${cy - r} ` +
    `C ${cx + k} ${cy - r}, ${cx + r} ${cy - k}, ${cx + r} ${cy} ` +
    `C ${cx + r} ${cy + k}, ${cx + k} ${cy + r}, ${cx} ${cy + r} ` +
    `C ${cx - k} ${cy + r}, ${cx - r} ${cy + k}, ${cx - r} ${cy} Z `
  );
}

/** A rounded square as an SVG path, in drawSvgPath's y-down space. */
function roundedPath(x: number, y: number, w: number, h: number, r: number) {
  const k = r * 0.4477;
  return (
    `M ${x + r} ${y} L ${x + w - r} ${y} ` +
    `C ${x + w - k} ${y}, ${x + w} ${y + k}, ${x + w} ${y + r} ` +
    `L ${x + w} ${y + h - r} ` +
    `C ${x + w} ${y + h - k}, ${x + w - k} ${y + h}, ${x + w - r} ${y + h} ` +
    `L ${x + r} ${y + h} ` +
    `C ${x + k} ${y + h}, ${x} ${y + h - k}, ${x} ${y + h - r} ` +
    `L ${x} ${y + r} ` +
    `C ${x} ${y + k}, ${x + k} ${y}, ${x + r} ${y} Z `
  );
}

/**
 * The QR code, drawn properly: round dots for the data, rounded corner
 * eyes, and the shop's mark on a navy badge in the middle. Error
 * correction H, and the badge covers well under a fifth of the code, so
 * every scanner still reads it.
 */
function qrWithMark(page: PDFPage, text: string, x: number, y: number, size: number, dark: RGB, markColor: RGB, disc: RGB) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "H" });
  const n = modules.size;
  const cell = size / n;
  const hole = Math.round(n * 0.2);
  const from = Math.floor((n - hole) / 2);
  const to = from + hole;

  const inEye = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

  // Data modules stay square so every scanner reads them cleanly; the
  // corners and the badge are where the code gets its character.
  let data = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules.get(r, c) || inEye(r, c)) continue;
      if (r >= from && r < to && c >= from && c < to) continue;
      data += `M ${c} ${r} h 1 v 1 h -1 Z `;
    }
  }
  page.drawSvgPath(data, { x, y: y + size, scale: cell, color: dark });

  // The three corner eyes, drawn as rounded frames with a rounded pupil.
  for (const [er, ec] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ] as [number, number][]) {
    // Border width is in path units here, so 1 = one module thick.
    const outer = roundedPath(ec + 0.5, er + 0.5, 6, 6, 1.9);
    page.drawSvgPath(outer, { x, y: y + size, scale: cell, borderColor: dark, borderWidth: 1 });
    const pupil = roundedPath(ec + 2, er + 2, 3, 3, 1);
    page.drawSvgPath(pupil, { x, y: y + size, scale: cell, color: dark });
  }

  // The badge: a navy rounded square with the fish in it, on a white gap.
  const cx = x + size / 2;
  const cy = y + size / 2;
  const gap = (hole * cell) / 2 + cell * 1.1;
  const badge = gap * 1.6;
  page.drawSvgPath(roundedPath(cx - gap, -(cy + gap), gap * 2, gap * 2, gap * 0.42), {
    x: 0,
    y: 0,
    color: disc,
  });
  page.drawSvgPath(roundedPath(cx - badge / 2, -(cy + badge / 2), badge, badge, badge * 0.26), {
    x: 0,
    y: 0,
    color: markColor,
  });
  fishMark(page, cx, cy, badge * 0.66, disc, 2);
}

/** Wordmark: the fish, then UNDERGROUND over AQUARIUM. */
function wordmark(page: PDFPage, cx: number, y: number, fonts: Fonts, scale: number, color: RGB) {
  const topW = widthOf(fonts.caps, "UNDERGROUND", 13 * scale, 3.2 * scale);
  fishMark(page, cx - topW / 2 - 18 * scale, y + 2 * scale, 22 * scale, color, 1.9);
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

/**
 * All four are written for somebody standing in the shop, looking at the
 * wall. Nobody scans a poster to decide whether to visit a shop they are
 * already standing in, so every one of these is about what happens next:
 * keep us on your phone, hear about new stock, leave a review, get help
 * with the tank you just bought.
 */
const COPY: Record<FlyerStyle, Copy> = {
  save: {
    kicker: "WHILE YOU'RE HERE",
    headline: ["SAVE US TO", "YOUR PHONE"],
    cta: "SCAN TO SAVE US",
    bullets: ["Our hours, directions and phone", "One tap next time you need us"],
    footnote: "No app. It just opens our page in your browser.",
  },
  updates: {
    kicker: "NEW FISH MOST WEEKS",
    headline: ["KNOW WHAT", "JUST CAME IN"],
    cta: "SCAN TO FOLLOW US",
    bullets: ["We post the day new stock lands", "You get a notification, free"],
    footnote: "Follow us and you'll know before your next trip out.",
  },
  review: {
    kicker: "FOUND WHAT YOU CAME FOR?",
    headline: ["LEAVE US", "A REVIEW"],
    cta: "SCAN AND TELL US",
    bullets: ["One minute, right from your phone", "It helps other keepers find us"],
    footnote: "Thanks for shopping local. It keeps this hobby alive.",
  },
  newtank: {
    kicker: "SETTING UP YOUR FIRST TANK?",
    headline: ["FREE HELP", "WITH YOUR TANK"],
    cta: "SCAN FOR FREE GUIDES",
    bullets: ["Care guides and a water checker", "A planner that catches bad mixes"],
    footnote: "Free from your local fish store. Ask us anything in store, too.",
  },
};

/**
 * One full-page flyer, built around a single instruction: scan this.
 *
 * Printed on a shop's own inkjet, so the sheet stays white: navy type,
 * one small solid band, and a black code. The dark version exists for a
 * print shop or a screen, but nobody has to burn a cartridge to use this.
 */
function drawFlyer(
  page: PDFPage,
  fonts: Fonts,
  opts: { name: string; place: string; url: string; copy: Copy; dark: boolean }
) {
  const { copy, dark } = opts;
  const bg = dark ? NAVY : PAPER;
  const head = dark ? PAPER : NAVY;
  const muted = dark ? MIST : SOFT;
  const accent = dark ? TIDE : SEA;
  const cx = W / 2;
  const pad = 54;
  const inner = W - pad * 2;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });

  // A navy band across the top carries the shop's name in white. It is the
  // only heavy area of ink on the sheet, and it gives the flyer its punch.
  const bandH = 168;
  if (!dark) {
    page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: NAVY });
    page.drawRectangle({ x: 0, y: H - bandH - 6, width: W, height: 6, color: TIDE });
  } else {
    page.drawRectangle({ x: 0, y: H - 10, width: W, height: 10, color: TIDE });
  }

  wordmark(page, cx, H - 44, fonts, 0.85, dark ? PAPER : MIST);

  const nameSize = fit(fonts.bold, opts.name, 40, inner, 17);
  centered(page, opts.name, cx, H - 112, fonts.bold, nameSize, PAPER);
  if (opts.place) centered(page, opts.place, cx, H - 136, fonts.italic, 14, MIST);

  // The hook.
  centered(page, copy.kicker, cx, dark ? 640 : H - bandH - 26, fonts.caps, 12, accent, 3.4);

  const lines = copy.headline.slice(0, 2);
  const size = Math.min(...lines.map((l) => fit(fonts.caps, l, 38, inner, 20, 1.5)));
  let hy = lines.length > 1 ? 548 : 520;
  for (const line of lines) {
    centered(page, line, cx, hy, fonts.caps, size, head, 1.5);
    hy -= size + 12;
  }

  // The code, framed by a hairline rather than a block of colour.
  const qr = 236;
  const qx = cx - qr / 2;
  const qy = 222;
  page.drawRectangle({
    x: qx - 18,
    y: qy - 18,
    width: qr + 36,
    height: qr + 36,
    color: PAPER,
    borderColor: accent,
    borderWidth: 1.2,
  });
  qrWithMark(page, opts.url, qx, qy, qr, NAVY, SEA, PAPER);

  // One solid band: the instruction.
  const ctaH = 42;
  const ctaY = 156;
  const ctaW = Math.min(inner, widthOf(fonts.caps, copy.cta, 17, 3) + 76);
  page.drawRectangle({ x: cx - ctaW / 2, y: ctaY, width: ctaW, height: ctaH, color: accent });
  centered(page, copy.cta, cx, ctaY + 14, fonts.caps, 17, PAPER, 3);

  let by = 122;
  for (const b of copy.bullets.slice(0, 2)) {
    const bs = fit(fonts.serif, b, 13.5, inner - 34, 10);
    const bx = cx - (widthOf(fonts.serif, b, bs) + 24) / 2;
    page.drawSvgPath("M 0 5 L 4 9 L 11 0", {
      x: bx,
      y: by + 11,
      borderColor: accent,
      borderWidth: 1.9,
      scale: 1.1,
    });
    page.drawText(b, { x: bx + 24, y: by, size: bs, font: fonts.serif, color: muted });
    by -= 21;
  }

  centered(page, copy.footnote, cx, 74, fonts.italic, 12, muted);
  page.drawLine({ start: { x: pad, y: 58 }, end: { x: W - pad, y: 58 }, thickness: 1, color: accent });
  centered(page, opts.url.replace(/^https?:\/\//, ""), cx, 34, fonts.bold, 12, head);
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
    copy: COPY[opts.style] ?? COPY.save,
    dark: opts.dark ?? false,
  });

  return pdf.save();
}
