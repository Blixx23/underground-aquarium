import "server-only";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ffmpeg, probe } from "@/lib/video/ffmpeg";
import { MAX_VIDEO_SECONDS } from "@/lib/video/stages";

/**
 * Turns a member's original upload into the site's own copy.
 *
 * Whatever the phone recorded (iPhone HEVC .mov, Android, WebM), what
 * goes on the site is always the same: an H.264/AAC MP4 that plays in
 * every browser, full HD (1920 on its long side, never upscaled), up to
 * 60 fps so fast spawning action stays smooth, with the
 * streaming index at the front so it starts playing straight away, and
 * with every bit of metadata stripped (phones store GPS in videos).
 * A poster frame is cut from it too. The original is then deleted.
 *
 * Runs after the upload request has already answered, so the member
 * isn't waiting on it. Never throws: failures mark the video failed and
 * tell the member.
 */
export async function convertSpeciesVideo(id: string): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from("species_videos")
    .select("id, user_id, raw_path, status, species_id")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.status !== "processing" || !row.raw_path) return;

  const dir = await mkdtemp(path.join(tmpdir(), "uavid-"));
  const input = path.join(dir, "in");
  const output = path.join(dir, "out.mp4");
  const poster = path.join(dir, "poster.jpg");

  try {
    const { data: blob, error: dlErr } = await supabaseAdmin.storage.from("video-uploads").download(row.raw_path);
    if (dlErr || !blob) throw new Friendly("We couldn't read the file you uploaded.");
    await writeFile(input, Buffer.from(await blob.arrayBuffer()));

    const info = await probe(input);
    if (!info.hasVideo) throw new Friendly("That file doesn't look like a video.");
    if (info.duration != null && info.duration > MAX_VIDEO_SECONDS + 1) {
      throw new Friendly(`That clip is ${Math.round(info.duration)} seconds. Trim it to ${MAX_VIDEO_SECONDS} seconds or less.`);
    }

    await ffmpeg([
      "-y",
      "-i", input,
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-t", String(MAX_VIDEO_SECONDS),
      "-vf", "scale='if(gte(iw,ih),min(1920,iw),-2)':'if(gte(iw,ih),-2,min(1920,ih))':flags=lanczos,format=yuv420p",
      "-fpsmax", "60",
      "-c:v", "libx264",
      "-profile:v", "high",
      "-preset", "veryfast",
      "-crf", "22",
      "-maxrate", "8M",
      "-bufsize", "16M",
      "-c:a", "aac",
      "-b:a", "128k",
      "-ac", "2",
      "-map_metadata", "-1",
      "-map_chapters", "-1",
      "-movflags", "+faststart",
      output,
    ], 270_000);

    const out = await probe(output);
    const dur = out.duration ?? info.duration ?? 0;
    // A frame a third of the way in usually shows the fish, not the
    // wobble of the camera starting.
    const at = Math.min(Math.max(dur / 3, 0), Math.max(dur - 0.5, 0));
    await ffmpeg(["-y", "-ss", at.toFixed(2), "-i", output, "-frames:v", "1", "-q:v", "3", poster], 60_000);

    const base = `${row.user_id}/${row.id}`;
    const videoPath = `${base}.mp4`;
    const posterPath = `${base}-${Date.now()}.jpg`;
    const bucket = supabaseAdmin.storage.from("species-videos");

    const up1 = await bucket.upload(videoPath, await readFile(output), {
      contentType: "video/mp4",
      upsert: true,
      cacheControl: "31536000",
    });
    if (up1.error) throw new Error(up1.error.message);
    const up2 = await bucket.upload(posterPath, await readFile(poster), {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });
    if (up2.error) throw new Error(up2.error.message);

    await supabaseAdmin
      .from("species_videos")
      .update({
        status: "pending",
        video_path: videoPath,
        video_url: bucket.getPublicUrl(videoPath).data.publicUrl,
        poster_path: posterPath,
        poster_url: bucket.getPublicUrl(posterPath).data.publicUrl,
        duration_s: Math.round(dur * 10) / 10,
        width: out.width,
        height: out.height,
        raw_path: null,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "processing");

    await supabaseAdmin.storage.from("video-uploads").remove([row.raw_path]);
  } catch (e) {
    const message = e instanceof Friendly ? e.message : "Something went wrong converting that video. Try exporting it again from your phone.";
    await supabaseAdmin
      .from("species_videos")
      .update({ status: "failed", error: message, raw_path: null, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    await supabaseAdmin.storage.from("video-uploads").remove([row.raw_path]);

    const { data: sp } = await supabaseAdmin.from("species").select("slug, common_name").eq("id", row.species_id).maybeSingle();
    await supabaseAdmin.from("notifications").insert({
      user_id: row.user_id,
      type: "species_video",
      title: `We couldn't use your ${sp?.common_name ?? "fish"} video`,
      body: message,
      link: sp?.slug ? `/species/${sp.slug}` : "/species",
    });
    if (!(e instanceof Friendly)) console.error("species video conversion failed", id, e);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** A failure the member should see word for word. */
class Friendly extends Error {}
