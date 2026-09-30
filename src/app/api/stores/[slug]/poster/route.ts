import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canSeeHiddenShop } from "@/lib/stores/viewer";
import { buildStorePoster, type FlyerStyle } from "@/lib/stores/storePoster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "save" and "updates" were retired; the drawing code for them stays in storePoster.ts.
const STYLES: FlyerStyle[] = ["review", "newtank"];

/**
 * The shop's free print kit: window sign, counter card, handout cards and a
 * "leave us a review" card, each carrying a QR code with the Underground
 * Aquarium mark in the middle.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const asked = request.nextUrl.searchParams.get("style") as FlyerStyle | null;
  const style: FlyerStyle = asked && STYLES.includes(asked) ? asked : "review";
  // Plain paper by default: a shop is printing this on their own inkjet.
  const dark = request.nextUrl.searchParams.get("ink") === "dark";

  const { data: store } = await supabaseAdmin
    .from("fish_stores")
    .select("name, city, state, status, claimed_by")
    .eq("slug", slug)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: "No such shop." }, { status: 404 });
  // A hidden shop's posters are only for its owner and admins.
  const hidden = store.status !== "published";
  if (hidden && !(await canSeeHiddenShop((store.claimed_by as string | null) ?? null))) {
    return NextResponse.json({ error: "No such shop." }, { status: 404 });
  }

  const pdf = await buildStorePoster({
    style,
    name: store.name as string,
    city: (store.city as string | null) ?? null,
    state: (store.state as string | null) ?? null,
    url: `${request.nextUrl.origin}/stores/${slug}`,
    dark,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}-${style}${dark ? "-dark" : ""}.pdf"`,
      "Cache-Control": hidden ? "private, no-store" : "public, max-age=3600",
    },
  });
}
