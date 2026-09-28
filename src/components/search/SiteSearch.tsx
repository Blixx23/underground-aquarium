"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  LifeBuoy,
  Tag,
  Fish,
  Egg,
  Store,
  MessagesSquare,
  CalendarDays,
  BookOpen,
  GraduationCap,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { SiteGroup, SiteGroupKey } from "@/lib/search/site";
import { highlightParts, queryTerms } from "@/lib/help/search";

const ICONS: Record<SiteGroupKey, LucideIcon> = {
  help: LifeBuoy,
  listings: Tag,
  species: Fish,
  breeding: Egg,
  stores: Store,
  forums: MessagesSquare,
  events: CalendarDays,
  glossary: BookOpen,
  courses: GraduationCap,
};

const SUGGESTIONS = ["cherry shrimp", "betta tankmates", "peaceful schooling fish", "claim my store", "nitrate", "breeding"];

function Hl({ text, terms }: { text: string; terms: string[] }) {
  return (
    <>
      {highlightParts(text, terms).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded bg-emerald-400/20 px-0.5 text-white">
            {p.t}
          </mark>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )}
    </>
  );
}

export default function SiteSearch({
  initialQuery = "",
  initialGroups = [],
  initialCorrectedTo = null,
}: {
  initialQuery?: string;
  initialGroups?: SiteGroup[];
  initialCorrectedTo?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initialQuery);
  const [groups, setGroups] = useState<SiteGroup[]>(initialGroups);
  const [searched, setSearched] = useState(initialQuery.trim().length >= 2 ? initialQuery.trim() : "");
  const [loading, setLoading] = useState(false);
  const [correctedTo, setCorrectedTo] = useState<string | null>(initialCorrectedTo);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0);

  // Search as you type, a beat after the last keystroke.
  useEffect(() => {
    const query = q.trim();
    if (query === searched) return;
    if (query.length < 2) {
      setGroups([]);
      setSearched("");
      setCorrectedTo(null);
      setLoading(false);
      router.replace(pathname, { scroll: false });
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&n=6`);
        const data = (await res.json()) as { groups?: SiteGroup[]; correctedTo?: string | null };
        if (id !== reqId.current) return; // a newer search already started
        setGroups(data.groups ?? []);
        setCorrectedTo(data.correctedTo ?? null);
        setSearched(query);
        router.replace(`${pathname}?q=${encodeURIComponent(query)}`, { scroll: false });
      } catch {
        if (id === reqId.current) setGroups([]);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const terms = queryTerms(correctedTo ?? searched);
  const total = groups.reduce((n, g) => n + g.hits.length, 0);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={!initialQuery}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder="Search fish, care, ads, stores, help… typos are fine"
          aria-label="Search the site"
          className="w-full rounded-2xl border border-ocean-700/60 bg-ocean-950/80 py-4 pl-12 pr-14 text-base text-white placeholder:text-ocean-500 shadow-lg outline-none transition focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
          {loading ? (
            <Loader2 className="m-1.5 h-4 w-4 animate-spin text-ocean-400" />
          ) : q ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className="rounded-lg p-1.5 text-ocean-400 hover:bg-white/5 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {!searched && !loading && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-ocean-400">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQ(s)}
              className="rounded-full border border-ocean-700/60 bg-white/[0.03] px-3 py-1 text-xs text-ocean-200 transition hover:border-emerald-500/50 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {searched && !loading && total === 0 && (
        <div className="mt-8 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-6 text-center">
          <p className="font-medium text-white">Nothing matched “{searched}”.</p>
          <p className="mt-1 text-sm text-ocean-300">
            Try fewer words or a different spelling, browse the{" "}
            <Link href="/help" className="text-emerald-400 hover:underline">
              Help Center
            </Link>
            , or ask the community in the{" "}
            <Link href="/forums/new" className="text-emerald-400 hover:underline">
              forums
            </Link>
            .
          </p>
        </div>
      )}

      {groups.length > 0 && (
        <>
          <p className="mt-6 text-xs text-ocean-500" aria-live="polite">
            {correctedTo ? (
              <>
                {total} result{total === 1 ? "" : "s"} for{" "}
                <span className="font-medium text-white">“{correctedTo}”</span>
                <span className="text-ocean-500"> (you typed “{searched}”)</span>
              </>
            ) : (
              <>
                {total} result{total === 1 ? "" : "s"} for “{searched}”
              </>
            )}
          </p>
          {groups.length > 1 && (
            <nav aria-label="Jump to" className="mt-3 flex flex-wrap gap-2">
              {groups.map((g) => {
                const Icon = ICONS[g.key];
                return (
                  <a
                    key={g.key}
                    href={`#results-${g.key}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ocean-700/60 px-3 py-1 text-xs text-ocean-200 hover:border-emerald-500/50 hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" /> {g.label}
                    <span className="text-ocean-500">{g.hits.length}</span>
                  </a>
                );
              })}
            </nav>
          )}
        </>
      )}

      <div className={`mt-6 space-y-8 transition-opacity ${loading ? "opacity-60" : ""}`}>
        {groups.map((g) => {
          const Icon = ICONS[g.key];
          return (
            <section key={g.key} id={`results-${g.key}`} className="scroll-mt-28">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="font-medium text-white">{g.label}</h2>
                <span className="h-px flex-1 bg-ocean-800/60" />
              </div>
              <ul className="divide-y divide-ocean-800/50 overflow-hidden rounded-2xl border border-ocean-800/60 bg-white/[0.02]">
                {g.hits.map((h) => (
                  <li key={h.href}>
                    <Link href={h.href} className="block px-4 py-3 transition hover:bg-white/[0.04]">
                      <span className="block text-sm font-medium text-white">
                        <Hl text={h.title} terms={terms} />
                      </span>
                      {h.subtitle && <span className="mt-0.5 block text-xs text-emerald-400/80">{h.subtitle}</span>}
                      {h.snippet && (
                        <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-ocean-300">
                          <Hl text={h.snippet} terms={terms} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {g.more && (
                <Link
                  href={g.more.href}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  {g.more.label} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
