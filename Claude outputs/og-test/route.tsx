import { ImageResponse } from "next/og";
import { supabasePublic } from "./mock";

export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

type Shop = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  logo_url?: string | null;
};

async function getShop(slug: string): Promise<Shop | null> {
  // The logo column arrives with step 61; fall back without it.
  for (const cols of ["id, name, city, state, logo_url", "id, name, city, state"]) {
    const { data, error } = await supabasePublic
      .from("fish_stores")
      .select(cols)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!error) return (data as unknown as Shop | null) ?? null;
  }
  return null;
}

/** Fetch the logo and hand it to the renderer inline. Anything odd is skipped, never fatal. */
async function inlineImage(url: string | null | undefined): Promise<string | null> {
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

/** Our display font, just the letters this card needs. Falls back to the default font. */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
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

function Star({ fill, size = 26 }: { fill: number; size?: number }) {
  const pts = "12,1.5 15.1,8.3 22.5,9.1 16.9,14.1 18.5,21.4 12,17.6 5.5,21.4 7.1,14.1 1.5,9.1 8.9,8.3";
  return (
    <div style={{ position: "relative", display: "flex", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points={pts} fill="rgba(194,228,250,0.18)" />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, width: size * fill, height: size, overflow: "hidden", display: "flex" }}>
        <svg width={size} height={size} viewBox="0 0 24 24">
          <polygon points={pts} fill="#fbbf24" />
        </svg>
      </div>
    </div>
  );
}

// Center of the logo and its sonar rings.
const CX = 905;
const CY = 315;
const RINGS: [number, number][] = [
  [158, 0.22],
  [214, 0.14],
  [282, 0.09],
  [362, 0.06],
  [455, 0.04],
];

/**
 * The picture Facebook, texts and X show when someone shares a shop's page.
 * Dark and minimal: a teal glow and sonar rings behind the shop's logo (or our
 * fish mark if they haven't added one), the
 * shop's name big on the left, and a small Underground Aquarium mark.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return new Response("Not found", { status: 404 });

  const { data: reviewRows } = await supabasePublic.from("store_reviews").select("rating").eq("store_id", shop.id);
  const ratings = ((reviewRows ?? []) as { rating: number }[]).map((r) => r.rating);
  const count = ratings.length;
  const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : null;

  const logo = await inlineImage(shop.logo_url);
  const place = [shop.city, shop.state].filter(Boolean).join(", ");
  const name = shop.name;
  const nameSize =
    name.length <= 12 ? 92 : name.length <= 18 ? 78 : name.length <= 26 ? 64 : name.length <= 36 ? 54 : 44;
  const reviewText = count ? `${avg!.toFixed(1)}  ·  ${count} REVIEW${count === 1 ? "" : "S"}` : "";
  const font = await loadFont(
    `${name}${place.toUpperCase()}${reviewText}UNDERGROUND AQUARIUMundergroundaquarium.com0123456789.·`
  );
  const display = font ? "Cinzel" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#020b18",
          fontFamily: display,
          color: "white",
        }}
      >
        {/* Glow behind the logo */}
        <div
          style={{
            position: "absolute",
            left: CX - 560,
            top: CY - 460,
            width: 1120,
            height: 920,
            display: "flex",
            background:
              "radial-gradient(ellipse at center, rgba(20,184,166,0.42) 0%, rgba(14,116,144,0.20) 32%, rgba(2,11,24,0) 68%)",
          }}
        />
        {/* A faint cool wash top left, for depth */}
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

        {/* Sonar rings */}
        {RINGS.map(([r, a], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: CX - r,
              top: CY - r,
              width: r * 2,
              height: r * 2,
              borderRadius: 999,
              display: "flex",
              border: `1.5px solid rgba(153,246,228,${a})`,
            }}
          />
        ))}

        {/* The shop's logo */}
        <div
          style={{
            position: "absolute",
            left: CX - 118,
            top: CY - 118,
            width: 236,
            height: 236,
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
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={236} height={236} style={{ width: 236, height: 236, objectFit: "cover" }} />
          ) : (
            // No logo yet: our fish mark.
            <svg width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#99f6e4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
              <path d="M18 12v.5" />
              <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" />
            </svg>
          )}
        </div>

        {/* Brand mark, top left */}
        <div style={{ position: "absolute", left: 80, top: 72, display: "flex", alignItems: "center", gap: 14 }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#5eead4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
            <path d="M18 12v.5" />
            <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" />
          </svg>
          <div style={{ display: "flex", fontSize: 19, letterSpacing: 6, color: "#c2e4fa" }}>UNDERGROUND AQUARIUM</div>
        </div>

        {/* Name, place, rating */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 0,
            width: 600,
            height: H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: nameSize,
              lineHeight: 1.06,
              color: "white",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}
          >
            {name}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              width: 72,
              height: 3,
              borderRadius: 3,
              background: "linear-gradient(90deg, #2dd4bf 0%, #38bdf8 100%)",
            }}
          />
          {place && (
            <div style={{ display: "flex", marginTop: 26, fontSize: 24, letterSpacing: 4, color: "#9fd7f5" }}>
              {place.toUpperCase()}
            </div>
          )}
          {avg != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 18 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} fill={Math.max(0, Math.min(1, avg - i))} />
              ))}
              <div style={{ display: "flex", marginLeft: 14, fontSize: 21, letterSpacing: 2, color: "rgba(255,255,255,0.85)" }}>
                {reviewText}
              </div>
            </div>
          )}
        </div>

        {/* Address, bottom left */}
        <div
          style={{
            position: "absolute",
            left: 80,
            bottom: 60,
            display: "flex",
            fontSize: 17,
            letterSpacing: 4,
            color: "rgba(194,228,250,0.5)",
          }}
        >
          undergroundaquarium.com
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      ...(font ? { fonts: [{ name: "Cinzel", data: font, weight: 700 as const, style: "normal" as const }] } : {}),
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    }
  );
}
