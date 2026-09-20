import { NextResponse, type NextRequest } from "next/server";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { supabasePublic } from "@/lib/supabase/public";
import { CINZEL_600, GARAMOND_400, GARAMOND_600 } from "@/lib/society/certificateFonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 612; // US Letter portrait
const H = 792;
const INK = rgb(0.05, 0.12, 0.2);
const SEA = rgb(0.07, 0.29, 0.46);
const SOFT = rgb(0.3, 0.38, 0.45);
const PAPER = rgb(1, 1, 1);

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));

function centered(page: ReturnType<PDFDocument["addPage"]>, text: string, y: number, font: PDFFont, size: number, color = INK, spacing = 0) {
  const chars = [...text];
  const width = chars.reduce((n, c) => n + font.widthOfTextAtSize(c, size), 0) + spacing * (chars.length - 1);
  let x = (W - width) / 2;
  for (const c of chars) {
    page.drawText(c, { x, y, size, font, color });
    x += font.widthOfTextAtSize(c, size) + spacing;
  }
}

/**
 * A window sign a shop can print: their name, a QR code to their page,
 * and a line telling customers what they'll find there. Free, and it
 * quietly brings their regulars onto the site.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: store } = await supabasePublic
    .from("fish_stores")
    .select("name, city, state")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!store) return NextResponse.json({ error: "No such shop." }, { status: 404 });

  const url = `${request.nextUrl.origin}/stores/${slug}`;

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const caps = await pdf.embedFont(b64(CINZEL_600), { subset: true });
  const serif = await pdf.embedFont(b64(GARAMOND_400), { subset: true });
  const bold = await pdf.embedFont(b64(GARAMOND_600), { subset: true });

  const page = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: SEA, borderWidth: 2.5 });

  centered(page, "FIND US ON", H - 110, caps, 16, SOFT, 4);
  centered(page, "UNDERGROUND AQUARIUM", H - 150, caps, 26, SEA, 1.5);

  let nameSize = 34;
  const name = (store.name ?? "").toUpperCase();
  while (nameSize > 16 && caps.widthOfTextAtSize(name, nameSize) > W - 120) nameSize -= 1;
  centered(page, name, H - 215, caps, nameSize, INK);
  const place = [store.city, store.state].filter(Boolean).join(", ");
  if (place) centered(page, place, H - 240, serif, 15, SOFT);

  // QR code, big enough to scan from outside the glass.
  const size = 300;
  const { modules } = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const cell = size / n;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) if (modules.get(r, c)) d += `M ${c} ${r} h 1 v 1 h -1 Z `;
  }
  const qx = (W - size) / 2;
  const qy = H - 590;
  page.drawRectangle({ x: qx - 16, y: qy - 16, width: size + 32, height: size + 32, borderColor: SEA, borderWidth: 1 });
  page.drawSvgPath(d, { x: qx, y: qy + size, scale: cell, color: INK });

  centered(page, "Scan for hours, directions and what we have in stock", 150, serif, 14, SOFT);
  centered(page, "Leave us a review while you're there", 128, serif, 14, SOFT);
  centered(page, url.replace(/^https?:\/\//, ""), 92, bold, 15, SEA);

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-window-sign.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
