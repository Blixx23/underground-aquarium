"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const jsx_runtime_1 = require("react/jsx-runtime");
const og_1 = require("next/og");
const public_1 = require("./sp-mock.cjs");
const card_1 = require("./sp-card.cjs");
exports.dynamic = "force-dynamic";
const CX = 905;
const CY = 315;
const num = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
/**
 * The picture shown when someone shares a species page: the fish's name,
 * the numbers people want at a glance, and a member's photo of it (or our
 * fish when nobody has added one yet).
 */
async function GET(_request, { params }) {
    const { slug } = await params;
    const { data } = await public_1.supabasePublic
        .from("species")
        .select("common_name, scientific_name, max_size_in, min_tank_gal, temp_min_f, temp_max_f, care_level")
        .eq("slug", slug)
        .maybeSingle();
    const s = data ?? null;
    if (!s)
        return new Response("Not found", { status: 404 });
    const { data: photoRows } = await public_1.supabasePublic.rpc("public_species_photos", { p_slug: slug });
    const cover = (photoRows ?? [])[0]?.url ?? null;
    const photo = await (0, card_1.inlineImage)(cover);
    const facts = [
        s.max_size_in != null ? `Up to ${num(s.max_size_in)} in` : null,
        s.min_tank_gal != null ? `${num(s.min_tank_gal)} gal+` : null,
        s.temp_min_f != null && s.temp_max_f != null ? `${num(s.temp_min_f)}-${num(s.temp_max_f)}°F` : null,
        s.care_level ? `${s.care_level.charAt(0).toUpperCase()}${s.care_level.slice(1)} care` : null,
    ].filter((x) => !!x);
    const name = s.common_name;
    const nameSize = name.length <= 12 ? 80 : name.length <= 18 ? 70 : name.length <= 26 ? 62 : name.length <= 36 ? 52 : 44;
    const [font, italic] = await Promise.all([
        (0, card_1.loadCinzel)(`${name}CARE GUIDE${facts.join("")}${facts.join("").toUpperCase()}${card_1.OG_LETTERS}`),
        s.scientific_name ? (0, card_1.loadCrimsonItalic)(s.scientific_name) : Promise.resolve(null),
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
        }, children: [(0, jsx_runtime_1.jsx)(card_1.Backdrop, { cx: CX, cy: CY }), (0, jsx_runtime_1.jsx)(card_1.Medallion, { cx: CX, cy: CY, photo: photo, size: 256 }), (0, jsx_runtime_1.jsx)(card_1.BrandMark, {}), (0, jsx_runtime_1.jsxs)("div", { style: {
                    position: "absolute",
                    left: 80,
                    top: 128,
                    width: 580,
                    height: 410,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: "flex", fontSize: 22, letterSpacing: 5, color: "#5eead4" }, children: "CARE GUIDE" }), (0, jsx_runtime_1.jsx)("div", { style: {
                            display: "flex",
                            marginTop: 12,
                            fontSize: nameSize,
                            lineHeight: 1.06,
                            color: "white",
                            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                        }, children: name }), s.scientific_name && ((0, jsx_runtime_1.jsx)("div", { style: {
                            display: "flex",
                            marginTop: 12,
                            fontFamily: italic ? "Crimson" : "sans-serif",
                            fontStyle: "italic",
                            fontSize: 32,
                            color: "rgba(194,228,250,0.8)",
                        }, children: s.scientific_name })), (0, jsx_runtime_1.jsx)("div", { style: {
                            display: "flex",
                            marginTop: 28,
                            width: 72,
                            height: 3,
                            borderRadius: 3,
                            background: "linear-gradient(90deg, #2dd4bf 0%, #38bdf8 100%)",
                        } }), facts.length > 0 && ((0, jsx_runtime_1.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 24 }, children: facts.map((f) => ((0, jsx_runtime_1.jsx)("div", { style: {
                                display: "flex",
                                padding: "7px 16px",
                                borderRadius: 999,
                                border: "1px solid rgba(94,234,212,0.35)",
                                background: "rgba(20,184,166,0.12)",
                                fontSize: 19,
                                letterSpacing: 1,
                                color: "#ccfbf1",
                            }, children: f }, f))) }))] }), (0, jsx_runtime_1.jsx)("div", { style: {
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
