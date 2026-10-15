"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import { isInvert, swimZone, type Species, type StockItem } from "@/lib/tankBuilder/engine";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
/** A steady pseudo-random 0..1 from a key, so the picture is the same on every render. */
const rnd = (key: string) => (hash(key) % 10000) / 10000;

/** The overall shape of a fish, so a cory doesn't look like a tetra. */
export type FishBody = "torpedo" | "deep" | "disc" | "round" | "puffer" | "catfish" | "pleco" | "loach" | "eel" | "betta" | "shark";

/**
 * How a species actually looks, roughly: back colour, belly colour, fin tint,
 * an optional stripe or bands, and body shape. Muted, natural tones rather
 * than a crayon box, so the fish sit naturally in the photo.
 */
export type FishLook = {
  back: string;
  belly: string;
  fin: string;
  /** A lateral stripe (neon tetra blue, rasbora line). */
  stripe?: string;
  /** Vertical bars (tiger barb, clown loach, angelfish). */
  bands?: string;
  /** Spots or blotches over the body (cory peppering, oscar marbling). */
  spots?: string;
  /** Big soft blotches rather than small spots. */
  blotchy?: boolean;
  /** Body depth as a fraction of length. */
  depth: number;
  /** Tall, flat, disc-shaped fish get a tall dorsal and anal fin. */
  tallFins?: boolean;
  /** Long flowing fins (betta, fancy guppy, fancy goldfish). */
  flowing?: boolean;
  body?: FishBody;
};

const LOOKS: [RegExp, Partial<FishLook>][] = [
  [/neon tetra|cardinal/i, { back: "#3e5470", belly: "#d23a3a", fin: "#9fb3c8", stripe: "#3fd2ff", depth: 0.27, body: "torpedo" }],
  [/ember|flame tetra|bleeding heart|serpae|red phantom/i, { back: "#c4562c", belly: "#f0a070", fin: "#e0703f", depth: 0.33, body: "torpedo" }],
  [/rummy|rummynose/i, { back: "#9aa6ae", belly: "#e3e8ec", fin: "#c9d1d6", bands: "#1d2024", depth: 0.27, body: "torpedo" }],
  [/black skirt|black widow|black phantom/i, { back: "#3c4148", belly: "#8d9399", fin: "#2c3036", depth: 0.45, body: "deep", tallFins: true }],
  [/lemon|gold tetra|yellow tetra/i, { back: "#c2a640", belly: "#f2e6aa", fin: "#e0c25a", depth: 0.34, body: "torpedo" }],
  [/harlequin|lambchop|espei|hengel/i, { back: "#c7764f", belly: "#efc0a2", fin: "#de8a62", stripe: "#1d1714", depth: 0.36, body: "deep" }],
  [/chili|mosquito|phoenix|strawberry/i, { back: "#c2432a", belly: "#e8866c", fin: "#d4553a", stripe: "#3a1c16", depth: 0.25, body: "torpedo" }],
  [/zebra danio|leopard danio|glofish|pearl danio|danio/i, { back: "#7b8a98", belly: "#e3e9ee", fin: "#b0bcc6", stripe: "#2e4f8a", depth: 0.23, body: "torpedo" }],
  [/white cloud/i, { back: "#8a7a5c", belly: "#e6dcc3", fin: "#d0583a", stripe: "#e2cc82", depth: 0.24, body: "torpedo" }],
  [/tiger barb/i, { back: "#d6a85a", belly: "#f3ddad", fin: "#d24b2e", bands: "#1f1b17", depth: 0.5, body: "deep" }],
  [/cherry barb/i, { back: "#b2402c", belly: "#e08b72", fin: "#c2503a", stripe: "#5a2a22", depth: 0.36, body: "deep" }],
  [/barb/i, { back: "#c09a55", belly: "#efdcb2", fin: "#cfa36a", depth: 0.42, body: "deep" }],
  [/female betta/i, { back: "#6a2a3e", belly: "#a2455f", fin: "#8a3550", depth: 0.3, body: "deep" }],
  [/betta/i, { back: "#5a1730", belly: "#b0304e", fin: "#c12f55", depth: 0.32, flowing: true, body: "betta" }],
  [/honey gourami|sunset/i, { back: "#d0822e", belly: "#f2c47f", fin: "#e09440", depth: 0.46, body: "deep" }],
  [/dwarf gourami|powder blue|flame dwarf/i, { back: "#3f74a8", belly: "#d06c48", fin: "#5a8fc0", bands: "#c0553a", depth: 0.5, body: "deep" }],
  [/pearl gourami/i, { back: "#8a7b68", belly: "#e8b07a", fin: "#a8927a", depth: 0.46, body: "deep" }],
  [/gourami/i, { back: "#6e8aa8", belly: "#d2dde6", fin: "#8ea4b5", depth: 0.46, body: "deep" }],
  [/angelfish|altum|koi angel|platinum angel|marble angel/i, { back: "#c3c8cc", belly: "#f2f4f5", fin: "#d6dbde", bands: "#26292d", depth: 1, tallFins: true, body: "disc" }],
  [/discus/i, { back: "#a3502c", belly: "#e09a5f", fin: "#b5623a", bands: "#5c2c1a", depth: 0.95, tallFins: true, body: "disc" }],
  [/\bram\b|german blue|bolivian/i, { back: "#c4a43e", belly: "#74a8d2", fin: "#d06b3c", depth: 0.52, body: "deep" }],
  [/oscar/i, { back: "#3a382a", belly: "#6e5c3a", fin: "#2f2c22", spots: "#d2662c", blotchy: true, depth: 0.5, body: "deep" }],
  [/electric yellow|yellow lab/i, { back: "#e2c22e", belly: "#f6e88a", fin: "#1f1f1f", depth: 0.38, body: "deep" }],
  [/demasoni|cobalt|acei|johanni|kenyi|zebra cichlid|mbuna/i, { back: "#2f63a8", belly: "#86b0de", fin: "#1f3f6a", bands: "#16304f", depth: 0.4, body: "deep" }],
  [/peacock|red empress|sunshine/i, { back: "#3a6ba8", belly: "#e8a83a", fin: "#2f5a8e", depth: 0.4, body: "deep" }],
  [/cichlid|severum|convict|firemouth|jack dempsey|acara|festivum|kribensis|apistogramma/i, { back: "#6f7a64", belly: "#cfc8a0", fin: "#7c6e56", bands: "#2f2d26", depth: 0.46, body: "deep" }],
  [/cory|corydoras|brochis/i, { back: "#5f6a46", belly: "#e2d6b8", fin: "#b5a98a", spots: "#2a2a1c", depth: 0.4, body: "catfish" }],
  [/otocinclus|oto\b/i, { back: "#5a4c38", belly: "#d8cdb2", fin: "#6a5a44", stripe: "#2a2218", depth: 0.24, body: "pleco" }],
  [/pleco|farlowella|whiptail|twig/i, { back: "#4a3d2e", belly: "#7a6a54", fin: "#3a3025", spots: "#c9b98e", depth: 0.28, body: "pleco" }],
  [/clown loach|tiger botia/i, { back: "#e08a2e", belly: "#f4c278", fin: "#d0402a", bands: "#1d1a16", depth: 0.3, body: "loach" }],
  [/kuhli/i, { back: "#c4823a", belly: "#ecca92", fin: "#9a6630", bands: "#2b2016", depth: 0.12, body: "eel" }],
  [/loach|botia|dojo/i, { back: "#8a7a5a", belly: "#ddd1b2", fin: "#9d8c68", depth: 0.22, body: "loach" }],
  [/goldfish|oranda|ryukin|ranchu|comet|shubunkin|fantail|lionhead|pearlscale|telescope|wakin/i, { back: "#e06a1e", belly: "#f6bc6e", fin: "#ef8c3a", depth: 0.56, flowing: true, body: "round" }],
  [/koi\b/i, { back: "#ece6dc", belly: "#f8f4ee", fin: "#e3dace", bands: "#d0532a", depth: 0.34, body: "torpedo" }],
  [/guppy|endler/i, { back: "#8a979c", belly: "#e3e8e6", fin: "#e0742f", depth: 0.3, flowing: true, body: "torpedo" }],
  [/platy|swordtail/i, { back: "#d0492e", belly: "#f2a070", fin: "#e0623f", depth: 0.42, body: "deep" }],
  [/molly/i, { back: "#262a2e", belly: "#4a4f55", fin: "#1f2226", depth: 0.42, body: "deep" }],
  [/rainbow|blue-eye|blue eye/i, { back: "#5a82b0", belly: "#ecca6a", fin: "#d0a64a", depth: 0.42, body: "deep" }],
  [/hatchet/i, { back: "#a6b2ba", belly: "#eef2f4", fin: "#c6ced4", depth: 0.62, body: "deep" }],
  [/pencilfish/i, { back: "#8b6c4c", belly: "#e3d3b8", fin: "#b9553a", stripe: "#2a221a", depth: 0.18, body: "torpedo" }],
  [/shark|bala|siamese algae|flying fox/i, { back: "#636870", belly: "#d4d7d9", fin: "#b04a32", depth: 0.28, body: "shark" }],
  [/puffer/i, { back: "#8e9e4a", belly: "#f3eedf", fin: "#b9b27a", bands: "#3a3a1e", depth: 0.62, body: "puffer" }],
  [/silver dollar|pacu|piranha/i, { back: "#aeb6bc", belly: "#f0f3f5", fin: "#cf5a3a", depth: 0.9, body: "disc" }],
  [/eel|ropefish|bichir|knifefish/i, { back: "#4f4636", belly: "#8a7c62", fin: "#3e372b", depth: 0.12, body: "eel" }],
];

