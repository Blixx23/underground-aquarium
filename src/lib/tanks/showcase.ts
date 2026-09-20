/**
 * Shared bits for tank showcases: the gear fields, the photo limits, and
 * the in-browser photo shrinker, so the builder, the tile and the tank page
 * all agree.
 */

export const MAX_TANK_PHOTOS = 12;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // before resizing
export const MAX_DESCRIPTION = 2000;
export const PHOTO_BUCKET = "tank-photos";

export type TankSpecs = Partial<Record<SpecKey, string>>;

export type SpecKey =
  | "filter"
  | "lighting"
  | "substrate"
  | "heater"
  | "co2"
  | "fertilizer"
  | "water";

/** The gear list, in the order it shows on the page. */
export const SPEC_FIELDS: { key: SpecKey; label: string; placeholder: string }[] = [
  { key: "filter", label: "Filter", placeholder: "Fluval 307 canister" },
  { key: "lighting", label: "Lighting", placeholder: "Chihiros WRGB II, 8 hrs" },
  { key: "substrate", label: "Substrate", placeholder: "ADA Amazonia" },
  { key: "heater", label: "Heater", placeholder: "Eheim Jager 150W at 78°F" },
  { key: "co2", label: "CO₂", placeholder: "Pressurised, 1 bps" },
  { key: "fertilizer", label: "Fertilizer", placeholder: "Easy Green, twice a week" },
  { key: "water", label: "Water", placeholder: "RO remineralised, 30% weekly" },
];

export function cleanSpecs(raw: unknown): TankSpecs {
  const out: TankSpecs = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const { key } of SPEC_FIELDS) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, 120);
  }
  return out;
}

/** "Running for 1 year, 4 months" from a start date. */
export function runningFor(startedOn: string | null): string | null {
  if (!startedOn) return null;
  const start = new Date(`${startedOn}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months--;
  if (months < 1) {
    const days = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
    return days <= 1 ? "Set up this week" : `Running ${days} days`;
  }
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? "year" : "years"}`);
  if (m) parts.push(`${m} ${m === 1 ? "month" : "months"}`);
  return `Running ${parts.join(", ")}`;
}

/** First sentence-ish of a description, for tiles. */
export function blurb(description: string | null, max = 140): string | null {
  const d = description?.replace(/\s+/g, " ").trim();
  if (!d) return null;
  if (d.length <= max) return d;
  const cut = d.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${cut.slice(0, at > 60 ? at : max).replace(/[,.;:\s]+$/, "")}…`;
}

/** Longest edge after resizing. Big enough for a full-screen gallery. */
const MAX_DIM = 2048;

/** Shrink a photo to a sensible JPEG in the browser before it's uploaded. */
export async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    let { naturalWidth: w, naturalHeight: h } = img;
    if (w > MAX_DIM || h > MAX_DIM) {
      const k = Math.min(MAX_DIM / w, MAX_DIM / h);
      w = Math.round(w * k);
      h = Math.round(h * k);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.86)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
