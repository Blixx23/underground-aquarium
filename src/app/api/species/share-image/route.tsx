import { ImageResponse } from "next/og";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseAdmin } from "@/lib/supabase/admin";
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

export const dynamic = "force-dynamic";

const CX = 905;
const CY = 315;

/**
 * The picture shown when someone shares /species: the section's name, how
 * many care guides there are, and real fish from members' tanks orbiting
 * our sonar rings.
 */
export async function GET() {
  const { count } = await supabasePublic.from("species").select("id", { count: "exact", head: true });
  const total = count ?? 0;

  // Up to three recent approved member photos, one per species.
  const { data: photoRows } = await supabaseAdmin
    .from("species_photos")
    .select("species_id, url")
    .eq("status", "approved")
    .order("reviewed_at", { ascending: false })
    .limit(40);
  const picked: string[] = [];
  const seen = new Set<string>();
  for (const p of (photoRows ?? []) as { species_id: string; url: string }[]) {
    if (seen.has(p.species_id)) continue;
    seen.add(p.species_id);
    picked.push(p.url);
    if (picked.length === 3) break;
  }
  const [main, a, b] = await Promise.all([inlineImage(picked[0]), inlineImage(picked[1]), inlineImage(picked[2])]);

  const rounded = total >= 100 ? `${Math.floor(total / 50) * 50}+` : String(total);
  const tagline = "With photos from real keepers' tanks";
  const [font, italic] = await Promise.all([
    loadCinzel(`FISH SPECIES Fish Species${rounded} CARE GUIDES${OG_LETTERS}`),
    loadCrimsonItalic(tagline),
  ]);
  const display = font ? "Cinzel" : "sans-serif";

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

        {/* Real fish from members' tanks, orbiting the rings */}
        <Medallion cx={CX} cy={CY} photo={main} size={236} />
        {(a || b) && (
          <>
            <Medallion cx={CX - 250} cy={CY - 150} photo={a} size={120} />
            <Medallion cx={CX + 205} cy={CY + 195} photo={b} size={104} />
          </>
        )}

        <BrandMark />

        <div
          style={{
            position: "absolute",
            left: 80,
            top: 0,
            width: 560,
            height: OG_H,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 96, lineHeight: 1.02, color: "white", textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
            Fish
          </div>
          <div style={{ display: "flex", fontSize: 96, lineHeight: 1.02, color: "white", textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}>
            Species
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
          <div style={{ display: "flex", marginTop: 26, fontSize: 26, letterSpacing: 4, color: "#9fd7f5" }}>
            {total ? `${rounded} CARE GUIDES` : "CARE GUIDES"}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontFamily: italic ? "Crimson" : "sans-serif",
              fontStyle: "italic",
              fontSize: 32,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {tagline}
          </div>
        </div>

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
      width: OG_W,
      height: OG_H,
      fonts: [
        ...(font ? [{ name: "Cinzel", data: font, weight: 700 as const, style: "normal" as const }] : []),
        ...(italic ? [{ name: "Crimson", data: italic, weight: 500 as const, style: "italic" as const }] : []),
      ],
      headers: { "Cache-Control": ogCache },
    }
  );
}