const DEFAULT_LOOK: FishLook = { back: "#7d8a92", belly: "#d7dde1", fin: "#a9b4ba", depth: 0.34 };

export function fishLook(s: Pick<Species, "common_name" | "group_name">): FishLook {
  // The fish's own name first, so a honey gourami (group "Gouramis & Bettas")
  // isn't drawn as a betta; the group only fills in when the name doesn't match.
  for (const [re, look] of LOOKS) if (re.test(s.common_name)) return { ...DEFAULT_LOOK, ...look };
  for (const [re, look] of LOOKS) if (re.test(s.group_name ?? "")) return { ...DEFAULT_LOOK, ...look };
  return DEFAULT_LOOK;
}

function bodyOf(look: FishLook): FishBody {
  if (look.body) return look.body;
  if (look.depth >= 0.85) return "disc";
  if (look.depth <= 0.15) return "eel";
  return look.depth >= 0.4 ? "deep" : "torpedo";
}

/**
 * The swatch used for this species in lists and charts. Matches the fish in
 * the picture; the index is kept so callers don't change.
 */
export function speciesColor(s: Pick<Species, "common_name" | "group_name"> | string, _index: number): string {
  if (typeof s === "string") return DEFAULT_LOOK.back;
  const l = fishLook(s);
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

/** Blend two hex colours. */
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// The picture is drawn in the backdrop photo's own coordinates, so fish line
// up with its water and sand at every size. Landmarks are measured off the photo.
const IMG_W = 1776;
const IMG_H = 896;
const BACKDROP = "/tank-builder/aquascape.webp";
const TOP_LANE: [number, number] = [150, 250]; // just under the surface
const MID_LANE: [number, number] = [260, 560]; // open water
const SAND_BACK = 690; // where the sand meets the plants
const SAND_FRONT = 860; // the front edge of the sand
const SWIM_X: [number, number] = [90, IMG_W - 90];

/** Rough inside length of a tank from its volume, so fish are drawn to scale. */
function tankLengthIn(gallons: number): number {
  if (!(gallons > 0)) return 36;
  const sizes: [number, number][] = [
    [3, 12], [5, 16], [10, 20], [15, 24], [20, 24], [29, 30], [40, 36], [55, 48], [75, 48],
    [90, 48], [125, 72], [150, 72], [180, 72], [220, 72], [300, 96],
  ];
  for (const [g, l] of sizes) if (gallons <= g) return l;
  return 96;
}

type Kind = "fish" | "shrimp" | "snail";
type Sprite = {
  key: string;
  slug: string;
  kind: Kind;
  body: FishBody;
  look: FishLook;
  /** Drawn length in picture units. */
  len: number;
  y: number;
  x0: number;
  x1: number;
  /** One full lap (there and back) in seconds, and where in the lap it starts. */
  lap: number;
  delay: number;
  /** 0 = back of the tank, 1 = against the front glass. */
  depth: number;
  flagged: boolean;
  onSand: boolean;
};

/**
 * A living picture of the build, set in a real planted tank: every fish in
 * the part of the tank it swims in, drawn to scale for the tank size, in its
 * real colours and body shape. Fish cruise the tank and turn at the glass;
 * schools travel together, bottom dwellers work the sand, shrimp hop and
 * snails creep. Fish farther back sit hazier in the water.
 */
export default function TankVisual({
  stock,
  flagged,
  stockingPct,
  gallons = 0,
}: {
  stock: StockItem[];
  /** Species with a conflict or caution: drawn with a soft amber glow. */
  flagged?: Set<string>;
  stockingPct: number;
  /** Tank size, used to draw the fish at their real size for the tank. */
  gallons?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (n: string) => `${n}-${uid}`;

  const species = useMemo(() => {
    const seen = new Map<string, Species>();
    for (const { species: s } of stock) seen.set(s.slug, s);
    return [...seen.values()];
  }, [stock]);

  const sprites = useMemo<Sprite[]>(() => {
    const out: Sprite[] = [];
    // Picture units per inch of fish. The front glass spans the photo; fish
    // swim a little behind it, so they read slightly smaller.
    const perInch = (IMG_W * 0.86) / tankLengthIn(gallons);
    for (const { species: s, qty } of stock) {
      const invert = isInvert(s);
      const kind: Kind = invert ? (/snail/i.test(`${s.common_name} ${s.group_name}`) ? "snail" : "shrimp") : "fish";
      const look = fishLook(s);
      const body = bodyOf(look);
      const bottom = body === "catfish" || body === "pleco" || body === "loach" || body === "eel";
      const zone = invert || bottom ? "floor" : swimZone(s);
      const show = Math.min(qty, kind === "fish" ? 14 : 8);
      const inches = s.max_size_in ?? (kind === "fish" ? 2 : 1);
      // Never so small it vanishes, never wider than a third of the tank.
      const baseLen = Math.min(IMG_W / 3, Math.max(kind === "fish" ? 34 : 26, inches * perInch));
      const schooling = (s.min_group_size ?? 1) >= 5 && kind === "fish";
      const schoolLap = 16 + rnd(`${s.slug}lap`) * 14 + (bottom ? 12 : 0);
      const schoolDelay = rnd(`${s.slug}dl`) * schoolLap;
      const lane: [number, number] =
        zone === "top" ? TOP_LANE : zone === "all" ? [TOP_LANE[0] + 40, MID_LANE[1] + 60] : MID_LANE;
      const laneCentre = lane[0] + rnd(`${s.slug}y`) * (lane[1] - lane[0]);
      for (let i = 0; i < show; i++) {
        const k = `${s.slug}:${i}`;
        const depth = rnd(`${k}d`);
        const len = baseLen * (0.8 + depth * 0.2) * (0.9 + rnd(`${k}s`) * 0.15);
        const onSand = zone === "floor";
        let y: number;
        if (onSand) y = SAND_BACK + 20 + depth * (SAND_FRONT - SAND_BACK - 40);
        else y = laneCentre + (rnd(`${k}y`) - 0.5) * (schooling ? 90 : 220);
        y = Math.min(Math.max(y, TOP_LANE[0]), SAND_FRONT);
        const span = kind === "snail" ? 0.1 : kind === "shrimp" ? 0.16 : onSand ? 0.45 : 0.8;
        const usable = SWIM_X[1] - SWIM_X[0];
        const x0 = SWIM_X[0] + rnd(`${k}x`) * (1 - span) * usable;
        const x1 = x0 + span * usable;
        const lap =
          kind === "snail"
            ? 150 + rnd(`${k}l`) * 60
            : kind === "shrimp"
            ? 30 + rnd(`${k}l`) * 20
            : schooling
            ? schoolLap * (0.97 + rnd(`${k}l`) * 0.06)
            : 14 + rnd(`${k}l`) * 18;
        const delay = schooling ? schoolDelay + i * 0.4 + rnd(`${k}o`) * 0.8 : rnd(`${k}o`) * lap;
        out.push({ key: k, slug: s.slug, kind, body, look, len, y, x0, x1, lap, delay: -delay, depth, flagged: !!flagged?.has(s.slug), onSand });
      }
    }
    // Back to front: farther fish, and fish farther back on the sand, are drawn first.
    return out.sort((a, b) => (a.onSand && b.onSand ? a.y - b.y : a.depth - b.depth));
  }, [stock, flagged, gallons]);

  // Water gets a faint green-brown cast as the tank fills past its limit.
  const murk = stockingPct > 130 ? 0.3 : stockingPct >= 90 ? 0.14 : 0;

  return (
    <div className="relative h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#04121c] sm:h-[300px] lg:h-[360px]">
      <svg
        viewBox={`0 0 ${IMG_W} ${IMG_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
        role="img"
        aria-label="Picture of your tank with the fish you've added"
      >
        <defs>
          {/* Fish farther back lose a little colour and contrast to the water. */}
          <filter id={id("far")} x="-20%" y="-40%" width="140%" height="180%">
            <feColorMatrix type="matrix" values="0.62 0.08 0.05 0 0.03  0.06 0.66 0.1 0 0.07  0.06 0.12 0.66 0 0.09  0 0 0 1 0" />
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          <filter id={id("mid")} x="-20%" y="-40%" width="140%" height="180%">
            <feColorMatrix type="matrix" values="0.84 0.04 0.03 0 0.01  0.03 0.86 0.05 0 0.03  0.03 0.06 0.86 0 0.04  0 0 0 1 0" />
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <filter id={id("glow")} x="-40%" y="-60%" width="180%" height="220%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="b" />
            <feFlood floodColor="#f5a524" floodOpacity="0.9" />
            <feComposite in2="b" operator="in" result="g" />
            <feMerge>
              <feMergeNode in="g" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={id("soft")} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <radialGradient id={id("caustic")} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fffbe8" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fffbe8" stopOpacity="0" />
          </radialGradient>
          {/* Fine fin rays, laid over every fin. */}
          <pattern id={id("rays")} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
            <path d="M0 2.5 H5" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="0.8" />
            <path d="M0 0.2 H5" stroke="#000000" strokeOpacity="0.12" strokeWidth="0.6" />
          </pattern>
          {species.map((s) => {
            const l = fishLook(s);
            return (
              <g key={s.slug}>
                <linearGradient id={id(`b-${s.slug}`)} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={mix(l.back, "#000000", 0.15)} />
                  <stop offset="0.38" stopColor={l.back} />
                  <stop offset="0.62" stopColor={mix(l.back, l.belly, 0.7)} />
                  <stop offset="1" stopColor={l.belly} />
                </linearGradient>
                {/* Fins: tinted at the root, nearly clear at the edge. */}
                <linearGradient id={id(`fin-${s.slug}`)} x1="1" x2="0" y1="0" y2="0">
                  <stop offset="0" stopColor={l.fin} stopOpacity="0.8" />
                  <stop offset="1" stopColor={l.fin} stopOpacity="0.18" />
                </linearGradient>
              </g>
            );
          })}
        </defs>

        <image href={BACKDROP} x="0" y="0" width={IMG_W} height={IMG_H} preserveAspectRatio="xMidYMid slice" />

        {/* light drifting across the sand */}
        <g className="tb-caustics" style={{ mixBlendMode: "soft-light" }}>
          {Array.from({ length: 10 }, (_, i) => (
            <ellipse
              key={i}
              cx={300 + (i / 9) * 1180 + (rnd(`cx${i}`) - 0.5) * 80}
              cy={SAND_BACK + 40 + rnd(`ca${i}`) * 130}
              rx={60 + rnd(`car${i}`) * 70}
              ry={10 + rnd(`cay${i}`) * 12}
              fill={`url(#${id("caustic")})`}
              style={{ animationDelay: `${-rnd(`cad${i}`) * 9}s` }}
            />
          ))}
        </g>

        {murk > 0 && <rect x="0" y="0" width={IMG_W} height={IMG_H} fill="#3e4a22" opacity={murk} />}

        {sprites.map((sp) => (
          <Animal
            key={sp.key}
            sp={sp}
            uid={uid}
            body={`url(#${id(`b-${sp.slug}`)})`}
            fin={`url(#${id(`fin-${sp.slug}`)})`}
            rays={`url(#${id("rays")})`}
            filter={sp.flagged ? `url(#${id("glow")})` : sp.depth < 0.3 ? `url(#${id("far")})` : sp.depth < 0.65 ? `url(#${id("mid")})` : undefined}
            shadow={`url(#${id("soft")})`}
          />
        ))}

        {/* bubbles rising from behind the right-hand plants */}
        <g className="tb-bubbles" fill="#e6f8ff" fillOpacity="0.14" stroke="#effbff" strokeOpacity="0.6" strokeWidth="1.2">
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={1505 + (i % 3) * 7} cy={600} r={2.5 + (i % 3) * 1.6} style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
        </g>
      </svg>

      {stock.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-full bg-black/45 px-4 py-2 font-sans text-sm text-ocean-100 backdrop-blur">Your fish will swim here</p>
        </div>
      )}

      <style>{`
        .tb-patrol { animation-name: tbPatrol; animation-iteration-count: infinite; animation-timing-function: linear; }
        @keyframes tbPatrol {
          0% { transform: translateX(0); animation-timing-function: cubic-bezier(.45,0,.55,1); }
          46% { transform: translateX(var(--dx)); }
          54% { transform: translateX(var(--dx)); animation-timing-function: cubic-bezier(.45,0,.55,1); }
          96% { transform: translateX(0); }
          100% { transform: translateX(0); }
        }
        .tb-turn { animation-name: tbTurn; animation-iteration-count: infinite; animation-timing-function: linear; transform-box: fill-box; transform-origin: center; }
        @keyframes tbTurn {
          0%, 45% { transform: scaleX(1); }
          50% { transform: scaleX(.1); }
          55%, 95% { transform: scaleX(-1); }
          99.9% { transform: scaleX(.1); }
          100% { transform: scaleX(1); }
        }
        .tb-bob { animation: tbBob 6s ease-in-out infinite alternate; }
        @keyframes tbBob { from { transform: translateY(-5px) } to { transform: translateY(5px) } }
        .tb-tail { animation: tbTail .7s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 100% 50%; }
        @keyframes tbTail { from { transform: rotate(-7deg) scaleX(.94) } to { transform: rotate(7deg) scaleX(1.02) } }
        .tb-pec { animation: tbPec 1.3s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: 100% 0%; }
        @keyframes tbPec { from { transform: rotate(-10deg) } to { transform: rotate(14deg) } }
        .tb-hop { animation: tbHop 3.4s ease-in-out infinite; }
        @keyframes tbHop { 0%, 70%, 100% { transform: translateY(0) } 80% { transform: translateY(-16px) } 90% { transform: translateY(-4px) } }
        .tb-bubbles circle { animation: tbRise 4.5s cubic-bezier(.3,0,.7,1) infinite; }
        @keyframes tbRise { from { transform: translate(0,0); opacity: .9 } 50% { transform: translate(6px,-260px) } to { transform: translate(-4px,-520px); opacity: 0 } }
        .tb-caustics ellipse { animation: tbCaustic 9s ease-in-out infinite alternate; }
        @keyframes tbCaustic { from { transform: translateX(-30px); opacity: .3 } to { transform: translateX(30px); opacity: .85 } }
        @media (prefers-reduced-motion: reduce) {
          .tb-patrol, .tb-turn, .tb-bob, .tb-tail, .tb-pec, .tb-hop, .tb-bubbles circle, .tb-caustics ellipse { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/** One animal: patrols its stretch, turns at each end, tail beating. */
function Animal({
  sp,
  uid,
  body,
  fin,
  rays,
  filter,
  shadow,
}: {
  sp: Sprite;
  uid: string;
  body: string;
  fin: string;
  rays: string;
  filter?: string;
  shadow: string;
}) {
  const timing: CSSProperties = { animationDuration: `${sp.lap}s`, animationDelay: `${sp.delay}s` };
  const swims = sp.kind === "fish" && !sp.onSand;
  return (
    <g transform={`translate(${sp.x0} ${sp.y})`} opacity={0.8 + sp.depth * 0.2}>
      <g className="tb-patrol" style={{ ...timing, ["--dx" as string]: `${sp.x1 - sp.x0}px` } as CSSProperties}>
        {/* a soft shadow on the sand under anything that lives there */}
        {sp.onSand && <ellipse cx="0" cy={sp.len * 0.12} rx={sp.len * 0.42} ry={sp.len * 0.07} fill="#000" opacity="0.32" filter={shadow} />}
        <g filter={filter}>
          <g className={sp.kind === "shrimp" ? "tb-hop" : swims ? "tb-bob" : undefined} style={{ animationDelay: `${sp.delay}s` }}>
            <g className="tb-turn" style={timing}>
              {sp.kind === "fish" ? (
                <Fish sp={sp} uid={uid} bodyFill={body} finFill={fin} rays={rays} />
              ) : sp.kind === "shrimp" ? (
                <Shrimp slug={sp.slug} len={sp.len} />
              ) : (
                <Snail slug={sp.slug} len={sp.len} />
              )}
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}

type Parts = {
  body: string;
  tail: string;
  /** Unpaired fins behind the body. */
  fins: string[];
  /** The pectoral fin, drawn over the body and flapping. */
  pec: string;
  eye: [number, number, number];
  /** Extra marks drawn inside the body outline. */
  marks?: ReactNode;
  /** Bars run through the fins too (angelfish). */
  bandsInFins?: boolean;
  whiskers?: string;
};

/** Outline and fins for each body type, facing right, centred on 0,0. */
function shape(body: FishBody, len: number, look: FishLook): Parts {
  const L = len / 2;
  const h = len * look.depth * 0.5;
  switch (body) {
    case "disc": {
      const angel = !!look.tallFins && look.depth >= 1;
      if (angel) {
        // Angelfish: a short, flat body with tall sail-like fins and long feelers.
        const bh = len * 0.36;
        return {
          body: `M ${L} ${-bh * 0.05} C ${L * 0.82} ${-bh * 0.75}, ${L * 0.15} ${-bh * 1.02}, ${-L * 0.42} ${-bh * 0.35} L ${-L * 0.48} ${bh * 0.32} C ${L * 0.1} ${bh * 0.98}, ${L * 0.8} ${bh * 0.72}, ${L} ${-bh * 0.05} Z`,
          tail: `M ${-L * 0.44} 0 C ${-L * 0.62} ${-bh * 0.55}, ${-L * 0.82} ${-bh * 0.72}, ${-L * 0.9} ${-bh * 0.66} Q ${-L * 0.8} 0 ${-L * 0.9} ${bh * 0.66} C ${-L * 0.82} ${bh * 0.72}, ${-L * 0.62} ${bh * 0.55}, ${-L * 0.44} 0 Z`,
          fins: [
            `M ${L * 0.38} ${-bh * 0.78} C ${L * 0.1} ${-bh * 1.9}, ${-L * 0.4} ${-bh * 2.9}, ${-L * 0.72} ${-bh * 3.1} C ${-L * 0.45} ${-bh * 2.3}, ${-L * 0.38} ${-bh * 1.2}, ${-L * 0.42} ${-bh * 0.38} Z`,
            `M ${L * 0.3} ${bh * 0.8} C ${L * 0.05} ${bh * 1.9}, ${-L * 0.42} ${bh * 2.9}, ${-L * 0.74} ${bh * 3.1} C ${-L * 0.47} ${bh * 2.3}, ${-L * 0.4} ${bh * 1.2}, ${-L * 0.46} ${bh * 0.36} Z`,
          ],
          pec: `M ${L * 0.4} ${bh * 0.05} Q ${L * 0.2} ${bh * 0.3} ${L * 0.12} ${bh * 0.08} Z`,
          eye: [L * 0.68, -bh * 0.18, len * 0.03],
          bandsInFins: true,
          whiskers: `M ${L * 0.42} ${bh * 0.6} C ${L * 0.38} ${bh * 1.6}, ${L * 0.25} ${bh * 2.6}, ${L * 0.08} ${bh * 3.4} M ${L * 0.36} ${bh * 0.62} C ${L * 0.3} ${bh * 1.6}, ${L * 0.18} ${bh * 2.5}, ${L * 0.02} ${bh * 3.2}`,
        };
      }
      // Discus and silver dollar: a round, flat disc.
      return {
        body: `M ${L} 0 C ${L * 0.95} ${-h * 1.05}, ${-L * 0.4} ${-h * 1.1}, ${-L * 0.62} ${-h * 0.12} L ${-L * 0.62} ${h * 0.12} C ${-L * 0.4} ${h * 1.1}, ${L * 0.95} ${h * 1.05}, ${L} 0 Z`,
        tail: `M ${-L * 0.6} 0 L ${-L * 0.92} ${-h * 0.45} Q ${-L * 0.82} 0 ${-L * 0.92} ${h * 0.45} Z`,
        fins: [
          `M ${L * 0.5} ${-h * 0.85} C ${L * 0.1} ${-h * 1.22}, ${-L * 0.45} ${-h * 1.15}, ${-L * 0.66} ${-h * 0.3} Z`,
          `M ${L * 0.4} ${h * 0.85} C ${L * 0.05} ${h * 1.22}, ${-L * 0.45} ${h * 1.15}, ${-L * 0.66} ${h * 0.3} Z`,
        ],
        pec: `M ${L * 0.42} ${h * 0.1} Q ${L * 0.2} ${h * 0.42} ${L * 0.1} ${h * 0.15} Z`,
        eye: [L * 0.74, -h * 0.16, len * 0.032],
      };
    }
    case "catfish":
    case "pleco": {
      const pleco = body === "pleco";
      return {
        body: pleco
          ? `M ${L} ${h * 0.6} C ${L * 0.95} ${-h * 0.45}, ${L * 0.35} ${-h * 1.05}, ${-L * 0.15} ${-h * 0.85} C ${-L * 0.5} ${-h * 0.65}, ${-L * 0.68} ${-h * 0.25}, ${-L * 0.72} 0 L ${-L * 0.72} ${h * 0.35} C ${-L * 0.2} ${h * 0.75}, ${L * 0.5} ${h * 0.9}, ${L} ${h * 0.6} Z`
          : `M ${L} ${h * 0.4} C ${L * 0.9} ${-h * 0.75}, ${L * 0.2} ${-h * 1.2}, ${-L * 0.3} ${-h * 0.7} C ${-L * 0.55} ${-h * 0.4}, ${-L * 0.66} ${-h * 0.15}, ${-L * 0.66} 0 L ${-L * 0.66} ${h * 0.38} C ${-L * 0.2} ${h * 0.92}, ${L * 0.6} ${h * 0.98}, ${L} ${h * 0.4} Z`,
        tail: `M ${-L * 0.64} ${h * 0.15} L ${-L * 0.98} ${-h * 0.75} Q ${-L * 0.84} ${h * 0.2} ${-L * 0.98} ${h * 1.0} Z`,
        fins: [
          pleco
            ? `M ${L * 0.25} ${-h * 0.92} C ${L * 0.1} ${-h * 2.2}, ${-L * 0.35} ${-h * 2.0}, ${-L * 0.42} ${-h * 0.72} Z`
            : `M ${L * 0.18} ${-h * 1.02} L ${L * 0.04} ${-h * 1.95} L ${-L * 0.16} ${-h * 0.92} Z`,
          `M ${-L * 0.42} ${-h * 0.62} L ${-L * 0.5} ${-h * 0.95} L ${-L * 0.56} ${-h * 0.5} Z`,
        ],
        pec: `M ${L * 0.45} ${h * 0.55} Q ${L * 0.22} ${h * 1.3} ${L * 0.02} ${h * 0.75} Z`,
        eye: [L * 0.62, -h * 0.32, len * 0.035],
        whiskers: `M ${L * 0.96} ${h * 0.45} q ${len * 0.07} ${h * 0.35} ${len * 0.1} ${h * 0.85} M ${L * 0.92} ${h * 0.52} q ${len * 0.025} ${h * 0.55} ${len * 0.015} ${h * 1.0}`,
      };
    }
    case "betta": {
      const tr = -L * 0.38;
      return {
        body: `M ${L} ${h * 0.05} C ${L * 0.82} ${-h * 1.0}, ${-L * 0.05} ${-h * 1.05}, ${tr} ${-h * 0.42} L ${tr} ${h * 0.42} C ${-L * 0.05} ${h * 1.05}, ${L * 0.82} ${h * 0.95}, ${L} ${h * 0.05} Z`,
        tail: `M ${tr + 2} 0 C ${tr - L * 0.4} ${-h * 2.2}, ${tr - L * 1.25} ${-h * 3.0}, ${tr - L * 1.4} ${-h * 0.9} C ${tr - L * 1.5} ${h * 0.6}, ${tr - L * 1.25} ${h * 3.1}, ${tr - L * 0.25} ${h * 2.1} Z`,
        fins: [
          `M ${L * 0.32} ${-h * 0.85} C ${L * 0.05} ${-h * 2.3}, ${-L * 0.55} ${-h * 2.5}, ${-L * 0.72} ${-h * 1.15} L ${tr} ${-h * 0.4} Z`,
          `M ${L * 0.48} ${h * 0.8} C ${L * 0.2} ${h * 2.7}, ${-L * 0.55} ${h * 3.3}, ${-L * 0.85} ${h * 2.1} L ${tr} ${h * 0.4} Z`,
        ],
        pec: `M ${L * 0.4} ${h * 0.25} Q ${L * 0.15} ${h * 0.95} ${L * 0.05} ${h * 0.4} Z`,
        eye: [L * 0.7, -h * 0.15, len * 0.04],
      };
    }
    case "round":
    case "puffer": {
      const puffer = body === "puffer";
      const tr = -L * 0.55;
      return {
        body: `M ${L} ${h * 0.12} C ${L * 0.95} ${-h * 1.05}, ${-L * 0.3} ${-h * 1.1}, ${tr} ${-h * 0.25} L ${tr} ${h * 0.25} C ${-L * 0.3} ${h * 1.1}, ${L * 0.95} ${h * 1.05}, ${L} ${h * 0.12} Z`,
        tail: puffer
          ? `M ${tr + 2} 0 L ${tr - L * 0.32} ${-h * 0.42} Q ${tr - L * 0.25} 0 ${tr - L * 0.32} ${h * 0.42} Z`
          : `M ${tr + 2} 0 C ${tr - L * 0.4} ${-h * 0.6}, ${tr - L * 0.95} ${-h * 1.35}, ${tr - L * 1.05} ${-h * 0.8} C ${tr - L * 0.75} ${-h * 0.3}, ${tr - L * 0.75} ${h * 0.3}, ${tr - L * 1.05} ${h * 0.8} C ${tr - L * 0.95} ${h * 1.35}, ${tr - L * 0.4} ${h * 0.6}, ${tr + 2} 0 Z`,
        fins: [
          puffer
            ? `M ${L * 0.02} ${-h * 0.92} Q ${-L * 0.25} ${-h * 1.35} ${-L * 0.4} ${-h * 0.62} Z`
            : `M ${L * 0.35} ${-h * 0.95} C ${L * 0.1} ${-h * 1.65}, ${-L * 0.35} ${-h * 1.55}, ${-L * 0.45} ${-h * 0.7} Z`,
        ],
        pec: `M ${L * 0.45} ${h * 0.2} Q ${L * 0.22} ${h * 0.85} ${L * 0.08} ${h * 0.35} Z`,
        eye: [L * 0.6, -h * 0.25, len * (puffer ? 0.07 : 0.045)],
        marks: puffer ? (
          <g fill={look.bands ?? "#333333"} opacity="0.5">
            {[[0.35, -0.5], [0.02, -0.62], [-0.28, -0.4], [0.18, -0.2], [-0.1, -0.12]].map(([fx, fy], i) => (
              <ellipse key={i} cx={L * fx} cy={h * fy} rx={len * 0.055} ry={len * 0.045} />
            ))}
          </g>
        ) : undefined,
      };
    }
    case "loach": {
      // Long and low with a pointed, down-turned snout and whiskers.
      const tr = -L * 0.66;
      return {
        body: `M ${L} ${h * 0.35} C ${L * 0.85} ${-h * 0.75}, ${L * 0.1} ${-h * 1.05}, ${tr} ${-h * 0.3} L ${tr} ${h * 0.3} C ${-L * 0.1} ${h * 0.95}, ${L * 0.7} ${h * 0.95}, ${L} ${h * 0.35} Z`,
        tail: `M ${tr + 2} 0 C ${tr - L * 0.2} ${-h * 0.4}, ${tr - L * 0.32} ${-h * 0.85}, ${tr - L * 0.38} ${-h * 1.0} Q ${tr - L * 0.22} 0 ${tr - L * 0.38} ${h * 1.0} C ${tr - L * 0.32} ${h * 0.85}, ${tr - L * 0.2} ${h * 0.4}, ${tr + 2} 0 Z`,
        fins: [
          `M ${L * 0.02} ${-h * 0.95} Q ${-L * 0.12} ${-h * 1.6} ${-L * 0.3} ${-h * 0.8} Z`,
          `M ${-L * 0.2} ${h * 0.85} Q ${-L * 0.32} ${h * 1.35} ${-L * 0.45} ${h * 0.6} Z`,
        ],
        pec: `M ${L * 0.5} ${h * 0.5} Q ${L * 0.3} ${h * 1.15} ${L * 0.16} ${h * 0.7} Z`,
        eye: [L * 0.72, -h * 0.2, len * 0.03],
        whiskers: `M ${L * 0.97} ${h * 0.45} q ${len * 0.05} ${h * 0.25} ${len * 0.07} ${h * 0.7} M ${L * 0.94} ${h * 0.55} q ${len * 0.02} ${h * 0.45} ${len * 0.01} ${h * 0.85}`,
      };
    }
    case "eel":
      // Drawn as a ribbon by Fish itself.
      return { body: "", tail: "", fins: [], pec: "", eye: [L * 0.88, -len * 0.012, len * 0.022] };
    default: {
      const tr = -L * (body === "deep" ? 0.6 : 0.66);
      const tl = look.flowing ? L * 0.68 : L * (body === "shark" ? 0.48 : 0.4);
      const sp = look.flowing ? h * 1.45 : Math.max(h * 1.0, len * 0.12);
      const forked = body !== "deep" || !!look.flowing;
      const dorsalH = look.tallFins ? h * 1.35 : body === "shark" ? h * 1.1 : h * 0.6;
      return {
        body: `M ${L} ${h * 0.08} C ${L * 0.8} ${-h * 0.95}, ${-L * 0.15} ${-h * 1.07}, ${tr} ${-h * 0.24} L ${tr} ${h * 0.24} C ${-L * 0.15} ${h * 1.04}, ${L * 0.8} ${h * 0.9}, ${L} ${h * 0.08} Z`,
        tail: look.flowing
          ? `M ${tr + 2} 0 C ${tr - tl * 0.4} ${-sp * 0.5}, ${tr - tl} ${-sp}, ${tr - tl * 1.05} ${-sp * 0.5} C ${tr - tl * 0.85} 0, ${tr - tl * 1.05} ${sp * 0.2}, ${tr - tl * 1.05} ${sp * 0.55} C ${tr - tl} ${sp}, ${tr - tl * 0.4} ${sp * 0.5}, ${tr + 2} 0 Z`
          : forked
          ? `M ${tr + 2} 0 C ${tr - tl * 0.5} ${-sp * 0.35}, ${tr - tl * 0.85} ${-sp * 0.8}, ${tr - tl} ${-sp} Q ${tr - tl * 0.55} 0 ${tr - tl} ${sp} C ${tr - tl * 0.85} ${sp * 0.8}, ${tr - tl * 0.5} ${sp * 0.35}, ${tr + 2} 0 Z`
          : `M ${tr + 2} 0 C ${tr - tl * 0.6} ${-sp * 0.9}, ${tr - tl} ${-sp * 0.8}, ${tr - tl} ${-sp * 0.4} L ${tr - tl} ${sp * 0.4} C ${tr - tl} ${sp * 0.8}, ${tr - tl * 0.6} ${sp * 0.9}, ${tr + 2} 0 Z`,
        fins: [
          body === "shark"
            ? `M ${L * 0.15} ${-h * 0.9} L ${-L * 0.02} ${-h - dorsalH} L ${-L * 0.25} ${-h * 0.75} Z`
            : `M ${L * 0.12} ${-h * 0.92} Q ${-L * 0.06} ${-h - dorsalH} ${-L * 0.4} ${-h * 0.6} Z`,
          `M ${-L * 0.02} ${h * 0.82} Q ${-L * 0.2} ${h * (look.tallFins ? 2 : 1.4)} ${-L * 0.45} ${h * 0.48} Z`,
          `M ${L * 0.25} ${h * 0.86} L ${L * 0.12} ${h * 1.3} L ${L * 0.05} ${h * 0.85} Z`,
        ],
        pec: `M ${L * 0.38} ${h * 0.2} Q ${L * 0.15} ${h * 0.72} ${L * 0.06} ${h * 0.32} Z`,
        eye: [L * 0.7, -h * 0.16, len * 0.034],
      };
    }
  }
}

/** A fish in profile, facing right. Marks are clipped to its outline. */
function Fish({ sp, uid, bodyFill, finFill, rays }: { sp: Sprite; uid: string; bodyFill: string; finFill: string; rays: string }) {
  const { len, look, body } = sp;
  const L = len / 2;
  const clip = `c-${uid}-${sp.key.replace(/[^a-z0-9]/gi, "")}`;

  if (body === "eel") {
    const h = Math.max(3, len * 0.06);
    const path = `M ${L} 0 C ${L * 0.5} ${-h * 2}, 0 ${h * 2}, ${-L * 0.5} ${-h * 1.1} S ${-L * 0.9} ${h * 0.7}, ${-L} 0`;
    return (
      <g>
        <path d={path} stroke={look.back} strokeWidth={h * 2} strokeLinecap="round" fill="none" />
        {look.bands &&
          [0.62, 0.3, -0.02, -0.34, -0.66].map((f) => (
            <ellipse key={f} cx={L * f} cy={Math.sin(f * 4) * h * 1.05} rx={h * 0.9} ry={h * 1.05} fill={look.bands} opacity="0.7" />
          ))}
        <path d={path} stroke={look.belly} strokeOpacity="0.35" strokeWidth={h * 0.5} strokeLinecap="round" fill="none" transform={`translate(0 ${h * 0.45})`} />
        <circle cx={L * 0.88} cy={-h * 0.2} r={Math.max(1.5, h * 0.38)} fill="#0b0f12" />
      </g>
    );
  }

  const p = shape(body, len, look);
  const h = len * look.depth * 0.5;
  const bh = body === "disc" && p.bandsInFins ? len * 0.36 : h;
  const bandsX =
    body === "disc" ? [0.42, 0.06, -0.3] : body === "loach" ? [0.48, 0.05, -0.42] : body === "catfish" || body === "pleco" ? [0.36, -0.04, -0.42] : [0.32, -0.02, -0.36];
  const bandSpan = p.bandsInFins ? bh * 3.3 : h * 1.3;
  const [ex, ey, er] = p.eye;
  // Real fish eyes are small next to a cartoon's; keep them readable on tiny fish.
  const eyeR = Math.max(2.2, er * 0.72);

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={p.body} />
          {p.bandsInFins && p.fins.map((d, i) => <path key={i} d={d} />)}
        </clipPath>
      </defs>
      {/* see-through fins behind the body, with fine rays */}
      <g className="tb-tail">
        <path d={p.tail} fill={finFill} />
        <path d={p.tail} fill={rays} />
      </g>
      {p.fins.map((d, i) => (
        <g key={i}>
          <path d={d} fill={finFill} />
          <path d={d} fill={rays} />
        </g>
      ))}
      {p.whiskers && <path d={p.whiskers} stroke={mix(look.fin, "#ffffff", 0.3)} strokeOpacity="0.6" strokeWidth={Math.max(1, len * 0.008)} fill="none" />}

      <path d={p.body} fill={bodyFill} />
      <g clipPath={`url(#${clip})`}>
        {look.stripe && (
          <path
            d={`M ${L * 0.66} ${-h * 0.14} C ${L * 0.2} ${-h * 0.24}, ${-L * 0.3} ${-h * 0.22}, ${-L} ${-h * 0.06}`}
            stroke={look.stripe}
            strokeWidth={Math.max(2, h * 0.24)}
            strokeLinecap="round"
            fill="none"
            opacity="0.92"
          />
        )}
        {look.stripe && (
          <path
            d={`M ${L * 0.6} ${-h * 0.16} C ${L * 0.2} ${-h * 0.25}, ${-L * 0.3} ${-h * 0.23}, ${-L} ${-h * 0.08}`}
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth={Math.max(0.8, h * 0.06)}
            fill="none"
          />
        )}
        {look.bands &&
          bandsX.map((f) => (
            <path
              key={f}
              d={`M ${L * f} ${-bandSpan} C ${L * f - len * 0.02} ${-bandSpan * 0.3}, ${L * f - len * 0.03} ${bandSpan * 0.3}, ${L * f - len * 0.015} ${bandSpan} L ${L * f + len * (p.bandsInFins ? 0.04 : 0.05)} ${bandSpan} C ${L * f + len * 0.035} ${bandSpan * 0.3}, ${L * f + len * 0.04} ${-bandSpan * 0.3}, ${L * f + len * (p.bandsInFins ? 0.04 : 0.055)} ${-bandSpan} Z`}
              fill={look.bands}
              opacity={p.bandsInFins ? 0.62 : body === "loach" ? 0.85 : 0.55}
            />
          ))}
        {p.marks}
        {look.spots &&
          Array.from({ length: look.blotchy ? 12 : 16 }, (_, i) => {
            const k = `${sp.slug}${i}`;
            const r = look.blotchy ? len * (0.025 + rnd(`${k}r`) * 0.035) : Math.max(1.2, len * (0.012 + rnd(`${k}r`) * 0.012));
            return (
              <ellipse
                key={i}
                cx={(rnd(`${k}x`) * 1.5 - 0.85) * L}
                cy={(rnd(`${k}y`) * 1.6 - 0.9) * bh}
                rx={r * (look.blotchy ? 1.4 : 1)}
                ry={r}
                fill={look.spots}
                opacity={look.blotchy ? 0.42 : 0.6}
              />
            );
          })}
        {/* light from above: bright back edge, shaded belly */}
        <ellipse cx={L * 0.05} cy={-bh * 0.72} rx={L * 0.8} ry={bh * 0.3} fill="#ffffff" opacity="0.16" />
        <ellipse cx={L * 0.1} cy={-bh * 0.32} rx={L * 0.7} ry={bh * 0.07} fill="#ffffff" opacity="0.14" />
        <ellipse cx={0} cy={bh * 1.0} rx={L * 0.95} ry={bh * 0.42} fill="#000000" opacity="0.2" />
        <ellipse cx={-L * 0.55} cy={0} rx={L * 0.3} ry={bh * 1.2} fill="#000000" opacity="0.1" />
        {/* gill cover */}
        <path d={`M ${L * 0.52} ${-bh * 0.6} Q ${L * 0.4} 0 ${L * 0.52} ${bh * 0.6}`} stroke="#000000" strokeOpacity="0.16" strokeWidth={Math.max(1, len * 0.01)} fill="none" />
      </g>
      <path className="tb-pec" d={p.pec} fill={finFill} />
      {/* eye: a dark pupil in a metallic iris, one small glint */}
      <circle cx={ex} cy={ey} r={eyeR} fill={mix(look.back, "#c9a24a", 0.55)} />
      <circle cx={ex + eyeR * 0.08} cy={ey} r={eyeR * 0.62} fill="#06090b" />
      <circle cx={ex + eyeR * 0.3} cy={ey - eyeR * 0.3} r={eyeR * 0.18} fill="#ffffff" opacity="0.6" />
    </g>
  );
}

function Shrimp({ slug, len }: { slug: string; len: number }) {
  const c = /blue/.test(slug)
    ? "#3a6ec0"
    : /yellow|sunkist|orange/.test(slug)
    ? "#e0a22a"
    : /amano|ghost|glass|whisker|bamboo|vampire/.test(slug)
    ? "#c8c0ae"
    : /green|jade/.test(slug)
    ? "#5a8a40"
    : /black|chocolate/.test(slug)
    ? "#3a2a24"
    : "#c8412c";
  const glassy = /amano|ghost|glass/.test(slug);
  const s = len / 20;
  return (
    <g transform={`scale(${s})`} opacity={glassy ? 0.7 : 0.95}>
      <path d="M 8 -1 C 6 -6, -2 -6.5, -6 -2.5 C -8 -0.5, -8.5 1.5, -7 2 C -5 0, -1 -0.5, 2 0 C 4 0.4, 6 0.4, 8 -1 Z" fill={c} />
      <path d="M 3 -4.6 L 3.4 0 M 0 -5 L 0.2 -0.3 M -3 -4.2 L -3 -0.6" stroke="#000000" strokeOpacity="0.18" strokeWidth="0.5" />
      <path d="M 6 -4 C 3 -6, -2 -6, -5 -3" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.6" fill="none" />
      <path d="M -6 -2 L -9.5 -4 M -6.5 -1 L -10 0.5" stroke={c} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M 8 -1.5 C 11 -5, 14 -6, 17 -6 M 8 -1 C 11 -2.5, 14 -2, 16.5 -1" stroke={c} strokeWidth="0.4" fill="none" opacity="0.8" />
      <path d="M -1 0.2 L -2 3.5 M 1 0.3 L 0.6 3.6 M 3 0.3 L 3 3.4 M 5 0 L 5.6 3" stroke={c} strokeWidth="0.5" opacity="0.75" />
      <circle cx="6.6" cy="-2.6" r="0.7" fill="#111111" />
    </g>
  );
}

function Snail({ slug, len }: { slug: string; len: number }) {
  const shell = /nerite|zebra/.test(slug)
    ? "#4a3d2a"
    : /gold|inca|yellow/.test(slug)
    ? "#d8a83c"
    : /blue/.test(slug)
    ? "#5a6f8a"
    : /ramshorn|red/.test(slug)
    ? "#8a3b2a"
    : /assassin/.test(slug)
    ? "#c69a3a"
    : "#7a5c3a";
  const striped = /zebra|nerite|assassin/.test(slug);
  const s = len / 16;
  const g = `sn-${slug}`;
  return (
    <g transform={`scale(${s})`}>
      <defs>
        <radialGradient id={g} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor={mix(shell, "#ffffff", 0.35)} />
          <stop offset="0.6" stopColor={shell} />
          <stop offset="1" stopColor={mix(shell, "#000000", 0.45)} />
        </radialGradient>
      </defs>
      {/* foot and feelers */}
      <path d="M -8.5 3.4 C -6 1.8, 5 1.4, 9.5 2.6 C 11 3, 10.5 3.9, 8.5 3.9 L -7.5 4 Z" fill="#cbbd9e" opacity="0.9" />
      <path d="M 8.6 1.8 C 9.8 0, 10.6 -1.6, 11.6 -3 M 7.8 1.6 C 8.6 -0.4, 9 -2.2, 9.4 -3.6" stroke="#cbbd9e" strokeWidth="0.55" strokeLinecap="round" fill="none" />
      {/* shell with its spiral */}
      <path d="M -6.8 2.6 C -8.2 -3, -4.5 -8.2, 0.6 -8 C 5.4 -7.6, 7.6 -3.4, 6.4 0.4 C 5.6 2.6, 3 3.4, -0.6 3.4 Z" fill={`url(#${g})`} />
      <path d="M 0.6 -1.4 C 2.6 -1.6, 3.2 -3.8, 1.6 -4.8 C -0.4 -5.9, -3 -4.4, -3 -1.8 C -3 1, 0 2.4, 2.8 1.6" fill="none" stroke="#000000" strokeOpacity="0.32" strokeWidth="0.55" />
      {striped && (
        <path
          d="M -5.6 -4.4 C -4.8 -2, -4.6 0, -4.8 2.4 M -2.8 -7 C -2 -3.8, -2 -0.6, -2.4 2.8 M 0.6 -7.6 C 1.2 -5, 1.4 -3, 1.2 -1.6 M 3.8 -6.4 C 4.4 -4.4, 4.6 -2.4, 4.4 -0.2"
          stroke={/assassin/.test(slug) ? "#2e2214" : "#e2cf94"}
          strokeWidth="0.7"
          fill="none"
          opacity="0.55"
        />
      )}
      <ellipse cx="-2.6" cy="-5.8" rx="2.6" ry="1.1" fill="#ffffff" opacity="0.22" transform="rotate(-20 -2.6 -5.8)" />
    </g>
  );
}
