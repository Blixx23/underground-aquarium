import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/**
 * A small "Find us on Underground Aquarium" badge a shop can drop on
 * their own website. Served as an image so it works anywhere.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: store } = await supabasePublic
    .from("fish_stores")
    .select("name")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!store) return new NextResponse("Not found", { status: 404 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64" role="img" aria-label="Find us on Underground Aquarium">
  <rect width="240" height="64" rx="12" fill="#041525"/>
  <rect x="0.5" y="0.5" width="239" height="63" rx="11.5" fill="none" stroke="#1264a0"/>
  <g transform="translate(16 18) scale(1.15)" fill="none" stroke="#3aa3e8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/>
    <path d="M18 12v.5"/>
    <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>
  </g>
  <text x="62" y="27" font-family="Georgia, 'Times New Roman', serif" font-size="11" fill="#7dc4f0" letter-spacing="1.2">FIND US ON</text>
  <text x="62" y="45" font-family="Georgia, 'Times New Roman', serif" font-size="14" fill="#ffffff">Underground Aquarium</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
