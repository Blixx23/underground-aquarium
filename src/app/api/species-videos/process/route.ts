import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { convertSpeciesVideo } from "@/lib/video/convert";

export const runtime = "nodejs";
// Conversion runs after the response, inside this same function.
export const maxDuration = 300;

/**
 * Starts converting a video the member just submitted. Answers
 * straight away; the upload form then watches the video's status, so
 * the member can leave the page and still gets a notification either way.
 */
export async function POST(req: Request) {
  let id: string | undefined;
  try {
    ({ id } = (await req.json()) as { id?: string });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "Missing video." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Their own video, still waiting to be converted.
  const { data: row } = await supabase
    .from("species_videos")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Video not found." }, { status: 404 });
  if (row.status !== "processing") return NextResponse.json({ ok: true, status: row.status });

  after(() => convertSpeciesVideo(id!));
  return NextResponse.json({ ok: true, status: "processing" });
}
