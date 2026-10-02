"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const jsx_runtime_1 = require("react/jsx-runtime");
const og_1 = require("next/og");
const public_1 = require("./sp-mock.cjs");
const admin_1 = require("./sp-mock.cjs");
const card_1 = require("./sp-card.cjs");
exports.dynamic = "force-dynamic";
const CX = 905;
const CY = 315;
/**
 * The picture shown when someone shares /species: the section's name, how
 * many care guides there are, and real fish from members' tanks orbiting
 * our sonar rings.
 */
async function GET() {
    const { count } = await public_1.supabasePublic.from("species").select("id", { count: "exact", head: true });
    const total = count ?? 0;
    // Up to three recent approved member photos, one per species.
    const { data: photoRows } = await admin_1.supabaseAdmin
        .from("species_photos")
        .select("species_id, url")
        .eq("status", "approved")
        .order("reviewed_at", { ascending: false })
        .limit(40);
    const picked = [];
    const seen = new Set();
    for (const p of (photoRows ?? [])) {
        if (seen.has(p.species_id))
            continue;
        seen.add(p.species_id);
        picked.push(p.url);
        if (picked.length === 3)
            break;
    }
    const [main, a, b] = await Promise.all([(0, card_1.inlineImage)(picked[0]), (0, card_1.inlineImage)(picked[1]), (0, card_1.inlineImage)(picked[2])]);
    const rounded = total >= 100 ? `${Math.floor(total / 50) * 50}+` : String(total);
    const tagline = "With photos from real keepers' tanks";
    const [font, italic] = await Promise.all([
        (0, card_1.loadCinzel)(`FISH SPECIES Fish Species${rounded} CARE GUIDES${card_1.OG_LETTERS}`),
        (0, card_1.loadCrimsonItalic)(tagline),
    ]);
    const display = font ? "Cinzel" : "sans-serif";
    return new og_1.ImageResponse(((0, jsx_runtime_1.jsxs)("div", { style: {
            width: card_1.OG_W,
            height: card_1.OG_H,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            background: "#020b18",
            fontFamily: display,
            color: "white",
        }, children: [(0, jsx_runtime_1.jsx)(card_1.Backdrop, { cx: CX, cy: CY }), (0, jsx_runtime_1.jsx)(card_1.Medallion, { cx: CX, cy: CY, photo: main, size: 236 }), (a || b) && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(card_1.Medallion, { cx: CX - 250, cy: CY - 150, photo: a, size: 120 }), (0, jsx_runtime_1.jsx)(card_1.Medallion, { cx: CX + 205, cy: CY + 195, photo: b, size: 104 })] })), (0, jsx_runtime_1.jsx)(card_1.BrandMark, {}), (0, jsx_runtime_1.jsxs)("div", { style: {
                    position: "absolute",
                    left: 80,
                    top: 0,
                    width: 560,
                    height: card_1.OG_H,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", fontSize: 96, lineHeight: 1.02, color: "white", textShadow: "0 4px 30px rgba(0,0,0,0.5)" }, children: "Fish" }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", fontSize: 96, lineHeight: 1.02, color: "white", textShadow: "0 4px 30px rgba(0,0,0,0.5)" }, children: "Species" }), (0, jsx_runtime_1.jsx)("div", { style: {
                            display: "flex",
                            marginTop: 30,
                            width: 72,
                            height: 3,
                            borderRadius: 3,
                            background: "linear-gradient(90deg, #2dd4bf 0%, #38bdf8 100%)",
                        } }), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", marginTop: 26, fontSize: 26, letterSpacing: 4, color: "#9fd7f5" }, children: total ? `${rounded} CARE GUIDES` : "CARE GUIDES" }), (0, jsx_runtime_1.jsx)("div", { style: {
                            display: "flex",
                            marginTop: 14,
                            fontFamily: italic ? "Crimson" : "sans-serif",
                            fontStyle: "italic",
                            fontSize: 32,
                            color: "rgba(255,255,255,0.85)",
                        }, children: tagline })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    position: "absolute",
                    left: 80,
                    bottom: 60,
                    display: "flex",
                    fontSize: 17,
                    letterSpacing: 4,
                    color: "rgba(194,228,250,0.5)",
                }, children: "undergroundaquarium.com" })] })), {
        width: card_1.OG_W,
        height: card_1.OG_H,
        fonts: [
            ...(font ? [{ name: "Cinzel", data: font, weight: 700, style: "normal" }] : []),
            ...(italic ? [{ name: "Crimson", data: italic, weight: 500, style: "italic" }] : []),
        ],
        headers: { "Cache-Control": card_1.ogCache },
    });
}
