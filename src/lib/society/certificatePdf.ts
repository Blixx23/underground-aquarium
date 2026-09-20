import {
  PDFDocument,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { SIGNATURE_FONT_BASE64 } from "./signatureFont";
import {
  CINZEL_600,
  GARAMOND_400,
  GARAMOND_400_ITALIC,
  GARAMOND_600,
  GARAMOND_600_EXT,
  GARAMOND_500_ITALIC,
} from "./certificateFonts";

/**
 * The Society's certificates.
 *
 * Ivory stock, black ink, brass detail, made to be printed and framed.
 * Engraved capitals (Cinzel) for the institution and headings, EB Garamond
 * for everything a person reads. Every line sits on a fixed grid so the
 * three bottom columns (date, seal, signature) share one baseline, and
 * nothing overlaps at any name length.
 *
 * US Letter landscape, all vectors, sharp at any size.
 */

export type CertificateInput = {
  kind: "membership" | "title";
  recipientName: string;
  memberNumber: number | null;
  /** The title earned. Title certificates only. */
  title?: string | null;
  /** Points held when the title was issued. Title certificates only. */
  points?: number | null;
  issuedAt: Date;
  /** Year the member joined, for the membership certificate. */
  memberSince?: number | null;
  code: string;
  verifyUrl: string;
  /** PNG bytes of the founder's signature. Falls back to a typeset name. */
  signaturePng?: Uint8Array | null;
  signerName?: string;
  signerRole?: string;
};

const W = 792;
const H = 612;

const INK: RGB = rgb(0.09, 0.1, 0.12);
const SOFT: RGB = rgb(0.27, 0.27, 0.29);
const BRASS: RGB = rgb(0.6, 0.43, 0.14);
const BRASS_DEEP: RGB = rgb(0.5, 0.35, 0.1);
const BRASS_LIGHT: RGB = rgb(0.78, 0.63, 0.33);
const IVORY: RGB = rgb(0.985, 0.97, 0.935);
/** Underground Aquarium blue, a touch deeper like fountain-pen ink. */
const PEN: RGB = rgb(0.05, 0.25, 0.42);

function b64(s: string): Uint8Array {
  return Uint8Array.from(Buffer.from(s, "base64"));
}

/** Letters the embedded fonts can't draw are swapped for their plain form (é stays, ł becomes l). */
function printable(font: PDFFont, text: string): string {
  try {
    font.encodeText(text);
    return text;
  } catch {
    return [...text]
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          const plain = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          try {
            font.encodeText(plain);
            return plain;
          } catch {
            return "";
          }
        }
      })
      .join("");
  }
}

/** Does this font actually have a drawing for the character (not just an empty box)? */
function hasGlyph(font: PDFFont, ch: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fk = (font as any).embedder?.font;
  const cp = ch.codePointAt(0);
  return fk && cp !== undefined ? Boolean(fk.hasGlyphForCodePoint(cp)) : true;
}

/**
 * The recipient's name, drawn letter by letter from whichever face has the
 * letter: the main face first, then its Latin Extended companion, then the
 * plain letter without its accent.
 */
function drawName(page: PDFPage, name: string, cx: number, y: number, fonts: PDFFont[], size: number, color: RGB) {
  const runs: { ch: string; font: PDFFont }[] = [];
  for (const ch of name) {
    const f = fonts.find((ft) => hasGlyph(ft, ch));
    if (f) {
      runs.push({ ch, font: f });
      continue;
    }
    const plain = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const pf = fonts.find((ft) => plain && hasGlyph(ft, plain));
    if (pf) runs.push({ ch: plain, font: pf });
  }
  const width = runs.reduce((n, r) => n + r.font.widthOfTextAtSize(r.ch, size), 0);
  let x = cx - width / 2;
  for (const r of runs) {
    page.drawText(r.ch, { x, y, size, font: r.font, color });
    x += r.font.widthOfTextAtSize(r.ch, size);
  }
  return width;
}

function nameWidth(name: string, fonts: PDFFont[], size: number) {
  let w = 0;
  for (const ch of name) {
    const f = fonts.find((ft) => hasGlyph(ft, ch)) ?? fonts[0];
    try {
      w += f.widthOfTextAtSize(ch, size);
    } catch {
      /* skipped when drawn */
    }
  }
  return w;
}

function spacedWidth(font: PDFFont, text: string, size: number, spacing: number) {
  const chars = [...text];
  return chars.reduce((n, c) => n + font.widthOfTextAtSize(c, size), 0) + spacing * Math.max(0, chars.length - 1);
}

