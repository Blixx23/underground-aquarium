"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { isInvert, swimZone, type Species, type StockItem } from "@/lib/tankBuilder/engine";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * How a species actually looks, roughly: back colour, belly colour, fin tint,
 * an optional stripe or bands, and body shape. Muted, natural tones rather
 * than a crayon box, so the tank reads like a real one.
 */
export type FishLook = {
  back: string;
  belly: string;
  fin: string;
  /** A lateral stripe (neon tetra blue, rasbora line). */
  stripe?: string;
  /** Vertical bars (tiger barb, clown loach, angelfish). */
  bands?: string;
  /** Body depth as a fraction of length. */
  depth: number;
  /** Tall, flat, disc-shaped fish get a tall dorsal and anal fin. */
  tallFins?: boolean;
  /** Long flowing fins (betta, fancy guppy, fancy goldfish). */
  flowing?: boolean;
};

const LOOKS: [RegExp, Partial<FishLook>][] = [
  [/neon tetra|cardinal/i, { back: "#50637a", belly: "#c9d2dc", fin: "#9fb3c8", stripe: "#39c6f0", depth: 0.28 }],
  [/ember|flame|bleeding heart|serpae|red phantom/i, { back: "#b5532e", belly: "#e9a07a", fin: "#d4704a", depth: 0.34 }],
  [/rummy|rummynose/i, { back: "#8e9aa3", belly: "#dfe5ea", fin: "#b9c2c8", depth: 0.28 }],
  [/black skirt|black widow|black phantom/i, { back: "#3c4148", belly: "#8d9399", fin: "#2c3036", depth: 0.42 }],
  [/lemon|gold tetra|yellow/i, { back: "#b39b3f", belly: "#efe2a6", fin: "#d8c066", depth: 0.34 }],
  [/harlequin|lambchop|espei|hengel/i, { back: "#b86a4b", belly: "#e9b99f", fin: "#d98a66", depth: 0.34 }],
  [/chili|mosquito|phoenix|strawberry/i, { back: "#b3422b", belly: "#e0826a", fin: "#c9553a", stripe: "#3a1c16", depth: 0.26 }],
  [/zebra danio|leopard danio|glofish|pearl danio|danio/i, { back: "#6e7d8c", belly: "#dde4ea", fin: "#b0bcc6", stripe: "#2e4f7a", depth: 0.24 }],
  [/white cloud/i, { back: "#8a7a5c", belly: "#e6dcc3", fin: "#c9573a", stripe: "#d8c27a", depth: 0.24 }],
  [/tiger barb/i, { back: "#c99a52", belly: "#f0d8a6", fin: "#c9492f", bands: "#1f1b17", depth: 0.46 }],
  [/cherry barb/i, { back: "#a8412f", belly: "#dc8a74", fin: "#b9503c", stripe: "#5a2a22", depth: 0.36 }],
  [/barb/i, { back: "#b39052", belly: "#eedcb2", fin: "#c9a36a", depth: 0.4 }],
  [/betta/i, { back: "#5b1f35", belly: "#8f3552", fin: "#7a2848", depth: 0.3, flowing: true }],
  [/honey gourami|sunset/i, { back: "#c47a2c", belly: "#edc27f", fin: "#d99240", depth: 0.46 }],
  [/dwarf gourami|powder blue|flame dwarf/i, { back: "#3f6f9c", belly: "#c96b4a", fin: "#4f82ad", bands: "#b0503a", depth: 0.5 }],
  [/pearl gourami/i, { back: "#8a7b68", belly: "#e1d5c0", fin: "#a8927a", depth: 0.46 }],
  [/gourami/i, { back: "#6e8aa0", belly: "#cdd8e0", fin: "#8ea4b5", depth: 0.46 }],
  [/angelfish|altum|koi angel|platinum angel|marble angel/i, { back: "#b9bec2", belly: "#eef0f1", fin: "#c8cdd1", bands: "#2b2f33", depth: 0.95, tallFins: true }],
  [/discus/i, { back: "#8f4a2c", belly: "#d2875a", fin: "#a45a36", bands: "#5c2c1a", depth: 0.95, tallFins: true }],
  [/\bram\b|german blue|bolivian/i, { back: "#b79a3b", belly: "#6fa0c8", fin: "#c26b3c", depth: 0.5 }],
  [/oscar/i, { back: "#3d3a2c", belly: "#7d6a42", fin: "#2f2c22", stripe: "#c9612f", depth: 0.5 }],
  [/electric yellow|yellow lab/i, { back: "#d4b52c", belly: "#f2e282", fin: "#1f1f1f", depth: 0.38 }],
  [/demasoni|cobalt|acei|electric blue|johanni|kenyi|zebra cichlid|mbuna/i, { back: "#2f5e98", belly: "#7fa8d6", fin: "#1f3f6a", bands: "#16304f", depth: 0.4 }],
  [/peacock|red empress|sunshine/i, { back: "#3a6ba8", belly: "#e0a23a", fin: "#2f5a8e", depth: 0.4 }],
  [/cichlid|severum|convict|firemouth|jack dempsey|acara|festivum|kribensis|apistogramma/i, { back: "#6f7a64", belly: "#c8c3a0", fin: "#7c6e56", bands: "#3c3a30", depth: 0.46 }],
  [/cory|corydoras|brochis/i, { back: "#7d7058", belly: "#d9cfb6", fin: "#a8997a", depth: 0.36 }],
  [/pleco|otocinclus|oto\b|farlowella|whiptail|twig/i, { back: "#4a3d2e", belly: "#7a6a54", fin: "#3a3025", depth: 0.24 }],
  [/clown loach|tiger botia/i, { back: "#d0822e", belly: "#f0bd72", fin: "#c9402a", bands: "#1d1a16", depth: 0.3 }],
  [/kuhli/i, { back: "#b77a3a", belly: "#e3c08b", fin: "#9a6630", bands: "#2b2016", depth: 0.14 }],
  [/loach|botia|dojo/i, { back: "#8a7a5a", belly: "#d8ccad", fin: "#9d8c68", depth: 0.2 }],
  [/goldfish|oranda|ryukin|ranchu|comet|shubunkin|fantail|lionhead|pearlscale|telescope|wakin/i, { back: "#d86b22", belly: "#f4b56a", fin: "#e58a3a", depth: 0.5, flowing: true }],
  [/koi\b/i, { back: "#e9e4dc", belly: "#f7f3ec", fin: "#e0d8cc", bands: "#c8512a", depth: 0.34 }],
  [/guppy|endler/i, { back: "#7c8a8f", belly: "#dfe4e2", fin: "#d46a2f", depth: 0.3, flowing: true }],
  [/platy|swordtail/i, { back: "#c5482f", belly: "#ef9a6f", fin: "#d4613f", depth: 0.4 }],
  [/molly/i, { back: "#262a2e", belly: "#4a4f55", fin: "#1f2226", depth: 0.4 }],
  [/rainbow|blue-eye|blue eye/i, { back: "#5a7fa8", belly: "#e7c86a", fin: "#c9a24a", depth: 0.4 }],
  [/hatchet/i, { back: "#9ba7b0", belly: "#e7ecef", fin: "#c0c9cf", depth: 0.6 }],
  [/pencilfish/i, { back: "#8b6c4c", belly: "#e0cfb5", fin: "#b3533a", stripe: "#2a221a", depth: 0.18 }],
  [/shark|bala|siamese algae|flying fox/i, { back: "#5b5f63", belly: "#c9ccce", fin: "#b04a32", depth: 0.28 }],
  [/puffer/i, { back: "#8a9a4a", belly: "#efeadc", fin: "#b9b27a", depth: 0.55 }],
  [/silver dollar|pacu|piranha/i, { back: "#a8b0b6", belly: "#edf0f2", fin: "#c85a3a", depth: 0.85 }],
  [/eel|ropefish|bichir|knifefish/i, { back: "#4f4636", belly: "#8a7c62", fin: "#3e372b", depth: 0.12 }],
];

