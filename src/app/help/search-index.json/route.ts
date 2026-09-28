import { NextResponse } from "next/server";
import { getHelpSections } from "@/lib/help/content";

/**
 * The whole help search index as one static JSON file, built at deploy.
 * The search box downloads it the first time someone focuses it, and the
 * browser and CDN cache it after that, so article pages stay light.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getHelpSections(), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
