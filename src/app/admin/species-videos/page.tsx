import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import VideoQueue, { type QueueVideo, type LiveVideo } from "./VideoQueue";

export const metadata: Metadata = { title: "Admin · Breeding videos" };

export const dynamic = "force-dynamic";

/** Breeding videos waiting for a decision. The admin layout already checks is_admin. */
export default async function AdminSpeciesVideosPage() {
  const [{ data: rows }, { count: converting }] = await Promise.all([
    supabaseAdmin
      .from("species_videos")
      .select("id, species_id, user_id, stage, caption, video_url, poster_url, duration_s, width, height, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    supabaseAdmin.from("species_videos").select("id", { count: "exact", head: true }).eq("status", "processing"),
  ]);

  const pending = rows ?? [];
  const speciesIds = [...new Set(pending.map((r) => r.species_id as string))];
  const userIds = [...new Set(pending.map((r) => r.user_id as string))];

  const [{ data: species }, { data: profs }, { data: live }] = await Promise.all([
    speciesIds.length
      ? supabaseAdmin.from("species").select("id, slug, common_name, scientific_name").in("id", speciesIds)
      : Promise.resolve({ data: [] as { id: string; slug: string; common_name: string; scientific_name: string | null }[] }),
    userIds.length
      ? supabaseAdmin.from("profiles").select("id, username, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; username: string | null; full_name: string | null }[] }),
    speciesIds.length
      ? supabaseAdmin
          .from("species_videos")
          .select("id, species_id, poster_url, stage")
          .eq("status", "approved")
          .in("species_id", speciesIds)
          .order("reviewed_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; species_id: string; poster_url: string | null; stage: string }[] }),
  ]);

  const speciesMap = new Map((species ?? []).map((s) => [s.id as string, s]));
  const who = new Map((profs ?? []).map((p) => [p.id as string, p]));
  const liveBySpecies = new Map<string, LiveVideo[]>();
  for (const l of live ?? []) {
    const k = l.species_id as string;
    if (!liveBySpecies.has(k)) liveBySpecies.set(k, []);
    liveBySpecies.get(k)!.push({ id: l.id as string, poster_url: (l.poster_url as string | null) ?? null, stage: l.stage as string });
  }

  const queue: QueueVideo[] = pending.map((r) => {
    const s = speciesMap.get(r.species_id as string);
    const p = who.get(r.user_id as string);
    return {
      id: r.id as string,
      stage: r.stage as string,
      caption: (r.caption as string | null) ?? null,
      video_url: r.video_url as string,
      poster_url: (r.poster_url as string | null) ?? null,
      duration_s: (r.duration_s as number | null) ?? null,
      width: (r.width as number | null) ?? null,
      height: (r.height as number | null) ?? null,
      created_at: r.created_at as string,
      species_slug: (s?.slug as string) ?? "",
      species_name: (s?.common_name as string) ?? "Unknown species",
      scientific_name: (s?.scientific_name as string | null) ?? null,
      username: (p?.username as string | null) ?? null,
      full_name: (p?.full_name as string | null) ?? null,
      live: liveBySpecies.get(r.species_id as string) ?? [],
    };
  });

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 font-display text-3xl text-white">Breeding videos</h1>
        <p className="mb-2 text-ocean-400">
          Clips members filmed of courtship, spawning, eggs or fry. Each one has already been converted into the
          site&apos;s own copy. Use only the clear, steady, correctly identified ones: up to 3 per species.{" "}
          <strong className="text-white">Use it</strong> gives it its own watch page, puts it on the species page, and
          gives them 75 bubbles toward their Videographer trophies. A rejection needs a reason; they see it.
        </p>
        {(converting ?? 0) > 0 && (
          <p className="mb-6 text-sm text-amber-300">
            {converting} more {converting === 1 ? "is" : "are"} still converting and will show up here when done.
          </p>
        )}
        <div className="mt-6">
          <VideoQueue initial={queue} />
        </div>
      </div>
    </main>
  );
}