const DEFAULT_LOOK: FishLook = { back: "#7d8a92", belly: "#d7dde1", fin: "#a9b4ba", depth: 0.34 };

export function fishLook(s: Pick<Species, "common_name" | "group_name">): FishLook {
  const name = `${s.common_name} ${s.group_name ?? ""}`;
  for (const [re, look] of LOOKS) if (re.test(name)) return { ...DEFAULT_LOOK, ...look };
  return DEFAULT_LOOK;
}

/**
 * The swatch used for this species in lists and charts. Matches the fish in
 * the picture; the index is kept so callers don't change.
 */
export function speciesColor(s: Pick<Species, "common_name" | "group_name"> | string, _index: number): string {
  if (typeof s === "string") return DEFAULT_LOOK.back;
  const l = fishLook(s);
  // Something readable on dark water: the stripe if it has one, else the
  // back colour, or the belly when the back is near black.
  if (l.stripe) return l.stripe;
  return luminance(l.back) < 0.12 ? l.belly : l.back;
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const H = 240;
const WATER_TOP = 24;
const SAND = 204;

type Sprite = {
  key: string;
  slug: string;
  kind: "fish" | "shrimp" | "snail";
  x: number;
  y: number;
  len: number;
  look: FishLook;
  flip: boolean;
  dur: number;
  delay: number;
  /** 0 = back of the tank, 1 = right against the glass. */
  depth: number;
  flagged: boolean;
};

/**
 * A living picture of the build: every fish drawn in the part of the tank it
 * actually swims in, sized by how big it grows, in its real colours. The
 * fastest way to see an empty bottom, a crowded middle, or one giant among
 * minnows.
 */
export default function TankVisual({
  stock,
  flagged,
  stockingPct,
}: {
  stock: StockItem[];
  /** Species with a conflict or caution: drawn with a soft amber glow. */
  flagged?: Set<string>;
  stockingPct: number;
}) {
  const uid = useId().replace(/:/g, "");
  // The picture fills its box at any width: the drawing gets wider, never
  // squashed, so fish keep their shape from phone to desktop.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setW(Math.max(320, Math.round((H * r.width) / r.height)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sprites = useMemo(() => {
    type Seed = Omit<Sprite, "x"> & { order: number; zone: string };
    const seeds: Seed[] = [];
    const biggest = Math.max(1, ...stock.map((s) => s.species.max_size_in ?? 1));
    for (const { species: s, qty } of stock) {
      const show = Math.min(qty, qty > 20 ? 9 : 7);
      const invert = isInvert(s);
      const zone = invert ? "floor" : swimZone(s);
      const size = s.max_size_in ?? 1.5;
      const len = Math.max(13, Math.min(92, 13 + (size / Math.max(biggest, 6)) * 66));
      const look = fishLook(s);
      for (let i = 0; i < show; i++) {
        const h = hash(`${s.slug}:${i}`);
        const r2 = ((h >>> 10) % 1000) / 1000;
        const depth = ((h >>> 3) % 100) / 100;
        let y: number;
        if (invert) y = SAND - 4 - r2 * 8;
        else if (zone === "top") y = WATER_TOP + 20 + r2 * 32;
        else if (zone === "bottom") y = SAND - 12 - r2 * 20;
        else if (zone === "all") y = WATER_TOP + 32 + r2 * 130;
        else y = 76 + r2 * 68;
        const kind: Sprite["kind"] = invert ? (/snail/i.test(`${s.common_name} ${s.group_name}`) ? "snail" : "shrimp") : "fish";
        seeds.push({
          key: `${s.slug}-${i}`,
          slug: s.slug,
          kind,
          y,
          // Farther fish look a little smaller.
          len: (kind === "fish" ? len : 15) * (0.78 + depth * 0.22),
          look,
          flip: (h >>> 20) % 2 === 0,
          dur: kind === "fish" ? 6 + ((h >>> 5) % 60) / 10 : 16,
          delay: -((h >>> 7) % 60) / 10,
          depth,
          flagged: !!flagged?.has(s.slug),
          order: h % 997,
          zone,
        });
      }
    }
    // Spread each layer of the tank evenly across the width, so fish don't
    // pile up in one corner by chance.
    const byZone = new Map<string, Seed[]>();
    for (const sd of seeds) byZone.set(sd.zone, [...(byZone.get(sd.zone) ?? []), sd]);
    const out: Sprite[] = [];
    for (const list of byZone.values()) {
      list.sort((a, b) => a.order - b.order);
      const slot = (W - 70) / list.length;
      list.forEach((sd, k) => {
        const jitter = (((hash(sd.key + "x") % 1000) / 1000) - 0.5) * slot * 0.7;
        const { order: _o, zone: _z, ...rest } = sd;
        out.push({ ...rest, x: 35 + slot * (k + 0.5) + jitter });
      });
    }
    // Draw back-to-front.
    return out.sort((a, b) => a.depth - b.depth);
  }, [stock, W, flagged]);

  // Water gets a faint green-brown cast as the tank fills past its limit.
  const tint = stockingPct > 130 ? 0.35 : stockingPct >= 90 ? 0.18 : 0;

  const id = (n: string) => `${n}-${uid}`;

  return (
    <div
      ref={box}
      className="relative h-[190px] overflow-hidden rounded-2xl border border-white/10 bg-[#020b18] sm:h-[250px] lg:h-[290px]"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" role="img" aria-label="Picture of your tank with the fish you've added">
        <defs>
          <linearGradient id={id("water")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1b5a73" />
            <stop offset="0.55" stopColor="#0c3447" />
            <stop offset="1" stopColor="#06202c" />
          </linearGradient>
          <radialGradient id={id("vignette")} cx="0.5" cy="0.45" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.55" />
          </radialGradient>
          <linearGradient id={id("ray")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#dff6ff" stopOpacity="0.14" />
            <stop offset="1" stopColor="#dff6ff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id("sand")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7a6a52" />
            <stop offset="0.4" stopColor="#5a4c39" />
            <stop offset="1" stopColor="#2e271e" />
          </linearGradient>
          {/* gravel grain */}
          <filter id={id("grain")} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
            <feColorMatrix type="saturate" values="0" in="n" result="g" />
            <feComponentTransfer in="g" result="a">
              <feFuncA type="table" tableValues="0 0.35" />
            </feComponentTransfer>
            <feComposite in="a" in2="SourceGraphic" operator="in" />
          </filter>
          <filter id={id("far")}>
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <filter id={id("glow")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="b" />
            <feFlood floodColor="#f5a524" floodOpacity="0.85" />
            <feComposite in2="b" operator="in" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={id("leaf")} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1f5e34" />
            <stop offset="1" stopColor="#3f8a4e" />
          </linearGradient>
          <linearGradient id={id("wood")} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#5a4230" />
            <stop offset="1" stopColor="#2d2016" />
          </linearGradient>
          <radialGradient id={id("rock")} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#6b6f73" />
            <stop offset="1" stopColor="#2c2f33" />
          </radialGradient>
        </defs>

        {/* water */}
        <rect x="0" y={WATER_TOP} width={W} height={H - WATER_TOP} fill={`url(#${id("water")})`} />
        {tint > 0 && <rect x="0" y={WATER_TOP} width={W} height={H - WATER_TOP} fill="#4a5a2a" opacity={tint} />}

        {/* soft light shafts */}
        {[0.14, 0.38, 0.63, 0.86].map((f, i) => (
          <polygon
            key={f}
            className="tb-ray"
            style={{ animationDelay: `${-i * 2.3}s` }}
            points={`${W * f},${WATER_TOP} ${W * f + 34 + i * 6},${WATER_TOP} ${W * f + 14},${SAND} ${W * f - 40},${SAND}`}
            fill={`url(#${id("ray")})`}
          />
        ))}

        {/* back hardscape: driftwood and a background plant line */}
        <path
          d={`M${W * 0.52} ${SAND + 2} C ${W * 0.56} ${SAND - 40}, ${W * 0.6} ${SAND - 70}, ${W * 0.66} ${SAND - 96}
             M${W * 0.58} ${SAND - 50} C ${W * 0.62} ${SAND - 58}, ${W * 0.66} ${SAND - 56}, ${W * 0.71} ${SAND - 70}`}
          stroke={`url(#${id("wood")})`}
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <Plant x={26} base={SAND} height={150} leaves={9} fill={`url(#${id("leaf")})`} seed={1} />
        <Plant x={52} base={SAND} height={110} leaves={7} fill={`url(#${id("leaf")})`} seed={2} />
        <Plant x={W - 30} base={SAND} height={165} leaves={10} fill={`url(#${id("leaf")})`} seed={3} />
        <Plant x={W - 62} base={SAND} height={96} leaves={6} fill={`url(#${id("leaf")})`} seed={4} />

        {/* substrate */}
        <path
          d={`M0 ${SAND} Q ${W * 0.25} ${SAND - 7} ${W * 0.5} ${SAND - 2} T ${W} ${SAND - 5} V ${H} H 0 Z`}
          fill={`url(#${id("sand")})`}
        />
        <path
          d={`M0 ${SAND} Q ${W * 0.25} ${SAND - 7} ${W * 0.5} ${SAND - 2} T ${W} ${SAND - 5} V ${H} H 0 Z`}
          fill="#fff"
          filter={`url(#${id("grain")})`}
          opacity="0.5"
        />
        <ellipse cx={W * 0.74} cy={SAND + 1} rx="30" ry="15" fill={`url(#${id("rock")})`} />
        <ellipse cx={W * 0.79} cy={SAND + 4} rx="18" ry="9" fill={`url(#${id("rock")})`} />
        <ellipse cx={W * 0.3} cy={SAND + 3} rx="14" ry="7" fill={`url(#${id("rock")})`} />

        {/* floating specks */}
        <g fill="#cfe9f5" opacity="0.25">
          {Array.from({ length: 18 }, (_, i) => {
            const h = hash(`speck${i}`);
            return <circle key={i} className="tb-speck" cx={(h % 1000) / 1000 * W} cy={WATER_TOP + ((h >>> 10) % 170)} r={0.6 + (h % 3) * 0.3} style={{ animationDelay: `${-(h % 90) / 10}s` }} />;
          })}
        </g>

        {/* fish, back to front */}
        {sprites.map((sp) => (
          <g
            key={sp.key}
            transform={`translate(${sp.x} ${sp.y})`}
            opacity={0.72 + sp.depth * 0.28}
            filter={sp.flagged ? `url(#${id("glow")})` : sp.depth < 0.25 ? `url(#${id("far")})` : undefined}
          >
            <g className="tb-swim" style={{ animationDuration: `${sp.dur}s`, animationDelay: `${sp.delay}s` }}>
              <g transform={sp.flip ? "scale(-1 1)" : undefined}>
                {sp.kind === "fish" ? (
                  <FishShape len={sp.len} look={sp.look} gid={`${id("f")}-${sp.key}`} />
                ) : sp.kind === "shrimp" ? (
                  <ShrimpShape look={sp.look} slug={sp.slug} />
                ) : (
                  <SnailShape slug={sp.slug} />
                )}
              </g>
            </g>
          </g>
        ))}

        {/* bubbles from the filter outlet */}
        <g className="tb-bubbles" fill="none" stroke="#dff6ff" strokeOpacity="0.45">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={W - 18 + (i % 2) * 3} cy={SAND - 6} r={1.2 + (i % 3) * 0.7} style={{ animationDelay: `${i * 0.6}s` }} />
          ))}
        </g>

        {/* depth vignette, surface line and glass */}
        <rect x="0" y={WATER_TOP} width={W} height={H - WATER_TOP} fill={`url(#${id("vignette")})`} />
        <rect x="0" y={WATER_TOP} width={W} height="2" fill="#bfeaff" opacity="0.18" />
        <rect x="0" y="0" width={W} height={WATER_TOP} fill="#040d16" />
        <rect x="1" y="1" width={W - 2} height={H - 2} fill="none" stroke="#b6c4cf" strokeOpacity="0.18" strokeWidth="2" rx="10" />
      </svg>

      {stock.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full bg-black/40 px-4 py-2 font-sans text-sm text-ocean-100 backdrop-blur">
            Your fish will swim here
          </p>
        </div>
      )}

      <style>{`
        .tb-swim { animation-name: tbSwim; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
        @keyframes tbSwim { 0% { transform: translate(-12px, -1px); } 50% { transform: translate(0px, 2px); } 100% { transform: translate(12px, 0px); } }
        .tb-bubbles circle { animation: tbRise 3.6s linear infinite; }
        @keyframes tbRise { from { transform: translateY(0); opacity: .7 } to { transform: translateY(-180px); opacity: 0 } }
        .tb-ray { animation: tbRay 9s ease-in-out infinite alternate; }
        @keyframes tbRay { from { opacity: .5 } to { opacity: 1 } }
        .tb-speck { animation: tbSpeck 9s ease-in-out infinite alternate; }
        @keyframes tbSpeck { from { transform: translate(0, 0) } to { transform: translate(6px, -8px) } }
        @media (prefers-reduced-motion: reduce) { .tb-swim, .tb-bubbles circle, .tb-ray, .tb-speck { animation: none; } }
      `}</style>
    </div>
  );
}

