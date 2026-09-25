"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isInvert, swimZone, type StockItem } from "@/lib/tankBuilder/engine";

/** Stable colors per species, bright enough to read against dark water. */
const PALETTE = ["#38bdf8", "#f97316", "#facc15", "#f472b6", "#34d399", "#a78bfa", "#fb7185", "#2dd4bf", "#fbbf24", "#60a5fa"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Colour by position in the list, so no two species in a build share one. */
export function speciesColor(_slug: string, index: number): string {
  return PALETTE[index % PALETTE.length];
}

const H = 240;
const WATER_TOP = 22;
const SAND = 206;

type Sprite = {
  key: string;
  slug: string;
  first: boolean;
  kind: "fish" | "shrimp" | "snail";
  x: number;
  y: number;
  len: number;
  color: string;
  flip: boolean;
  dur: number;
  delay: number;
};

/**
 * A living picture of the build: every fish drawn in the part of the tank it
 * actually swims in, sized by how big it grows. It's the fastest way to see
 * an empty bottom, a crowded middle, or one giant among minnows.
 */
export default function TankVisual({
  stock,
  flagged,
  stockingPct,
}: {
  stock: StockItem[];
  /** Species with a conflict or caution: drawn with a warning ring. */
  flagged?: Set<string>;
  stockingPct: number;
}) {
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
    const out: Sprite[] = [];
    const biggest = Math.max(1, ...stock.map((s) => s.species.max_size_in ?? 1));
    stock.forEach(({ species: s, qty }, si) => {
      const show = Math.min(qty, qty > 20 ? 9 : 7);
      const color = speciesColor(s.slug, si);
      const invert = isInvert(s);
      const zone = swimZone(s);
      // Fish length on screen: bigger fish look bigger, but minnows stay visible.
      const size = s.max_size_in ?? 1.5;
      const len = Math.max(14, Math.min(96, 14 + (size / Math.max(biggest, 6)) * 70));
      for (let i = 0; i < show; i++) {
        const h = hash(`${s.slug}:${i}`);
        const r1 = (h % 1000) / 1000;
        const r2 = ((h >>> 10) % 1000) / 1000;
        let y: number;
        if (invert) y = SAND - 6 - r2 * 10;
        else if (zone === "top") y = WATER_TOP + 18 + r2 * 34;
        else if (zone === "bottom") y = SAND - 14 - r2 * 22;
        else if (zone === "all") y = WATER_TOP + 30 + r2 * 140;
        else y = 78 + r2 * 70;
        const kind: Sprite["kind"] = invert ? (/snail/i.test(`${s.common_name} ${s.group_name}`) ? "snail" : "shrimp") : "fish";
        out.push({
          key: `${s.slug}-${i}`,
          slug: s.slug,
          first: i === 0,
          kind,
          x: 30 + len / 2 + r1 * (W - 60 - len),
          y,
          len: kind === "fish" ? len : 16,
          color,
          flip: (h >>> 20) % 2 === 0,
          dur: kind === "fish" ? 5 + ((h >>> 5) % 50) / 10 : 14,
          delay: -((h >>> 7) % 60) / 10,
        });
      }
    });
    return out;
  }, [stock, W]);

  const water =
    stockingPct > 130 ? ["#3b2a1a", "#1a1208"] : stockingPct >= 90 ? ["#1d3b3a", "#0a1c1f"] : ["#0e4c75", "#041a2e"];

  return (
    <div
      ref={box}
      className="relative h-[190px] overflow-hidden rounded-2xl border border-white/10 bg-[#020b18] sm:h-[250px] lg:h-[290px]"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" role="img" aria-label="Picture of your tank with the fish you've added">
        <defs>
          <linearGradient id="tbWater" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={water[0]} />
            <stop offset="1" stopColor={water[1]} />
          </linearGradient>
          <linearGradient id="tbSand" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#8a7350" />
            <stop offset="1" stopColor="#4a3b25" />
          </linearGradient>
          <linearGradient id="tbLight" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* water, light rays, sand */}
        <rect x="0" y={WATER_TOP} width={W} height={H - WATER_TOP} fill="url(#tbWater)" style={{ transition: "fill 0.6s" }} />
        {[0.18, 0.5, 0.8].map((f) => (
          <polygon
            key={f}
            points={`${W * f},${WATER_TOP} ${W * f + 55},${WATER_TOP} ${W * f + 25},${SAND} ${W * f - 45},${SAND}`}
            fill="url(#tbLight)"
          />
        ))}
        <path d={`M0 ${SAND} Q 120 ${SAND - 8} 240 ${SAND - 2} T ${W} ${SAND - 4} V ${H} H 0 Z`} fill="url(#tbSand)" />

        {/* plants and a rock */}
        <g opacity="0.9">
          <path d={`M36 ${SAND} C 30 150, 48 120, 40 80`} stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d={`M46 ${SAND} C 54 160, 40 130, 56 100`} stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d={`M28 ${SAND} C 22 170, 30 150, 20 125`} stroke="#166534" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d={`M${W - 44} ${SAND} C ${W - 36} 150, ${W - 52} 120, ${W - 40} 70`} stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
          <path d={`M${W - 30} ${SAND} C ${W - 24} 160, ${W - 34} 140, ${W - 22} 110`} stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx={W * 0.68} cy={SAND + 2} rx="34" ry="16" fill="#374151" />
          <ellipse cx={W * 0.68 - 8} cy={SAND - 4} rx="16" ry="6" fill="#4b5563" />
        </g>

        {/* bubbles */}
        <g className="tb-bubbles" fill="#bae6fd" opacity="0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={W - 20} cy={SAND - 4} r={1.5 + (i % 3)} style={{ animationDelay: `${i * 0.7}s` }} />
          ))}
        </g>

        {/* fish */}
        {sprites.map((sp) => (
          <g key={sp.key} transform={`translate(${sp.x} ${sp.y})`}>
            <g
              className="tb-swim"
              style={{ animationDuration: `${sp.dur}s`, animationDelay: `${sp.delay}s` }}
            >
              <g transform={sp.flip ? "scale(-1 1)" : undefined}>
                {sp.kind === "fish" ? (
                  <FishShape len={sp.len} color={sp.color} />
                ) : sp.kind === "shrimp" ? (
                  <ShrimpShape color={sp.color} />
                ) : (
                  <SnailShape color={sp.color} />
                )}
              </g>
            </g>
          </g>
        ))}

        {/* a warning pin over one fish of each species with a problem */}
        {flagged &&
          sprites
            .filter((sp) => sp.first && flagged.has(sp.slug))
            .map((sp) => (
              <g key={`warn-${sp.key}`} transform={`translate(${sp.x} ${Math.max(WATER_TOP + 10, sp.y - sp.len * 0.35 - 12)})`}>
                <circle r="7" fill="#f59e0b" stroke="#020b18" strokeWidth="1.5" />
                <text y="3.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#020b18">
                  !
                </text>
              </g>
            ))}

        {/* glass */}
        <rect x="1" y={WATER_TOP - 10} width={W - 2} height={H - WATER_TOP + 9} fill="none" stroke="#94a3b8" strokeOpacity="0.35" strokeWidth="2" rx="6" />
        <rect x="0" y={WATER_TOP - 14} width={W} height="6" fill="#0f172a" />
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
        @keyframes tbSwim { from { transform: translate(-14px, -2px); } to { transform: translate(14px, 3px); } }
        .tb-bubbles circle { animation: tbRise 4s linear infinite; }
        @keyframes tbRise { from { transform: translateY(0); opacity: .6 } to { transform: translateY(-190px); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .tb-swim, .tb-bubbles circle { animation: none; } }
      `}</style>
    </div>
  );
}

function FishShape({ len, color }: { len: number; color: string }) {
  const h = len * 0.38;
  const half = len / 2;
  return (
    <g>
      <path
        d={`M ${half} 0 C ${half * 0.6} ${-h * 0.75}, ${-half * 0.4} ${-h * 0.8}, ${-half * 0.62} 0 C ${-half * 0.4} ${h * 0.8}, ${half * 0.6} ${h * 0.75}, ${half} 0 Z`}
        fill={color}
      />
      <path d={`M ${-half * 0.55} 0 L ${-half} ${-h * 0.55} L ${-half * 0.9} 0 L ${-half} ${h * 0.55} Z`} fill={color} opacity="0.85" />
      <circle cx={half * 0.6} cy={-h * 0.12} r={Math.max(1.2, len * 0.045)} fill="#0b1220" />
    </g>
  );
}

function ShrimpShape({ color }: { color: string }) {
  return (
    <g>
      <path d="M 7 0 C 4 -5, -4 -5, -7 1 C -4 -1, 3 -1, 7 0 Z" fill={color} />
      <path d="M 7 0 L 12 -4 M 7 0 L 12 -1" stroke={color} strokeWidth="0.8" />
    </g>
  );
}

function SnailShape({ color }: { color: string }) {
  return (
    <g>
      <path d="M -8 3 H 8 C 8 1, 6 0, 4 0" fill="#d6c7a1" stroke="#d6c7a1" strokeWidth="1" />
      <circle cx="-1" cy="-2" r="6" fill={color} />
      <circle cx="-1" cy="-2" r="3" fill="none" stroke="#0b1220" strokeOpacity="0.4" />
    </g>
  );
}
