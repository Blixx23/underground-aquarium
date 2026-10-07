"use client";

import { useRestoreScroll } from "@/lib/hooks/useUrlState";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Fish, Leaf, ChevronRight, X } from "lucide-react";
import type { GuideCard } from "@/lib/breeding/guides";
import { CLASS_LADDER } from "@/lib/society/classes";
import { editDistance } from "@/lib/search/fuzzy";

/**
 * Every guide, grouped by the Society's difficulty classes, with a live,
 * typo-tolerant search, a fish/plant switch, class and group chips.
 * Grouping by class is the point: it shows people where to start and what
 * to aim for next.
 */

type Program = "bap" | "hap";

const words = (t: string) => t.toLowerCase().match(/[a-z0-9]+/g) ?? [];

// Short words must match exactly; longer ones may have a typo or two.
function allowed(len: number): number {
  if (len <= 3) return 0;
  if (len <= 8) return 1;
  return 2;
}

function wordHit(q: string, list: string[]): boolean {
  const max = allowed(q.length);
  for (const w of list) {
    if (w.startsWith(q)) return true;
    if (max === 0) continue;
    if (editDistance(q, w, max) <= max) return true;
    // "corydorus" vs the start of "corydoras"
    if (w.length > q.length && editDistance(q, w.slice(0, q.length), max) <= max) return true;
  }
  return false;
}

// Plain words people use for difficulty.
const EASY = new Set(["easy", "easiest", "beginner", "beginners", "starter", "first"]);
const HARD = new Set(["hard", "hardest", "expert", "difficult", "rare"]);

type Indexed = {
  g: GuideCard;
  name: string;
  names: string; // name, other names, scientific
  nameWords: string[];
  tagWords: string[]; // group, method, class
  summaryWords: Set<string>;
};

function index(g: GuideCard): Indexed {
  const names = [g.name, ...g.aliases, g.scientific ?? ""].join(" | ").toLowerCase();
  const tags = [g.category ?? "", g.method ?? "", g.classLetter ? `class ${g.classLetter}` : ""].join(" ");
  return {
    g,
    name: g.name.toLowerCase(),
    names,
    nameWords: words(names),
    tagWords: words(tags),
    summaryWords: new Set(words(g.summary)),
  };
}

/** 0 = no match. Higher = better. */
function score(x: Indexed, q: string, qWords: string[]): number {
  if (x.name.startsWith(q)) return 100;
  if (x.name.includes(q)) return 90;
  if (x.names.includes(q)) return 75;
  const tagText = x.tagWords.join(" ");
  if (tagText.includes(q)) return 50;
  let total = 0;
  for (const w of qWords) {
    if (EASY.has(w) || HARD.has(w)) continue; // handled as a class filter
    if (wordHit(w, x.nameWords)) total += 30;
    else if (wordHit(w, x.tagWords)) total += 15;
    else if (w.length >= 4 && x.summaryWords.has(w)) total += 5;
    else return 0;
  }
  return total;
}

function readParams() {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  return { q: p.get("q") ?? "", program: p.get("type") === "plants" ? "hap" : "bap", cls: (p.get("class") ?? "").toUpperCase(), group: p.get("group") ?? "All" } as const;
}