/** A fish in profile: shaded body, fins with some translucency, gill line, eye. */
function FishShape({ len, look, gid }: { len: number; look: FishLook; gid: string }) {
  const half = len / 2;
  const h = len * look.depth * 0.5; // half-height
  const snout = half;
  const tailRoot = -half * 0.62;
  const body = `M ${snout} ${h * 0.05}
    C ${half * 0.72} ${-h * 0.9}, ${-half * 0.2} ${-h * 1.05}, ${tailRoot} ${-h * 0.28}
    L ${tailRoot} ${h * 0.28}
    C ${-half * 0.2} ${h * 1.05}, ${half * 0.72} ${h * 0.85}, ${snout} ${h * 0.05} Z`;
  const tailLen = look.flowing ? half * 0.75 : half * 0.42;
  const tailSpread = look.flowing ? h * 1.4 : Math.max(h * 0.9, len * 0.12);
  const tail = look.flowing
    ? `M ${tailRoot + 1} 0 C ${tailRoot - tailLen * 0.5} ${-tailSpread * 0.4}, ${tailRoot - tailLen} ${-tailSpread}, ${tailRoot - tailLen * 1.05} ${-tailSpread * 0.6}
       C ${tailRoot - tailLen * 0.8} 0, ${tailRoot - tailLen * 1.05} ${tailSpread * 0.2}, ${tailRoot - tailLen * 1.05} ${tailSpread * 0.6}
       C ${tailRoot - tailLen} ${tailSpread}, ${tailRoot - tailLen * 0.5} ${tailSpread * 0.4}, ${tailRoot + 1} 0 Z`
    : `M ${tailRoot + 1} 0 L ${tailRoot - tailLen} ${-tailSpread} Q ${tailRoot - tailLen * 0.6} 0 ${tailRoot - tailLen} ${tailSpread} Z`;
  const dorsalH = look.tallFins ? h * 1.5 : look.flowing ? h * 0.9 : h * 0.55;
  const dorsal = `M ${half * 0.1} ${-h * 0.92} Q ${-half * 0.1} ${-h - dorsalH} ${-half * 0.42} ${-h * 0.62} Z`;
  const anal = look.tallFins
    ? `M ${half * 0.05} ${h * 0.9} Q ${-half * 0.15} ${h + dorsalH} ${-half * 0.45} ${h * 0.55} Z`
    : `M ${-half * 0.05} ${h * 0.8} Q ${-half * 0.2} ${h * 1.35} ${-half * 0.45} ${h * 0.5} Z`;
  const eyeR = Math.max(1, len * 0.042);
  const clipId = `${gid}-clip`;

  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={look.back} />
          <stop offset="0.55" stopColor={look.belly} />
          <stop offset="1" stopColor={look.belly} stopOpacity="0.9" />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* fins behind the body */}
      <path d={tail} fill={look.fin} opacity={look.flowing ? 0.75 : 0.6} />
      <path d={dorsal} fill={look.fin} opacity="0.55" />
      <path d={anal} fill={look.fin} opacity="0.5" />
      {/* body */}
      <path d={body} fill={`url(#${gid})`} />
      <g clipPath={`url(#${clipId})`}>
        {look.stripe && (
          <rect x={-half} y={-h * 0.18} width={len * 0.95} height={Math.max(1, h * 0.22)} fill={look.stripe} opacity="0.85" />
        )}
        {look.bands &&
          [0.3, -0.05, -0.38].map((f) => (
            <rect key={f} x={half * f - len * 0.035} y={-h * 1.2} width={len * 0.07} height={h * 2.4} fill={look.bands} opacity="0.55" />
          ))}
        {/* sheen along the back */}
        <ellipse cx={half * 0.05} cy={-h * 0.45} rx={half * 0.6} ry={h * 0.22} fill="#fff" opacity="0.12" />
      </g>
      {/* gill line, pectoral fin, eye */}
      <path d={`M ${half * 0.52} ${-h * 0.55} Q ${half * 0.42} 0 ${half * 0.52} ${h * 0.55}`} stroke="#000" strokeOpacity="0.18" strokeWidth={Math.max(0.5, len * 0.012)} fill="none" />
      <path d={`M ${half * 0.4} ${h * 0.2} Q ${half * 0.2} ${h * 0.55} ${half * 0.12} ${h * 0.3} Z`} fill={look.fin} opacity="0.45" />
      <circle cx={half * 0.7} cy={-h * 0.14} r={eyeR} fill="#101418" />
      <circle cx={half * 0.7 + eyeR * 0.35} cy={-h * 0.14 - eyeR * 0.35} r={eyeR * 0.35} fill="#fff" opacity="0.7" />
    </g>
  );
}

