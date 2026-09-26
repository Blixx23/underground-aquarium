import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PhotoQueue, { type QueuePhoto, type LivePhoto } from "./PhotoQueue";

export const metadata: Metadata = { title: "Admin · Species photos" };

export const dynamic = "force-dynamic";

/** Member photos waiting for a decision. The admin layout already checks is_admin. */
export default async function AdminSpeciesPhotosPage() {
  const { data: rows } = await supabaseAdmin
    .from("species_photos")
    .select("id, species_id, user_id, url, width, height, caption, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);

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
          .from("species_photos")
          .select("id, species_id, url, is_cover")
          .eq("status", "approved")
          .in("species_id", speciesIds)
          .order("reviewed_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; species_id: string; url: string; is_cover: boolean }[] }),
  ]);

  const speciesMap = new Map((species ?? []).map((s) => [s.id as string, s]));
  const who = new Map((profs ?? []).map((p) => [p.id as string, p]));
  const liveBySpecies = new Map<string, LivePhoto[]>();
  for (const l of live ?? []) {
    const key = l.species_id as string;
    if (!liveBySpecies.has(key)) liveBySpecies.set(key, []);
    liveBySpecies.get(key)!.push({ id: l.id as string, url: l.url as string, is_cover: !!l.is_cover });
  }

  const queue: QueuePhoto[] = pending.map((r) => {
    const s = speciesMap.get(r.species_id as string);
    const p = who.get(r.user_id as string);
    return {
      id: r.id as string,
      url: r.url as string,
      width: r.width as number,
      height: r.height as number,
      caption: (r.caption as string | null) ?? null,
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
        <h1 className="mb-1 font-display text-3xl text-white">Species photos</h1>
        <p className="mb-8 text-ocean-400">
          Photos members took of their own fish. Only use the sharp, well lit, correctly identified ones: up to 5 per
          species. <strong className="text-white">Use it</strong> puts it on the species page with their name, gives
          them 50 bubbles and counts toward their Species Photographer trophies. A rejection needs a reason; they see
          it.
        </p>
        <PhotoQueue initial={queue} />
      </div>
    </main>
  );
}
