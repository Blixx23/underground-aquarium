import Link from "next/link";
import { Play } from "lucide-react";
import { clock, STAGE_LABEL, type VideoStage } from "@/lib/video/stages";

export type SpeciesVideo = {
  id: string;
  stage: string;
  caption: string | null;
  video_url: string;
  poster_url: string | null;
  duration_s: number | null;
  width: number | null;
  height: number | null;
  reviewed_at: string | null;
  username: string | null;
  full_name: string | null;
};

/**
 * Breeding videos on a species page. Each card opens the video's own
 * watch page, which is the page search engines index for it; nothing
 * loads here but the poster, so the species page stays light.
 */
export default function SpeciesVideos({
  videos,
  slug,
  name,
}: {
  videos: SpeciesVideo[];
  slug: string;
  name: string;
}) {
  if (videos.length === 0) return null;
  return (
    <section className="border-t border-white/10 pt-8 mb-8">
      <h2 className="text-sm font-medium uppercase tracking-wide text-ocean-400 mb-4">
        {name} breeding videos
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {videos.map((v) => {
          const who = v.full_name || v.username || "a member";
          return (
            <Link
              key={v.id}
              href={`/species/${slug}/video/${v.id}`}
              className="group block overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-sky-400/40"
            >
              <div className="relative aspect-video bg-ocean-950/70">
                {v.poster_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.poster_url}
                    alt={`${name} ${STAGE_LABEL[v.stage as VideoStage]?.toLowerCase() ?? "breeding"} video`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/30">
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </span>
                </span>
                {v.duration_s != null && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-white">
                    {clock(v.duration_s)}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-sm font-medium text-white">{STAGE_LABEL[v.stage as VideoStage] ?? "Breeding"}</p>
                <p className="truncate text-xs text-ocean-400">Filmed by {who}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