function ShrimpShape({ look, slug }: { look: FishLook; slug: string }) {
  // Cherry, blue, yellow... use the species' own colour when it has one.
  void look;
  const c = /blue/.test(slug)
    ? "#2f5ea8"
    : /yellow|sunkist|orange/.test(slug)
    ? "#d59a2a"
    : /amano|ghost|glass|whisker|bamboo|vampire/.test(slug)
    ? "#a79f8e"
    : /green|jade/.test(slug)
    ? "#4f7a3a"
    : /black|chocolate/.test(slug)
    ? "#3a2a24"
    : "#b3402f";
  return (
    <g opacity="0.9">
      <path d="M 7 0 C 5 -4.5, -3 -5, -7 -0.5 C -8 0.8, -6.5 1.4, -5 1 C -2 -0.5, 3 -0.8, 7 0 Z" fill={c} />
      <path d="M 7 -0.5 L 13 -4 M 7 -0.2 L 13 -1.2" stroke={c} strokeWidth="0.6" opacity="0.8" />
      <path d="M -2 1 L -3 3.5 M 0 1 L -0.5 3.5 M 2 0.8 L 2 3.2" stroke={c} strokeWidth="0.5" opacity="0.7" />
    </g>
  );
}

function SnailShape({ slug }: { slug: string }) {
  const shell = /nerite|zebra/.test(slug) ? "#3b3326" : /gold|inca|yellow/.test(slug) ? "#c79b3a" : /blue/.test(slug) ? "#5a6f8a" : /ramshorn|red/.test(slug) ? "#8a3b2a" : "#6b5236";
  return (
    <g>
      <path d="M -8 3 C -6 1.5, 6 1.5, 9 3 Z" fill="#b9a98a" opacity="0.9" />
      <circle cx="-1" cy="-1.5" r="5.5" fill={shell} />
      <path d="M -1 -1.5 m -3.2 0 a 3.2 3.2 0 1 0 6.4 0 a 2 2 0 1 0 -4 0" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="0.7" />
    </g>
  );
}

