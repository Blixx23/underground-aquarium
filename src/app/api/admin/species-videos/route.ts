import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";
import { ffmpeg } from "@/lib/video/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Admin decisions on breeding videos:
 *  - approve / reject: the database checks the caller is an admin,
 *    applies the 3-video limit, notifies the member and updates
 *    trophies. This hands out the bubbles, deletes a rejected video's
 *    files and refreshes the pages.
 *  - poster: re-cuts the poster from the moment the admin picked.
 */
export async function POST(req: Request) {
  let body: {
    id?: string;
    action?: string;
    retireId?: string | null;
    note?: string | null;
    stage?: string | null;
    at?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { id, action } = body;
  if (!id || !["approve", "reject", "poster"].includes(action ?? "")) {
    return NextResponse.json({ error: "Missing video or action." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (action === "poster") {
    const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });
    return setPoster(id, Number(body.at) || 0);
  }

  const { data, error } = await supabase.rpc("review_species_video", {
    p_id: id,
    p_action: action,
    p_retire: body.retireId ?? null,
    p_note: body.note ?? null,
    p_stage: body.stage ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const result = (data ?? {}) as {
    status?: string;
    user_id?: string | null;
    slug?: string | null;
    video_path?: string | null;
    poster_path?: string | null;
  };

  let bubbles = 0;
  if (result.status === "approved" && result.user_id) {
    // The database's notice already names the fish, links to the video
    // and mentions the bubbles, so no second generic notice.
    bubbles = await awardBubbles(result.user_id, "species_video_used", `species_video_${id}`, { notify: false });
  }

  if (result.status === "rejected") {
    const files = [result.video_path, result.poster_path].filter((f): f is string => !!f);
    if (files.length) {
      try {
        await supabaseAdmin.storage.from("species-videos").remove(files);
      } catch {
        // The row is already rejected; a leftover file isn't shown anywhere.
      }
    }
  }

  if (result.slug) {
    revalidatePath(`/species/${result.slug}`);
    revalidatePath(`/species/${result.slug}/video/${id}`);
    if (body.retireId) revalidatePath(`/species/${result.slug}/video/${body.retireId}`);
  }

  return NextResponse.json({ ok: true, bubbles });
}

/** Cut a new poster frame at `at` seconds from the site's converted copy. */
async function setPoster(id: string, at: number) {
  const { data: row } = await supabaseAdmin
    .from("species_videos")
    .select("id, user_id, status, video_path, poster_path, duration_s, species_id")
    .eq("id", id)
    .maybeSingle();
  if (!row || !row.video_path || !["pending", "approved"].includes(row.status as string)) {
    return NextResponse.json({ error: "That video isn't ready." }, { status: 400 });
  }

  const dir = await mkdtemp(path.join(tmpdir(), "uaposter-"));
  try {
    const bucket = supabaseAdmin.storage.from("species-videos");
    const { data: blob, error: dlErr } = await bucket.download(row.video_path as string);
    if (dlErr || !blob) throw new Error("Couldn't read the video.");
    const input = path.join(dir, "v.mp4");
    const output = path.join(dir, "p.jpg");
    await writeFile(input, Buffer.from(await blob.arrayBuffer()));

    const max = Math.max(0, Number(row.duration_s ?? 0) - 0.1);
    const t = Math.min(Math.max(at, 0), max);
    await ffmpeg(["-y", "-ss", t.toFixed(2), "-i", input, "-frames:v", "1", "-q:v", "3", output], 30_000);

    const posterPath = `${row.user_id}/${row.id}-${Date.now()}.jpg`;
    const up = await bucket.upload(posterPath, await readFile(output), {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });
    if (up.error) throw new Error(up.error.message);
    const posterUrl = bucket.getPublicUrl(posterPath).data.publicUrl;

    await supabaseAdmin
      .from("species_videos")
      .update({ poster_path: posterPath, poster_url: posterUrl, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (row.poster_path) await bucket.remove([row.poster_path as string]);

    if (row.status === "approved") {
      const { data: sp } = await supabaseAdmin.from("species").select("slug").eq("id", row.species_id).maybeSingle();
      if (sp?.slug) {
        revalidatePath(`/species/${sp.slug}`);
        revalidatePath(`/species/${sp.slug}/video/${row.id}`);
      }
    }
    return NextResponse.json({ ok: true, poster_url: posterUrl });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't make that poster." }, { status: 400 });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
