/**
 * Shared pieces for the designed share cards (the picture Facebook, texts
 * and X show for a link): our font, the fish mark, sonar rings, and a safe
 * way to pull a photo into the card.
 */

export const OG_W = 1200;
export const OG_H = 630;

/** Our display font, just the letters a card needs. Falls back to the default font. */
export async function loadCinzel(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Cinzel:wght@700&text=${encodeURIComponent(text)}`)
    ).text();
    const m = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Our body font in italic (Crimson Pro), for scientific names and captions. */
export async function loadCrimsonItalic(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@1,500&text=${encodeURIComponent(text)}`)
    ).text();
    const m = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
    if (!m) return null;
    const res = await fetch(m[1]);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Fetch a photo and hand it to the renderer inline. Anything odd is skipped, never fatal. */
export async function inlineImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type !== "image/jpeg" && type !== "image/png") return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function FishMark({ size, color = "#99f6e4", weight = 1.4 }: { size: number; color?: string; weight?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
      <path d="M18 12v.5" />
      <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" />
    </svg>
  );
}

/** Dark background with a teal glow and sonar rings centered on (cx, cy). */
export function Backdrop({ cx, cy }: { cx: number; cy: number }) {
  const rings: [number, number][] = [
    [158, 0.22],
    [214, 0.14],
    [282, 0.09],
    [362, 0.06],
    [455, 0.04],
  ];
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cx - 560,
          top: cy - 460,
          width: 1120,
          height: 920,
          display: "flex",
          background:
            "radial-gradient(ellipse at center, rgba(20,184,166,0.42) 0%, rgba(14,116,144,0.20) 32%, rgba(2,11,24,0) 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -300,
          top: -320,
          width: 900,
          height: 700,
          display: "flex",
          background: "radial-gradient(ellipse at center, rgba(59,130,246,0.16) 0%, rgba(2,11,24,0) 65%)",
        }}
      />
      {rings.map(([r, a], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: cx - r,
            top: cy - r,
            width: r * 2,
            height: r * 2,
            borderRadius: 999,
            display: "flex",
            border: `1.5px solid rgba(153,246,228,${a})`,
          }}
        />
      ))}
    </>
  );
}

/** "UNDERGROUND AQUARIUM" with the fish, top left. */
export function BrandMark() {
  return (
    <div style={{ position: "absolute", left: 80, top: 72, display: "flex", alignItems: "center", gap: 14 }}>
      <FishMark size={30} color="#5eead4" weight={1.8} />
      <div style={{ display: "flex", fontSize: 19, letterSpacing: 6, color: "#c2e4fa" }}>UNDERGROUND AQUARIUM</div>
    </div>
  );
}

/** A round frame holding a photo, or our glowing fish when there's no photo. */
export function Medallion({ cx, cy, photo, size = 236 }: { cx: number; cy: number; photo: string | null; size?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid rgba(204,251,241,0.55)",
        background: "linear-gradient(145deg, #0f766e 0%, #0b3a5c 55%, #06243a 100%)",
        boxShadow: "0 0 90px rgba(45,212,191,0.45), 0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "cover" }} />
      ) : (
        <FishMark size={Math.round(size * 0.54)} />
      )}
    </div>
  );
}

export const OG_LETTERS = "UNDERGROUND AQUARIUMundergroundaquarium.com0123456789.,·°–/+";

export const ogCache = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
