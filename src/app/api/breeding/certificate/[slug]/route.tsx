import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { loadGuide } from "@/lib/breeding/guides";
import { classForPoints } from "@/lib/society/classes";
import { CINZEL_600, GARAMOND_400, GARAMOND_400_ITALIC, GARAMOND_600, GARAMOND_500_ITALIC } from "@/lib/society/certificateFonts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const W = 1200;
const H = 927; // US Letter landscape, like the real certificate
const IVORY = "#fbf7ee";
const INK = "#171a1f";
const SOFT = "#45454a";
const BRASS = "#996e24";
const BRASS_DEEP = "#80591a";
const BRASS_LIGHT = "#c7a154";

const font = (b64: string) => {
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

/**
 * A preview of the Certified Breeder certificate for one species, drawn to
 * look like the real one and stamped SAMPLE across the middle. Plain, it's
 * the page's share picture. With ?me=1 it carries the signed-in visitor's
 * own name (read from their session, never from the address), so nobody can
 * make a "certificate" with someone else's name on it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = await loadGuide(slug);
  if (!guide || guide.program !== "bap") return new Response("Not found", { status: 404 });

  const personal = new URL(request.url).searchParams.get("me") === "1";
  let name = "Your Name Here";
  if (personal) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();
        const prof = p as { full_name?: string | null; username?: string | null } | null;
        name = prof?.full_name?.trim() || prof?.username || name;
      }
    } catch {
      /* not signed in: the sample name stays */
    }
  }
  name = name.slice(0, 40);

  const title = `Certified ${guide.name} Breeder`;
  const letter = guide.points != null ? classForPoints(guide.points) : null;
  const detail = [
    "Breeder Award Program",
    guide.points != null ? `${guide.points} points` : null,
    letter ? `Class ${letter}` : null,
  ]
    .filter(Boolean)
    .join("   ·   ");
  const nameSize = name.length > 28 ? 52 : name.length > 20 ? 62 : 72;
  const titleSize = title.length > 44 ? 38 : title.length > 34 ? 44 : 52;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const img = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", background: IVORY, position: "relative", fontFamily: "Garamond" }}>
        {/* Frame: brass rule, gap, fine inner rule */}
        <div style={{ position: "absolute", top: 26, left: 26, right: 26, bottom: 26, border: `6px solid ${BRASS}`, display: "flex" }} />
        <div style={{ position: "absolute", top: 44, left: 44, right: 44, bottom: 44, border: `1.5px solid ${BRASS_LIGHT}`, display: "flex" }} />

        <div style={{ position: "absolute", top: 0, left: 0, width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ marginTop: 92, fontFamily: "Cinzel", fontSize: 21, letterSpacing: 7, color: BRASS_DEEP }}>
            UNDERGROUND AQUARIUM SOCIETY
          </div>
          <div style={{ marginTop: 14, width: 200, height: 1.5, background: BRASS_LIGHT, display: "flex" }} />
          <div style={{ marginTop: 34, fontFamily: "Cinzel", fontSize: 48, letterSpacing: 3, color: INK }}>BREEDER CERTIFICATION</div>
          <div style={{ marginTop: 26, fontFamily: "GaramondItalic", fontSize: 27, color: SOFT }}>This is to certify that</div>
          <div style={{ marginTop: 14, fontFamily: "GaramondBold", fontSize: nameSize, color: INK, lineHeight: 1.1 }}>{name}</div>
          <div style={{ marginTop: 10, width: 560, height: 1.2, background: BRASS_LIGHT, display: "flex" }} />
          <div style={{ marginTop: 20, fontSize: 23, color: SOFT }}>
            has spawned and raised this species under Society peer review and is a
          </div>
          <div style={{ marginTop: 14, fontFamily: "GaramondTitle", fontSize: titleSize, color: BRASS_DEEP }}>{title}</div>
          {guide.scientific && (
            <div style={{ marginTop: 6, fontFamily: "GaramondItalic", fontSize: 24, color: SOFT }}>{guide.scientific}</div>
          )}
          <div style={{ marginTop: 10, fontSize: 20, color: SOFT }}>{detail}</div>
        </div>

        {/* Bottom row: date | seal | signature */}
        <div style={{ position: "absolute", left: 150, bottom: 118, width: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: "GaramondItalic", fontSize: 28, color: INK }}>{today}</div>
          <div style={{ marginTop: 6, width: 300, height: 1.2, background: INK, display: "flex" }} />
          <div style={{ marginTop: 8, fontFamily: "Cinzel", fontSize: 13, letterSpacing: 2.5, color: SOFT }}>DATE OF ISSUE</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: W / 2 - 74,
            bottom: 96,
            width: 148,
            height: 148,
            borderRadius: 74,
            border: `4px solid ${BRASS}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5ecd6",
          }}
        >
          <div style={{ width: 120, height: 120, borderRadius: 60, border: `1.5px solid ${BRASS_LIGHT}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "Cinzel", fontSize: 34, color: BRASS_DEEP, letterSpacing: 2 }}>UAS</div>
            <div style={{ fontFamily: "Cinzel", fontSize: 10, color: BRASS_DEEP, letterSpacing: 2 }}>SOCIETY</div>
            <div style={{ fontFamily: "Cinzel", fontSize: 10, color: BRASS_DEEP, letterSpacing: 2 }}>EST. 2026</div>
          </div>
        </div>
        <div style={{ position: "absolute", right: 150, bottom: 118, width: 300, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ fontFamily: "GaramondItalic", fontSize: 30, color: "#0d4069" }}>Christopher M. Lewis</div>
          <div style={{ marginTop: 6, width: 300, height: 1.2, background: INK, display: "flex" }} />
          <div style={{ marginTop: 8, fontFamily: "Cinzel", fontSize: 13, letterSpacing: 2.5, color: SOFT }}>FOUNDER &amp; JUDGE</div>
        </div>

        {/* SAMPLE: this picture is never a real certificate */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: W,
            height: H,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontFamily: "Cinzel", fontSize: 230, letterSpacing: 24, color: "rgba(153,110,36,0.13)", transform: "rotate(-24deg)" }}>
            SAMPLE
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 58, left: 0, width: W, display: "flex", justifyContent: "center", fontSize: 16, color: "#8a8173" }}>
          Sample only. Real certificates carry a verification code and are issued after Society peer review.
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Cinzel", data: font(CINZEL_600), weight: 600, style: "normal" },
        { name: "Garamond", data: font(GARAMOND_400), weight: 400, style: "normal" },
        { name: "GaramondItalic", data: font(GARAMOND_400_ITALIC), weight: 400, style: "normal" },
        { name: "GaramondBold", data: font(GARAMOND_600), weight: 600, style: "normal" },
        { name: "GaramondTitle", data: font(GARAMOND_500_ITALIC), weight: 500, style: "normal" },
      ],
    }
  );
  // A personalised picture is private to the person viewing it.
  img.headers.set("Cache-Control", personal ? "private, no-store" : "public, max-age=86400, s-maxage=86400");
  return img;
}
