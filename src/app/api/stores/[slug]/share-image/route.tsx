import { ImageResponse } from "next/og";
import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

const W = 1200;
const H = 630;

type Shop = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  claimed_by: string | null;
  cover_url?: string | null;
  logo_url?: string | null;
};

async function getShop(slug: string): Promise<Shop | null> {
  // Banner and logo columns arrive with step 61; fall back without them.
  for (const cols of ["id, name, city, state, claimed_by, cover_url, logo_url", "id, name, city, state, claimed_by"]) {
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

/** Fetch a photo and hand it to the renderer inline. Anything odd is skipped, never fatal. */
async function inlineImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (type !== "image/jpeg" && type !== "image/png") return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 6_000_000) return null;
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

function initials(name: string) {
  return (
    name
      .replace(/['\u2019]/g, "")
      .replace(/[^A-Za-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !/^(the|and|of)$/i.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

function Star({ fill }: { fill: number }) {
  // fill: 0 to 1, how much of this star is gold
  const pts = "12,1.5 15.1,8.3 22.5,9.1 16.9,14.1 18.5,21.4 12,17.6 5.5,21.4 7.1,14.1 1.5,9.1 8.9,8.3";
  return (
    <div style={{ position: "relative", display: "flex", width: 34, height: 34 }}>
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points={pts} fill="rgba(255,255,255,0.25)" />
      </svg>
      <div style={{ position: "absolute", top: 0, left: 0, width: 34 * fill, height: 34, overflow: "hidden", display: "flex" }}>
        <svg width="34" height="34" viewBox="0 0 24 24">
          <polygon points={pts} fill="#fbbf24" />
        </svg>
      </div>
    </div>
  );
}

/**
 * The picture Facebook, texts and X show when someone shares a shop's page:
 * the shop's banner (or its newest photo), its logo, its name, town and
 * stars. Built fresh for each shop so every share shows off that shop.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await getShop(slug);
  if (!shop) return new Response("Not found", { status: 404 });

  // Background: the banner, or the newest photo the shop has shared.
  let bgUrl = shop.cover_url ?? null;
  if (!bgUrl) {
    const { data: post } = await supabasePublic
      .from("store_posts")
      .select("images")
      .eq("store_id", shop.id)
      .not("images", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    bgUrl = ((post as { images?: string[] | null } | null)?.images ?? [])[0] ?? null;
  }
  if (!bgUrl) {
    const { data: ph } = await supabasePublic
      .from("store_photos")
      .select("url")
      .eq("store_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    bgUrl = (ph as { url?: string } | null)?.url ?? null;
  }

  const { data: reviewRows } = await supabasePublic.from("store_reviews").select("rating").eq("store_id", shop.id);
  const ratings = ((reviewRows ?? []) as { rating: number }[]).map((r) => r.rating);
  const count = ratings.length;
  const avg = count ? ratings.reduce((a, b) => a + b, 0) / count : null;

  const [bg, logo] = await Promise.all([inlineImage(bgUrl), inlineImage(shop.logo_url)]);

  const place = [shop.city, shop.state].filter(Boolean).join(", ");
  const name = shop.name;
  const nameSize = name.length <= 16 ? 78 : name.length <= 24 ? 66 : name.length <= 34 ? 54 : 44;
  const font = await loadFont(`${name}${initials(name)}UNDERGROUND AQUARIUM`);
  const display = font ? "Cinzel" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #0b3a5c 0%, #062238 45%, #020b18 100%)",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        {bg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bg} alt="" width={W} height={H} style={{ position: "absolute", top: 0, left: 0, width: W, height: H, objectFit: "cover" }} />
        ) : (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: W,
              height: H,
              display: "flex",
              background:
                "radial-gradient(ellipse at 15% 0%, rgba(52,211,153,0.35) 0%, transparent 55%), radial-gradient(ellipse at 95% 100%, rgba(56,189,248,0.30) 0%, transparent 60%)",
            }}
          />
        )}

        {!bg &&
          [
            [980, 90, 150],
            [1090, 260, 70],
            [880, 300, 44],
            [1010, 420, 100],
            [760, 150, 30],
            [1140, 520, 38],
            [640, 60, 22],
          ].map(([x, y, r], i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - r,
                top: y - r,
                width: r * 2,
                height: r * 2,
                borderRadius: 999,
                display: "flex",
                border: "2px solid rgba(125,196,240,0.28)",
                background: "radial-gradient(circle at 30% 30%, rgba(194,228,250,0.22) 0%, rgba(194,228,250,0.03) 60%)",
              }}
            />
          ))}

        {/* Darken the bottom so the name always reads, whatever the photo. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            background: bg
              ? "linear-gradient(180deg, rgba(2,11,24,0.25) 0%, rgba(2,11,24,0.15) 35%, rgba(2,11,24,0.85) 72%, rgba(2,11,24,0.96) 100%)"
              : "linear-gradient(180deg, rgba(2,11,24,0) 40%, rgba(2,11,24,0.6) 100%)",
          }}
        />

        {/* Small brand mark, top left */}
        <div
          style={{
            position: "absolute",
            top: 36,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 18px",
            borderRadius: 999,
            background: "rgba(2,11,24,0.72)",
            border: "1px solid rgba(125,196,240,0.35)",
          }}
        >
          <div style={{ display: "flex", fontFamily: display, fontSize: 20, letterSpacing: 3, color: "#c2e4fa" }}>
            UNDERGROUND AQUARIUM
          </div>
        </div>

        {/* Logo, name, town, stars */}
        <div
          style={{
            position: "absolute",
            left: 48,
            right: 48,
            bottom: 44,
            display: "flex",
            alignItems: "center",
            gap: 36,
          }}
        >
          <div
            style={{
              width: 184,
              height: 184,
              flexShrink: 0,
              borderRadius: 999,
              border: "6px solid #34d399",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #059669 0%, #0b3a5c 100%)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" width={172} height={172} style={{ width: 172, height: 172, objectFit: "cover" }} />
            ) : (
              <div style={{ display: "flex", fontFamily: display, fontSize: 70, color: "white" }}>{initials(name)}</div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginBottom: 14,
                padding: "6px 16px",
                borderRadius: 999,
                background: "#34d399",
                color: "#022c22",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              LOCAL FISH STORE
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: display,
                fontSize: nameSize,
                lineHeight: 1.05,
                color: "white",
                textShadow: "0 3px 18px rgba(0,0,0,0.6)",
              }}
            >
              {name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16, fontSize: 30, color: "#c2e4fa" }}>
              {place && <div style={{ display: "flex" }}>{place}</div>}
              {shop.claimed_by && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 16px",
                    borderRadius: 999,
                    background: "rgba(16,185,129,0.25)",
                    border: "1px solid rgba(52,211,153,0.6)",
                    color: "#a7f3d0",
                    fontSize: 24,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Owner managed
                </div>
              )}
            </div>
            {avg != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} fill={Math.max(0, Math.min(1, avg - i))} />
                ))}
                <div style={{ display: "flex", marginLeft: 12, fontSize: 28, color: "white" }}>
                  {`${avg.toFixed(1)} · ${count} review${count === 1 ? "" : "s"}`}
                </div>
              </div>
            )}
          </div>
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