/** Draw text centred on cx. With spacing, drawn a letter at a time (for engraved caps). */
function text(
  page: PDFPage,
  str: string,
  cx: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  spacing = 0
) {
  const s = printable(font, str);
  if (!spacing) {
    page.drawText(s, { x: cx - font.widthOfTextAtSize(s, size) / 2, y, size, font, color });
    return;
  }
  let x = cx - spacedWidth(font, s, size, spacing) / 2;
  for (const c of s) {
    page.drawText(c, { x, y, size, font, color });
    x += font.widthOfTextAtSize(c, size) + spacing;
  }
}

/** Largest size (down to min) at which the line fits the width. */
function fit(font: PDFFont, str: string, max: number, width: number, min: number, spacing = 0) {
  const s = printable(font, str);
  let size = max;
  while (size > min && spacedWidth(font, s, size, spacing * (size / max)) > width) size -= 0.5;
  return size;
}

/** Text set around a circle. Top arc reads left to right; bottom arc reads upright. */
function arcText(
  page: PDFPage,
  text: string,
  cx: number,
  cy: number,
  r: number,
  font: PDFFont,
  size: number,
  color: RGB,
  spacing: number,
  bottom = false
) {
  const chars = [...text];
  const widths = chars.map((c) => font.widthOfTextAtSize(c, size) + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  const span = total / r; // radians the whole string occupies

  let angle = bottom ? -Math.PI / 2 - span / 2 : Math.PI / 2 + span / 2;
  chars.forEach((c, i) => {
    const half = (widths[i] - spacing) / 2 / r;
    const a = bottom ? angle + half : angle - half;
    const rot = bottom ? a + Math.PI / 2 : a - Math.PI / 2;
    // Position the glyph so its centre sits on the arc.
    const gx = cx + r * Math.cos(a) - Math.cos(rot) * (widths[i] - spacing) / 2;
    const gy = cy + r * Math.sin(a) - Math.sin(rot) * (widths[i] - spacing) / 2;
    page.drawText(c, { x: gx, y: gy, size, font, color, rotate: degrees((rot * 180) / Math.PI) });
    angle = bottom ? angle + widths[i] / r : angle - widths[i] / r;
  });
}

/** The Society seal, the same design as on the website, in brass. */
function seal(page: PDFPage, cx: number, cy: number, r: number, fonts: { caps: PDFFont }) {
  const k = r / 96; // the web seal is drawn on a 96-radius circle

  page.drawCircle({ x: cx, y: cy, size: 96 * k, borderColor: BRASS_LIGHT, borderWidth: 0.9 });
  page.drawCircle({ x: cx, y: cy, size: 90 * k, borderColor: BRASS, borderWidth: 2.2 * k });
  page.drawCircle({ x: cx, y: cy, size: 60 * k, borderColor: BRASS, borderWidth: 0.9 });

  arcText(page, "UNDERGROUND AQUARIUM", cx, cy, 71 * k, fonts.caps, 11 * k, BRASS, 1.4 * k, false);
  arcText(page, "SOCIETY · EST. 2026", cx, cy, 79 * k, fonts.caps, 10.5 * k, BRASS, 1.8 * k, true);

  for (const side of [-1, 1]) {
    page.drawSquare({
      x: cx + side * 76 * k - 3 * k,
      y: cy - 3 * k,
      size: 6 * k,
      color: BRASS,
      rotate: degrees(45),
    });
  }

  // Fish and waves: the web seal's paths, 200-unit viewBox centred at 100,100.
  const origin = { x: cx - 100 * k, y: cy + 100 * k, scale: k };
  const stroke = { borderColor: BRASS, borderWidth: 2.2 * k };
  page.drawSvgPath("M 78,92 C 90,80 112,80 124,92 C 112,104 90,104 78,92 Z", { ...origin, ...stroke });
  page.drawSvgPath("M 78,92 L 66,84 L 70,92 L 66,100 Z", { ...origin, ...stroke });
  page.drawSvgPath("M 96,83 C 100,75 108,74 112,79", { ...origin, ...stroke });
  page.drawSvgPath("M 97,101 C 99,107 105,108 108,104", { ...origin, ...stroke });
  page.drawSvgPath("M 74,116 Q 82,110 90,116 Q 98,122 106,116 Q 114,110 122,116", { ...origin, ...stroke });
  page.drawSvgPath("M 80,126 Q 87,120.5 94,126 T 108,126", { ...origin, borderColor: BRASS_LIGHT, borderWidth: 1.8 * k });
  page.drawCircle({ x: cx + 15 * k, y: cy + 11 * k, size: 2.2 * k, color: BRASS });
}

function frame(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: BRASS, borderWidth: 2.6 });
  page.drawRectangle({ x: 27, y: 27, width: W - 54, height: H - 54, borderColor: BRASS_LIGHT, borderWidth: 0.8 });
  page.drawRectangle({ x: 33, y: 33, width: W - 66, height: H - 66, borderColor: BRASS_LIGHT, borderWidth: 0.35, borderOpacity: 0.7 });
  for (const [x, y] of [[27, 27], [W - 27, 27], [27, H - 27], [W - 27, H - 27]]) {
    page.drawSquare({ x: x - 4.5, y: y - 4.5, size: 9, color: BRASS, rotate: degrees(45) });
  }
}

