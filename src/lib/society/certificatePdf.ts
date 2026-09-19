import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

/**
 * The Society's certificates.
 *
 * Ivory stock, black ink, brass detail. Deliberately not the black-and-gold
 * of the website: this is made to be printed and framed, and a sheet of
 * solid black from a home printer is streaky, wet and expensive. Brass on
 * ivory reads as the same institution and prints clean.
 *
 * US Letter landscape, drawn entirely with vectors and the PDF standard
 * fonts, so it's sharp at any size and needs no font files at runtime.
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

const INK: RGB = rgb(0.08, 0.09, 0.11);
const SOFT: RGB = rgb(0.33, 0.33, 0.35);
const BRASS: RGB = rgb(0.66, 0.49, 0.18);
const BRASS_LIGHT: RGB = rgb(0.8, 0.65, 0.34);
const IVORY: RGB = rgb(0.985, 0.97, 0.93);

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: RGB, spacing = 0) {
  if (spacing === 0) {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (W - w) / 2, y, size, font, color });
    return;
  }
  // Letter-spaced caps, drawn a character at a time.
  const chars = [...text];
  const widths = chars.map((c) => font.widthOfTextAtSize(c, size));
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = (W - total) / 2;
  chars.forEach((c, i) => {
    page.drawText(c, { x, y, size, font, color });
    x += widths[i] + spacing;
  });
}

/** Shrinks a line until it fits — long names shouldn't run into the border. */
function fitSize(font: PDFFont, text: string, max: number, maxWidth: number, min = 18) {
  let size = max;
  while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
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
function seal(page: PDFPage, cx: number, cy: number, r: number, fonts: { serif: PDFFont; mono: PDFFont }) {
  const k = r / 96; // the web seal is drawn on a 96-radius circle

  page.drawCircle({ x: cx, y: cy, size: 96 * k, borderColor: BRASS_LIGHT, borderWidth: 0.9 });
  page.drawCircle({ x: cx, y: cy, size: 90 * k, borderColor: BRASS, borderWidth: 2.2 * k });
  page.drawCircle({ x: cx, y: cy, size: 60 * k, borderColor: BRASS, borderWidth: 0.9 });

  arcText(page, "UNDERGROUND AQUARIUM", cx, cy, 72 * k, fonts.serif, 10.5 * k, BRASS, 1.6 * k, false);
  arcText(page, "SOCIETY  EST. 2026", cx, cy, 72 * k, fonts.mono, 9.5 * k, BRASS, 2.4 * k, true);

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
  page.drawSvgPath("M 74,116 Q 82,110 90,116 T 106,116 T 122,116", { ...origin, ...stroke });
  page.drawSvgPath("M 80,126 Q 87,120.5 94,126 T 108,126", { ...origin, borderColor: BRASS_LIGHT, borderWidth: 1.8 * k });
  page.drawCircle({ x: cx + 15 * k, y: cy + 11 * k, size: 2.2 * k, color: BRASS });
}

function border(page: PDFPage) {
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: IVORY });
  page.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, borderColor: BRASS, borderWidth: 3 });
  page.drawRectangle({ x: 30, y: 30, width: W - 60, height: H - 60, borderColor: BRASS_LIGHT, borderWidth: 0.8 });
  // A faint inner rule, the way engraved certificates are framed.
  page.drawRectangle({ x: 38, y: 38, width: W - 76, height: H - 76, borderColor: BRASS_LIGHT, borderWidth: 0.35, opacity: 0.6, borderOpacity: 0.6 });

  for (const [x, y] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) {
    page.drawSquare({ x: x - 5, y: y - 5, size: 10, color: BRASS, rotate: degrees(45) });
  }
}

function rule(page: PDFPage, y: number, halfWidth: number) {
  page.drawLine({ start: { x: W / 2 - halfWidth, y }, end: { x: W / 2 - 8, y }, thickness: 0.7, color: BRASS_LIGHT });
  page.drawSquare({ x: W / 2 - 2.5, y: y - 2.5, size: 5, color: BRASS, rotate: degrees(45) });
  page.drawLine({ start: { x: W / 2 + 8, y }, end: { x: W / 2 + halfWidth, y }, thickness: 0.7, color: BRASS_LIGHT });
}

