import { NextResponse } from "next/server";
import { matchSpeciesSlug } from "@/lib/species/match";

/** Old WordPress species pages: /fish/<name-and-latin-name>/ -> /species/<slug>. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const match = await matchSpeciesSlug(slug);
  return NextResponse.redirect(new URL(match ? `/species/${match}` : "/species", request.url), 301);
}
