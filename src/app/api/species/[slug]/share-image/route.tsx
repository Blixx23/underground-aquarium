import { ImageResponse } from "next/og";
import { supabasePublic } from "@/lib/supabase/public";
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

import { tempF } from "@/lib/units";
export const dynamic = "force-dynamic";

const CX = 905;
const CY = 315;

type Species = {
  common_name: string;
  scientific_name: string | null;
  max_size_in: number | null;
  min_tank_gal: number | null;
  temp_min_f: number | null;
  temp_max_f: number | null;
  care_level: string | null;
};

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * The picture shown when someone shares a species page: the fish's name,
 * the numbers people want at a glance, and a member's photo of it (or our
 * fish when nobody has added one yet).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabasePublic
    .from("species")
    .select("common_name, scientific_name, max_size_in, min_tank_gal, temp_min_f, temp_max_f, care_level")
    .eq("slug", slug)
    .maybeSingle();
  const s = (data as Species | null) ?? null;
  if (!s) return new Response("Not found", { status: 404 });

  const { data: photoRows } = await supabasePublic.rpc("public_species_photos", { p_slug: slug });
  const cover = ((photoRows ?? []) as { url: string }[])[0]?.url ?? null;
  const photo = await inlineImage(cover);

  const facts = [
    s.max_size_in != null ? `Up to ${num(s.max_size_in)} in` : null,
    s.min_tank_gal != null ? `${num(s.min_tank_gal)} gal+` : null,
    s.temp_min_f != null && s.temp_max_f != null ? tempF(s.temp_min_f, s.temp_max_f) : null,
    s.care_level ? `${s.care_level.charAt(0).toUpperCase()}${s.care_level.slice(1)} care` : null,
  ].filter((x): x is string => !!x);

  const name = s.common_name;
  const nameSize =
    name.length <= 12 ? 80 : name.length <= 18 ? 70 : name.length <= 26 ? 62 : name.length <= 36 ? 52 : 44;
  const [font, italic] = await Promise.all([
    loadCinzel(`${name}CARE GUIDE${facts.join("")}${facts.join("").toUpperCase()}${OG_LETTERS}`),
    s.scientific_name ? loadCrimsonItalic(s.scientific_name) : Promise.resolve(null),
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
        <Medallion cx={CX} cy={CY} photo={photo} size={256} />
        <BrandMark />

        <div
          style={{
            position: "absolute",
            left: 80,
            top: 128,
            width: 580,
            height: 410,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, color: "#5eead4" }}>CARE GUIDE</div>
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: nameSize,
              lineHeight: 1.06,
              color: "white",
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}
          >
            {name}
          </div>
          {s.scientific_name && (
            <div
              style={{
                display: "flex",
                marginTop: 12,
                fontFamily: italic ? "Crimson" : "sans-serif",
                fontStyle: "italic",
                fontSize: 32,
                color: "rgba(194,228,250,0.8)",
              }}
            >
              {s.scientific_name}
            </div>
          )}
          <div
            style={{
              display: "flex",
              marginTop: 28,
              width: 72,
              height: 3,
              borderRadius: 3,
              background: "linear-gradient(90deg, #2dd4bf 0%, #38bdf8 100%)",
            }}
          />
          {facts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }}>
              {facts.map((f) => (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    padding: "7px 16px",
                    borderRadius: 999,
                    border: "1px solid rgba(94,234,212,0.35)",
                    background: "rgba(20,184,166,0.12)",
                    fontSize: 19,
                    letterSpacing: 1,
                    color: "#ccfbf1",
                  }}
                >
                  {f}
                </div>
              ))}
            </div>
          )}
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