/** A leafy stem plant (think Amazon sword / hygrophila), gently swaying. */
function Plant({ x, base, height, leaves, fill, seed }: { x: number; base: number; height: number; leaves: number; fill: string; seed: number }) {
  const items = Array.from({ length: leaves }, (_, i) => {
    const h = hash(`plant${seed}-${i}`);
    const t = (i + 1) / (leaves + 1);
    const lean = (((h % 100) / 100) - 0.5) * 30;
    const lx = x + lean * t;
    const len = 18 + ((h >>> 8) % 18) * (1 - t * 0.5);
    const side = i % 2 === 0 ? 1 : -1;
    const ang = side * (35 + ((h >>> 4) % 25));
    return { t, lx, len, ang, y: base - height * t };
  });
  return (
    <g className="tb-sway" style={{ transformOrigin: `${x}px ${base}px`, animation: `tbSway ${7 + seed}s ease-in-out infinite alternate` }}>
      <path d={`M ${x} ${base} Q ${x + 6} ${base - height * 0.5} ${x + (seed % 2 ? 8 : -8)} ${base - height}`} stroke="#1d4a2a" strokeWidth="2" fill="none" />
      {items.map((l, i) => (
        <ellipse
          key={i}
          cx={l.lx}
          cy={l.y}
          rx={l.len / 2}
          ry={l.len / 6}
          fill={fill}
          opacity={0.85}
          transform={`rotate(${l.ang} ${l.lx} ${l.y}) translate(${(l.len / 2) * Math.sign(l.ang)} 0)`}
        />
      ))}
      <style>{`@keyframes tbSway { from { transform: rotate(-1.5deg) } to { transform: rotate(1.5deg) } }`}</style>
    </g>
  );
}
