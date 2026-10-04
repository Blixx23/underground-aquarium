import { ImageResponse } from "next/og";
import {
  OG_W,
  OG_H,
  OG_LETTERS,
  loadCinzel,
  loadCrimsonItalic,
  inlineImage,
  Backdrop,
  BrandMark,
  Medallion,
  ogCache,
} from "@/lib/og/card";
import { shareCardFor } from "@/lib/og/shareCards";

export const dynamic = "force-dynamic";

const CX = 935;
const CY = 315;

/**
 * The picture Facebook, texts and X show for a shared page that doesn't
 * have a photo of its own: what the page is, big, with a few facts.
 * /api/share-card?path=/courses/nitrogen-cycle
 */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") || "";
  if (!path.startsWith("/") || path.length > 300) return new Response("Not found", { status: 404 });

  const card = await shareCardFor(path);
  if (!card) return new Response("Not found", { status: 404 });

  const gold = card.tone === "gold";
  const accent = gold ? "#fcd34d" : "#5eead4";
  const chips = (card.chips ?? []).slice(0, 4);
  const title = card.title.length > 70 ? `${card.title.slice(0, 67).trimEnd()}...` : card.title;
  const sub = card.sub ? (card.sub.length > 110 ? `${card.sub.slice(0, 107).trimEnd()}...` : card.sub) : null;
  const titleSize =
    title.length <= 14 ? 84 : title.length <= 24 ? 70 : title.length <= 36 ? 58 : title.length <= 52 ? 50 : 42;

  const [font, italic, photo] = await Promise.all([
    loadCinzel(`${title}${card.kicker}${chips.join("")}${OG_LETTERS}`),
    sub ? loadCrimsonItalic(sub) : Promise.resolve(null),
    inlineImage(card.photo),
  ]);
  const display = font ? "Cinzel" : "sans-serif";
  const fonts = [
    ...(font ? [{ name: "Cinzel", data: font, weight: 700 as const, style: "normal" as const }] : []),
    ...(italic ? [{ name: "Crimson", data: italic, weight: 500 as const, style: "italic" as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_W,
          height: OG_H,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#020b18",
          fontFamily: display,
          color: "white",
        }}
      >
        <Backdrop cx={CX} cy={CY} />
        <Medallion cx={CX} cy={CY} photo={photo} size={236} />
        <BrandMark />

        <div
          style={{
            position: "absolute",
            left: 80,
            top: 120,
            width: 640,
            height: 420,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, color: accent }}>{card.kicker}</div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: titleSize,
              lineHeight: 1.08,
              color: "white",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}
          >
            {title}
          </div>
          {sub && (
            <div
              style={{
                display: "flex",
                marginTop: 14,
                fontFamily: italic ? "Crimson" : "sans-serif",
                fontStyle: "italic",
                fontSize: 30,
                lineHeight: 1.25,
                color: "rgba(194,228,250,0.85)",
              }}
            >
              {sub}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 24,
              width: 72,
              height: 3,
              borderRadius: 3,
              background: gold
                ? "linear-gradient(90deg, #fbbf24 0%, #fde68a 100%)"
                : "linear-gradient(90deg, #2dd4bf 0%, #38bdf8 100%)",
            }}
          />
          {chips.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
              {chips.map((c) => (
                <div
                  key={c}
                  style={{
                    display: "flex",
                    padding: "7px 16px",
                    borderRadius: 999,
                    border: gold ? "1px solid rgba(252,211,77,0.4)" : "1px solid rgba(94,234,212,0.35)",
                    background: gold ? "rgba(251,191,36,0.10)" : "rgba(20,184,166,0.12)",
                    fontSize: 18,
                    letterSpacing: 1,
                    color: gold ? "#fef3c7" : "#ccfbf1",
                  }}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            left: 80,
            bottom: 52,
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
      width: OG_W,
      height: OG_H,
      // An empty font list breaks the renderer, so only pass fonts we got.
      ...(fonts.length ? { fonts } : {}),
      headers: { "Cache-Control": ogCache },
    }
  );
}
