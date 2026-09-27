import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ffmpeg } from "@/lib/video/ffmpeg";

export const runtime = "nodejs";
export const maxDuration = 300;

type Row = { id: string; user_id: string; video_path: string; species_id: string };

/**
 * Admin only: take the sound off every breeding video already on the
 * site. The picture is copied as is (no quality loss, a few seconds
 * each); only the audio track is dropped. Each silent copy goes to a new
 * address so nobody's browser keeps playing a cached copy with sound.
 * Safe to press twice: videos already done are skipped.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const { data } = await supabaseAdmin
    .from("species_videos")
    .select("id, user_id, video_path, species_id")
    .in("status", ["pending", "approved", "retired"])
    .not("video_path", "is", null)
    .not("video_path", "like", "%-silent.mp4");
  const rows = (data ?? []) as Row[];

  const bucket = supabaseAdmin.storage.from("species-videos");
  const started = Date.now();
  let done = 0;
  let failed = 0;
  const slugs = new Set<string>();

  for (const r of rows) {
    // Leave time to answer; the rest go on the next press.
    if (Date.now() - started > 240_000) break;
    const dir = await mkdtemp(path.join(tmpdir(), "uamute-"));
    try {
      const { data: blob, error } = await bucket.download(r.video_path);
      if (error || !blob) throw new Error(error?.message ?? "download failed");
      const input = path.join(dir, "in.mp4");
      const output = path.join(dir, "out.mp4");
      await writeFile(input, Buffer.from(await blob.arrayBuffer()));
      await ffmpeg(["-y", "-i", input, "-map", "0:v:0", "-c:v", "copy", "-an", "-movflags", "+faststart", output], 120_000);

      const newPath = `${r.user_id}/${r.id}-silent.mp4`;
      const up = await bucket.upload(newPath, await readFile(output), {
        contentType: "video/mp4",
        upsert: true,
        cacheControl: "31536000",
      });
      if (up.error) throw new Error(up.error.message);

      const { error: dbErr } = await supabaseAdmin
        .from("species_videos")
        .update({
          video_path: newPath,
          video_url: bucket.getPublicUrl(newPath).data.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      if (dbErr) throw new Error(dbErr.message);

      await bucket.remove([r.video_path]);
      done++;

      const { data: sp } = await supabaseAdmin.from("species").select("slug").eq("id", r.species_id).maybeSingle();
      if (sp?.slug) {
        slugs.add(sp.slug);
        revalidatePath(`/species/${sp.slug}/video/${r.id}`);
      }
    } catch (e) {
      console.error("[mute video]", r.id, e);
      failed++;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  for (const slug of slugs) revalidatePath(`/species/${slug}`);
  const left = rows.length - done - failed;
  return NextResponse.json({ ok: true, done, failed, left });
}
