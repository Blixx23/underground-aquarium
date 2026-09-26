/** What a breeding video shows. Shared by the upload form, pages and admin. */
export const VIDEO_STAGES = ["courtship", "spawning", "eggs", "fry"] as const;
export type VideoStage = (typeof VIDEO_STAGES)[number];

export const STAGE_LABEL: Record<VideoStage, string> = {
  courtship: "Courtship",
  spawning: "Spawning",
  eggs: "Eggs",
  fry: "Fry",
};

/** "Angelfish spawning", "Angelfish eggs", for headings and page titles. */
export function videoHeading(commonName: string, stage: string) {
  const s = (STAGE_LABEL[stage as VideoStage] ?? "Breeding").toLowerCase();
  return `${commonName} ${s}`;
}

/** 0:15, 1:02 */
export function clock(seconds: number | null | undefined) {
  const t = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

/** ISO 8601 duration for search engines: PT15S, PT1M2S. */
export function isoDuration(seconds: number | null | undefined) {
  const t = Math.max(1, Math.round(Number(seconds) || 0));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `PT${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
}

export const MAX_VIDEO_SECONDS = 60;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEOS_PER_SPECIES = 3;