function rule(page: PDFPage, y: number, half: number) {
  page.drawLine({ start: { x: W / 2 - half, y }, end: { x: W / 2 - 9, y }, thickness: 0.7, color: BRASS_LIGHT });
  page.drawSquare({ x: W / 2 - 2.8, y: y - 2.8, size: 5.6, color: BRASS, rotate: degrees(45) });
  page.drawLine({ start: { x: W / 2 + 9, y }, end: { x: W / 2 + half, y }, thickness: 0.7, color: BRASS_LIGHT });
}

export async function buildCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    input.kind === "membership"
      ? `Certificate of Membership, ${input.recipientName}`
      : `${input.title}, ${input.recipientName}`
  );
  pdf.setAuthor("Underground Aquarium Society");
  pdf.setSubject(`Certificate ${input.code}`);
  pdf.setCreator("undergroundaquarium.com");
  pdf.registerFontkit(fontkit);

  const page = pdf.addPage([W, H]);
  const caps = await pdf.embedFont(b64(CINZEL_600), { subset: true });
  const serif = await pdf.embedFont(b64(GARAMOND_400), { subset: true });
  const italic = await pdf.embedFont(b64(GARAMOND_400_ITALIC), { subset: true });
  const bold = await pdf.embedFont(b64(GARAMOND_600), { subset: true });
  const boldExt = await pdf.embedFont(b64(GARAMOND_600_EXT), { subset: true });
  const titleFace = await pdf.embedFont(b64(GARAMOND_500_ITALIC), { subset: true });

  frame(page);
  const C = W / 2;

  // ---- Heading ----
  text(page, "UNDERGROUND AQUARIUM SOCIETY", C, 532, caps, 13, BRASS_DEEP, 4);
  rule(page, 516, 130);

  const heading = input.kind === "membership" ? "CERTIFICATE OF MEMBERSHIP" : "CERTIFICATE OF ACHIEVEMENT";
  const hSize = fit(caps, heading, 31, W - 200, 22, 2);
  text(page, heading, C, 462, caps, hSize, INK, 2 * (hSize / 31));

  // ---- Recipient ----
  text(page, "This is to certify that", C, 424, italic, 17, SOFT);

  const name = input.recipientName.trim() || "Member";
  const nameFonts = [bold, boldExt];
  let nSize = 48;
  while (nSize > 26 && nameWidth(name, nameFonts, nSize) > W - 220) nSize -= 0.5;
  const drawnW = drawName(page, name, C, 372, nameFonts, nSize, INK);
  const nameW = Math.min(drawnW + 80, W - 200);
  page.drawLine({ start: { x: C - nameW / 2, y: 358 }, end: { x: C + nameW / 2, y: 358 }, thickness: 0.7, color: BRASS_LIGHT });

  const memberNo =
    input.memberNumber !== null && input.memberNumber !== undefined
      ? `UAS-${String(input.memberNumber).padStart(4, "0")}`
      : null;

  if (input.kind === "membership") {
    text(page, "is a member in good standing of the", C, 328, serif, 16, SOFT);
    text(page, "UNDERGROUND AQUARIUM SOCIETY", C, 294, caps, 19, BRASS_DEEP, 2);
    const detail = [
      input.memberSince ? `Admitted ${input.memberSince}` : null,
      memberNo ? `Member No. ${memberNo}` : null,
    ].filter(Boolean).join("   ·   ");
    if (detail) text(page, detail, C, 264, serif, 14, SOFT);
  } else {
    text(page, "has been awarded the title of", C, 328, serif, 16, SOFT);
    const title = input.title ?? "";
    const tSize = fit(titleFace, title, 36, W - 240, 22);
    text(page, title, C, 290, titleFace, tSize, BRASS_DEEP);
    const detail = [
      "Breeder Award Program",
      input.points ? `${input.points} points` : null,
      memberNo ? `Member No. ${memberNo}` : null,
    ].filter(Boolean).join("   ·   ");
    text(page, detail, C, 262, serif, 14, SOFT);
  }

  // ---- Bottom row: date | seal | signature, one shared baseline ----
  const LINE_Y = 150;
  const colW = 196;
  const leftC = 96 + colW / 2;
  const rightC = W - 96 - colW / 2;

  seal(page, C, 168, 60, { caps });

  const dateStr = input.issuedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  text(page, dateStr, leftC, LINE_Y + 9, italic, 19, INK);
  page.drawLine({ start: { x: leftC - colW / 2, y: LINE_Y }, end: { x: leftC + colW / 2, y: LINE_Y }, thickness: 0.8, color: INK });
  text(page, "DATE OF ISSUE", leftC, LINE_Y - 17, caps, 9, SOFT, 1.5);

  const signer = input.signerName ?? "Christopher M. Lewis";
  const role = input.signerRole ?? "Founder & Judge";
  if (input.signaturePng) {
    const img = await pdf.embedPng(input.signaturePng);
    const s = Math.min((colW - 16) / img.width, 50 / img.height);
    page.drawImage(img, { x: rightC - (img.width * s) / 2, y: LINE_Y + 3, width: img.width * s, height: img.height * s });
  } else {
    await penSignature(pdf, page, signer, rightC, colW, LINE_Y);
  }
  page.drawLine({ start: { x: rightC - colW / 2, y: LINE_Y }, end: { x: rightC + colW / 2, y: LINE_Y }, thickness: 0.8, color: INK });
  text(page, signer.toUpperCase(), rightC, LINE_Y - 17, caps, 9, SOFT, 1.5);
  text(page, role, rightC, LINE_Y - 31, italic, 12, SOFT);

  // ---- Footer: registry number, where to check it, and a QR code ----
  text(page, "REGISTRY NO.", C, 80, caps, 8, SOFT, 2);
  text(page, input.code, C, 63, bold, 14, INK, 1.2);
  const site = input.verifyUrl.replace(/^https?:\/\//, "").replace(/\/verify\/.*$/, "/verify");
  text(page, `Verify at ${site}`, C, 49, italic, 10.5, SOFT);

  const qrSize = 50;
  const qrX = W - 56 - qrSize;
  const qrY = 50;
  qr(page, input.verifyUrl, qrX, qrY, qrSize);
  text(page, "SCAN TO VERIFY", qrX + qrSize / 2, qrY + qrSize + 6, caps, 6, SOFT, 0.8);

  return pdf.save();
}

