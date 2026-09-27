import { NextResponse } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

/** Old WordPress event pages (/event/<slug>/): the same event if we still have it, else the calendar. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabasePublic
    .from("events")
    .select("slug")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  const to = data?.slug ? `/events/${data.slug}` : "/events";
  return NextResponse.redirect(new URL(to, request.url), 308);
}