export async function buildCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    input.kind === "membership"
      ? `Certificate of Membership — ${input.recipientName}`
      : `${input.title} — ${input.recipientName}`
  );
  pdf.setAuthor("Underground Aquarium Society");
  pdf.setSubject(`Certificate ${input.code}`);
  pdf.setCreator("undergroundaquarium.com");

  const page = pdf.addPage([W, H]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const serifBoldItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  border(page);

  centered(page, "UNDERGROUND AQUARIUM SOCIETY", H - 92, serif, 13, BRASS, 4.2);
  rule(page, H - 106, 120);

  const heading =
    input.kind === "membership" ? "Certificate of Membership" : "Certificate of Achievement";
  centered(page, heading, H - 158, serifBoldItalic, 40, INK);

  centered(page, "This is to certify that", H - 200, serifItalic, 15, SOFT);

  const nameSize = fitSize(serifBold, input.recipientName, 44, W - 180);
  centered(page, input.recipientName, H - 252, serifBold, nameSize, INK);
  const nameW = Math.min(serifBold.widthOfTextAtSize(input.recipientName, nameSize) + 60, W - 160);
  page.drawLine({ start: { x: (W - nameW) / 2, y: H - 264 }, end: { x: (W + nameW) / 2, y: H - 264 }, thickness: 0.6, color: BRASS_LIGHT });

  const memberNo =
    input.memberNumber !== null && input.memberNumber !== undefined
      ? `UAS-${String(input.memberNumber).padStart(4, "0")}`
      : null;

  if (input.kind === "membership") {
    centered(page, "is a member in good standing of the", H - 296, serif, 15, SOFT);
    centered(page, "Underground Aquarium Society", H - 318, serifBold, 18, INK);
    const detail = [
      input.memberSince ? `admitted ${input.memberSince}` : null,
      memberNo ? `Member No. ${memberNo}` : null,
    ].filter(Boolean).join("   ·   ");
    if (detail) centered(page, detail, H - 342, serifItalic, 13, SOFT);
  } else {
    centered(page, "has been awarded the title of", H - 292, serif, 15, SOFT);
    const t = input.title ?? "";
    centered(page, t, H - 330, serifBoldItalic, fitSize(serifBoldItalic, t, 32, W - 200), BRASS);
    const detail = [
      "Breeder Award Program",
      input.points ? `${input.points} points` : null,
      memberNo ? `Member No. ${memberNo}` : null,
    ].filter(Boolean).join("   ·   ");
    centered(page, detail, H - 356, serifItalic, 13, SOFT);
  }

  // Seal, centred low.
  seal(page, W / 2, 150, 62, { serif, mono });

  // Date, left.
  const dateStr = input.issuedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const leftX = 110;
  const colW = 190;
  const dW = serifItalic.widthOfTextAtSize(dateStr, 16);
  page.drawText(dateStr, { x: leftX + (colW - dW) / 2, y: 128, size: 16, font: serifItalic, color: INK });
  page.drawLine({ start: { x: leftX, y: 120 }, end: { x: leftX + colW, y: 120 }, thickness: 0.7, color: INK });
  const dl = "Date of Issue";
  page.drawText(dl, { x: leftX + (colW - serif.widthOfTextAtSize(dl, 11)) / 2, y: 104, size: 11, font: serif, color: SOFT });

  // Signature, right.
  const rightX = W - 110 - colW;
  const signer = input.signerName ?? "Christopher M. Lewis";
  const role = input.signerRole ?? "Founder & Judge";
  if (input.signaturePng) {
    const img = await pdf.embedPng(input.signaturePng);
    const maxW = colW - 20;
    const maxH = 46;
    const s = Math.min(maxW / img.width, maxH / img.height);
    const iw = img.width * s;
    const ih = img.height * s;
    page.drawImage(img, { x: rightX + (colW - iw) / 2, y: 122, width: iw, height: ih });
  } else {
    const sw = serifBoldItalic.widthOfTextAtSize(signer, 20);
    page.drawText(signer, { x: rightX + (colW - sw) / 2, y: 128, size: 20, font: serifBoldItalic, color: INK });
  }
  page.drawLine({ start: { x: rightX, y: 120 }, end: { x: rightX + colW, y: 120 }, thickness: 0.7, color: INK });
  // With a scanned signature the caption names the signer; with the
  // typeset stand-in the name is already on the line, so just the role.
  const signLine = input.signaturePng ? `${signer}, ${role}` : role;
  page.drawText(signLine, { x: rightX + (colW - serif.widthOfTextAtSize(signLine, 11)) / 2, y: 104, size: 11, font: serif, color: SOFT });

  // Verification footer.
  const ver = `Certificate ${input.code}   ·   Verify at ${input.verifyUrl.replace(/^https?:\/\//, "")}`;
  centered(page, ver, 50, mono, 8.5, SOFT);

  return pdf.save();
}