/**
 * The typeset signature: a script hand in pen blue, rising slightly and
 * sitting on the line with a light underline flourish that stays above it.
 */
async function penSignature(pdf: PDFDocument, page: PDFPage, name: string, cx: number, colW: number, lineY: number) {
  const font = await pdf.embedFont(b64(SIGNATURE_FONT_BASE64), { subset: true });
  let size = 32;
  while (size > 18 && font.widthOfTextAtSize(name, size) > colW - 24) size -= 1;
  const w = font.widthOfTextAtSize(name, size);
  const tilt = 3;
  const sx = cx - w / 2;
  const sy = lineY + 8;
  page.drawText(name, { x: sx, y: sy, size, font, color: PEN, rotate: degrees(tilt) });

  const rise = Math.tan((tilt * Math.PI) / 180) * w;
  const x0 = sx + w * 0.18;
  const x1 = sx + w * 0.86;
  const y0 = sy - 1;
  const y1 = sy + 2 + rise * 0.8;
  const dip = sy - 4;
  const t = 1.1;
  const Y = (v: number) => -v;
  const sliver =
    `M ${x0} ${Y(y0)} ` +
    `C ${x0 + w * 0.2} ${Y(dip - t)}, ${x0 + w * 0.46} ${Y(dip + rise * 0.35 - t * 0.6)}, ${x1} ${Y(y1)} ` +
    `C ${x0 + w * 0.46} ${Y(dip + rise * 0.35 + t * 0.2)}, ${x0 + w * 0.2} ${Y(dip + t * 0.4)}, ${x0} ${Y(y0)} Z`;
  page.drawSvgPath(sliver, { x: 0, y: 0, color: PEN, opacity: 0.9 });
}

/** A QR code drawn as vectors: one path, crisp at any print size. */
function qr(page: PDFPage, text: string, x: number, y: number, size: number) {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const cell = size / n;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules.get(r, c)) d += `M ${c} ${r} h 1 v 1 h -1 Z `;
    }
  }
  // drawSvgPath's y axis points down, which is exactly how QR rows run.
  page.drawSvgPath(d, { x, y: y + size, scale: cell, color: INK });
}