export default function GuideBrowser({ guides, children }: { guides: GuideCard[]; children?: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState<Program>("bap");
  const [group, setGroup] = useState<string>("All");
  const [cls, setCls] = useState<string>("");
  const [restored, setRestored] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const indexed = useMemo(() => guides.map(index), [guides]);
  // Back from a guide lands on the same spot in the list.
  useRestoreScroll(restored);

  // Keep the search in the address, so the back arrow from a guide lands on the same results
  // and a search can be shared as a link.
  useEffect(() => {
    const p = readParams();
    if (p) {
      setQ(p.q);
      setProgram(p.program);
      if (/^[A-F]$/.test(p.cls)) setCls(p.cls);
      setGroup(p.group);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (program === "hap") p.set("type", "plants");
    if (cls) p.set("class", cls.toLowerCase());
    if (group !== "All") p.set("group", group);
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [q, program, cls, group, restored]);

  // Press "/" anywhere on the page to jump to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The query, minus any "class b" in it, which becomes the class filter instead.
  const parsed = useMemo(() => {
    let text = q.trim().toLowerCase();
    let qClass = "";
    const m = text.match(/\bclass\s+([a-f])\b/);
    if (m) {
      qClass = m[1].toUpperCase();
      text = text.replace(m[0], " ").replace(/\s+/g, " ").trim();
    }
    const qWords = words(text);
    if (!qClass && qWords.some((w) => EASY.has(w))) qClass = "A";
    const hard = qWords.some((w) => HARD.has(w));
    return { text, qWords, qClass, hard };
  }, [q]);

  // Matches across both programs (so the tabs can show counts), best first.
  const matches = useMemo(() => {
    const activeClass = cls || parsed.qClass;
    const out: { g: GuideCard; s: number }[] = [];
    for (const x of indexed) {
      if (activeClass && x.g.classLetter !== activeClass) continue;
      if (parsed.hard && !["E", "F"].includes(x.g.classLetter ?? "")) continue;
      const s = parsed.text && parsed.qWords.some((w) => !EASY.has(w) && !HARD.has(w)) ? score(x, parsed.text, parsed.qWords) : 1;
      if (s > 0) out.push({ g: x.g, s });
    }
    return out;
  }, [indexed, parsed, cls]);

  const counts = useMemo(() => {
    const c = { bap: 0, hap: 0 };
    for (const m of matches) c[m.g.program]++;
    return c;
  }, [matches]);

  // Searching for a plant from the fish tab (or the other way round): switch to where the results are.
  // Only when the search changes, so tapping a tab by hand still sticks.
  const lastQ = useRef("");
  useEffect(() => {
    if (q === lastQ.current) return;
    lastQ.current = q;
    if (!q.trim()) return;
    if (counts[program] === 0 && counts[program === "bap" ? "hap" : "bap"] > 0) {
      setProgram(program === "bap" ? "hap" : "bap");
      setGroup("All");
    }
  }, [counts, program, q]);

  const inProgram = useMemo(() => matches.filter((m) => m.g.program === program), [matches, program]);

  const groups = useMemo(() => {
    const seen = new Map<string, number>();
    for (const { g } of inProgram) if (g.category) seen.set(g.category, (seen.get(g.category) ?? 0) + 1);
    if (group !== "All" && !seen.has(group)) seen.set(group, 0);
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [inProgram, group]);

  const shown = useMemo(() => inProgram.filter(({ g }) => group === "All" || g.category === group), [inProgram, group]);

  const byPoints = useMemo(() => {
    const m = new Map<number, { g: GuideCard; s: number }[]>();
    for (const r of shown) {
      // -1: guides for species not on the Society's points list, shown last.
      const p = r.g.points ?? -1;
      m.set(p, [...(m.get(p) ?? []), r]);
    }
    for (const list of m.values()) list.sort((a, b) => b.s - a.s || a.g.name.localeCompare(b.g.name));
    return [...m.entries()].sort((a, b) => (a[0] < 0 ? 1 : b[0] < 0 ? -1 : a[0] - b[0]));
  }, [shown]);

  // A strong name match goes straight to the top so Enter can open it.
  const best = useMemo(() => {
    if (!parsed.text) return null;
    const top = [...shown].sort((a, b) => b.s - a.s)[0];
    return top && top.s >= 75 ? top.g : null;
  }, [shown, parsed.text]);

  const blurb = (p: number) => CLASS_LADDER.find((c) => c.points === p);
  const filtering = !!(q.trim() || cls || group !== "All");
  const total = guides.filter((g) => g.program === program).length;

  function reset() {
    setQ("");
    setCls("");
    setGroup("All");
    input.current?.focus();
  }

  const tabs = (["bap", "hap"] as const).map((p) => (
    <button
      key={p}
      type="button"
      onClick={() => {
        setProgram(p);
        setGroup("All");
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        program === p ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-ocean-700/60 text-ocean-300 hover:text-white"
      }`}
    >
      {p === "bap" ? <Fish className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}
      {p === "bap" ? "Fish & inverts" : "Plants"}
      {filtering && <span className="text-xs text-ocean-400">{counts[p]}</span>}
    </button>
  ));

  // On phones the chip rows scroll sideways instead of wrapping into a wall of buttons.
  const chipRow = "-mx-6 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0";

  return (
    <div>
      {/* Search first, and on phones it stays pinned under the header while you scroll. */}
      <div className="sticky top-16 z-20 -mx-6 mb-3 border-b border-ocean-800/60 bg-ocean-950/95 px-6 py-2 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:order-2 sm:ml-auto sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" />
            <input
              ref={input}
              type="search"
              enterKeyHint="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && best) window.location.href = `/breeding/${best.slug}`;
                if (e.key === "Escape") setQ("");
              }}
              placeholder={`Search ${guides.length} guides: guppy, class c…`}
              aria-label="Search breeding guides"
              className="w-full rounded-xl border border-ocean-700/70 bg-ocean-900/80 py-3 pl-9 pr-9 text-base text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none sm:py-2.5 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  input.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ocean-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 sm:order-1">{tabs}</div>
        </div>
      </div>

      {/* Difficulty */}
      <div className={`mb-2 ${chipRow}`}>
        <span className="mr-1 shrink-0 text-xs text-ocean-500">Difficulty</span>
        {["", ...CLASS_LADDER.map((c) => c.letter)].map((letter) => (
          <button
            key={letter || "any"}
            type="button"
            onClick={() => setCls(letter)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
              cls === letter ? "border-amber-400/60 bg-amber-500/15 text-amber-200" : "border-white/10 text-ocean-300 hover:text-white"
            }`}
          >
            {letter ? `Class ${letter}` : "Any"}
          </button>
        ))}
      </div>

      {/* Groups */}
      <div className={`mb-4 ${chipRow}`}>
        {[["All", inProgram.length] as [string, number], ...groups].map(([name, n]) => (
          <button
            key={name}
            type="button"
            onClick={() => setGroup(name)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs transition-colors ${
              group === name ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200" : "border-white/10 text-ocean-300 hover:text-white"
            }`}
          >
            {name}
            <span className="ml-1 text-ocean-500">{n}</span>
          </button>
        ))}
      </div>

      {/* Extras (the class ladder and easy starters) only while nothing is searched. */}
      {!filtering && children}

      <p className="mb-6 text-sm text-ocean-400" aria-live="polite">
        {filtering ? (
          <>
            {shown.length === 1 ? "1 guide" : `${shown.length} guides`} of {total}
            {parsed.qClass && !cls && <> · showing Class {parsed.qClass}</>}
            {parsed.hard && <> · showing Classes E and F</>}
            {best && <> · press Enter to open <span className="text-white">{best.name}</span></>}
            <button type="button" onClick={reset} className="ml-2 text-emerald-300 hover:text-emerald-200">
              Clear all
            </button>
          </>
        ) : (
          <>{total} guides, easiest first</>
        )}
      </p>

      {byPoints.length === 0 ? (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center text-ocean-400">
          <p>No breeding guide matches that yet.</p>
          <p className="mt-2 text-sm">
            Try another name, or{" "}
            <Link href={`/species?q=${encodeURIComponent(q.trim())}`} className="text-emerald-300 hover:text-emerald-200">
              search the species library
            </Link>{" "}
            for its care page.{" "}
            <button type="button" onClick={reset} className="text-emerald-300 hover:text-emerald-200">
              Clear the search
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {byPoints.map(([points, list]) => {
            const c = blurb(points);
            return (
              <section key={points} id={c ? `class-${c.letter.toLowerCase()}` : `points-${points}`} className="scroll-mt-52 sm:scroll-mt-28">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="font-display text-2xl text-white">
                    {c ? `Class ${c.letter}` : points < 0 ? "More species" : `${points} points`}
                    {points >= 0 && <span className="ml-2 text-base text-amber-300">{points} points</span>}
                  </h2>
                  {c && <p className="text-sm text-ocean-400">{c.blurb}</p>}
                  {points < 0 && <p className="text-sm text-ocean-400">Not on the Society&apos;s points list.</p>}
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map(({ g }) => {
                    // Show the other name that matched, so "x-ray" finding Pristella makes sense.
                    const t = parsed.text;
                    const alias = t && !g.name.toLowerCase().includes(t) ? g.aliases.find((a) => a.toLowerCase().includes(t)) : undefined;
                    return (
                      <li key={g.slug}>
                        <Link
                          href={`/breeding/${g.slug}`}
                          className={`flex h-full items-start justify-between gap-3 rounded-2xl border bg-ocean-900/40 p-4 transition-colors hover:border-emerald-500/40 hover:bg-ocean-900/70 ${
                            best?.slug === g.slug ? "border-emerald-500/50" : "border-ocean-800/60"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block font-medium text-white">{g.name}</span>
                            {alias && <span className="block truncate text-xs text-emerald-300/80">Also called {alias}</span>}
                            {g.scientific && <span className="block truncate text-xs italic text-ocean-400">{g.scientific}</span>}
                            <span className="mt-1 block truncate text-xs text-ocean-500">
                              {[g.method?.replace(/\s*\(.*\)\s*$/, ""), g.category].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ocean-500" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
