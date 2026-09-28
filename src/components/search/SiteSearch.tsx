"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

/**
 * The site search box and its grouped results. Used two ways:
 *  - "page": the /search page. Keeps the address bar in step (?q=...), so a
 *    search can be shared or bookmarked.
 *  - "modal": the pop-out opened from the magnifying glass. Doesn't touch
 *    the address bar; fewer results per group, with "See all results".
 * Arrow keys move through results, Enter opens the highlighted one.
 */
export default function SiteSearch({
  initialQuery = "",
  initialGroups = [],
  initialCorrectedTo = null,
  mode = "page",
  onNavigate,
}: {
  initialQuery?: string;
  initialGroups?: SiteGroup[];
  initialCorrectedTo?: string | null;
  mode?: "page" | "modal";
  /** called when a result is opened (the modal closes itself) */
  onNavigate?: () => void;
}) {
  const modal = mode === "modal";
  const perGroup = modal ? 4 : 6;
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(initialQuery);
  const [groups, setGroups] = useState<SiteGroup[]>(initialGroups);
  const [searched, setSearched] = useState(initialQuery.trim().length >= 2 ? initialQuery.trim() : "");
  const [loading, setLoading] = useState(false);
  const [correctedTo, setCorrectedTo] = useState<string | null>(initialCorrectedTo);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Search as you type, a beat after the last keystroke.
  useEffect(() => {
    const query = q.trim();
    if (query === searched) return;
    if (query.length < 2) {
      reqId.current++;
      setGroups([]);
      setSearched("");
      setCorrectedTo(null);
      setLoading(false);
      if (!modal && searched) router.replace(pathname, { scroll: false });
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&n=${perGroup}`);
        const data = (await res.json()) as { groups?: SiteGroup[]; correctedTo?: string | null };
        if (id !== reqId.current) return; // a newer search already started
        setGroups(data.groups ?? []);
        setCorrectedTo(data.correctedTo ?? null);
        setSearched(query);
        setActive(-1);
        if (!modal) router.replace(`${pathname}?q=${encodeURIComponent(query)}`, { scroll: false });
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
  const flat = useMemo(() => groups.flatMap((g) => g.hits.map((h) => h.href)), [groups]);
  const total = flat.length;
  const seeAll = `/search?q=${encodeURIComponent(searched)}`;

  // Keep the highlighted result in view.
  useEffect(() => {
    if (active < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function open(href: string) {
    onNavigate?.();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && total) {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp" && total) {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && flat[active]) open(flat[active]);
      else if (modal && searched) open(seeAll);
      else if (flat[0]) open(flat[0]);
    }
  }

  let idx = -1; // running index across groups, for keyboard highlighting

  return (
    <div className={modal ? "flex min-h-0 flex-1 flex-col" : ""}>
      <div className={modal ? "relative shrink-0" : "relative"}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus={modal || !initialQuery}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search fish, care, stores, ads… typos are fine"
          aria-label="Search the site"
          className={`w-full rounded-2xl border border-ocean-700/60 bg-ocean-950/80 pl-12 pr-14 text-base text-white placeholder:text-ocean-500 outline-none transition focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10 ${
            modal ? "py-3.5" : "py-4 shadow-lg"
          }`}
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

      <div ref={listRef} className={modal ? "-mx-1 mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2" : ""}>
        {!searched && !loading && (
          <div className={modal ? "mt-2 flex flex-wrap items-center gap-2" : "mt-5 flex flex-wrap items-center gap-2"}>
            <span className="text-xs font-medium text-ocean-400">Try:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQ(s);
                  inputRef.current?.focus();
                }}
                className="rounded-full border border-ocean-700/60 bg-white/[0.03] px-3 py-1 text-xs text-ocean-200 transition hover:border-emerald-500/50 hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {searched && !loading && total === 0 && (
          <div className="mt-6 rounded-2xl border border-ocean-800/60 bg-white/[0.03] p-6 text-center">
            <p className="font-medium text-white">Nothing matched “{searched}”.</p>
            <p className="mt-1 text-sm text-ocean-300">
              Try fewer words, browse the{" "}
              <Link href="/help" onClick={onNavigate} className="text-emerald-400 hover:underline">
                Help Center
              </Link>
              , or ask the community in the{" "}
              <Link href="/forums/new" onClick={onNavigate} className="text-emerald-400 hover:underline">
                forums
              </Link>
              .
            </p>
          </div>
        )}

        {total > 0 && (
          <div className={modal ? "mt-1 flex items-center justify-between gap-3" : "mt-6"}>
            <p className="text-xs text-ocean-500" aria-live="polite">
              {total} result{total === 1 ? "" : "s"} for{" "}
              {correctedTo ? (
                <>
                  <span className="font-medium text-white">“{correctedTo}”</span> (you typed “{searched}”)
                </>
              ) : (
                <>“{searched}”</>
              )}
            </p>
            {modal && (
              <Link
                href={seeAll}
                onClick={onNavigate}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
              >
                See all results <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        )}

        {!modal && groups.length > 1 && (
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

        <div className={`${modal ? "mt-3 space-y-5" : "mt-6 space-y-8"} transition-opacity ${loading ? "opacity-60" : ""}`}>
          {groups.map((g) => {
            const Icon = ICONS[g.key];
            return (
              <section key={g.key} id={modal ? undefined : `results-${g.key}`} className="scroll-mt-28">
                <div className="mb-2 flex items-center gap-2.5">
                  <span
                    className={`flex items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 ${
                      modal ? "h-6 w-6" : "h-8 w-8"
                    }`}
                  >
                    <Icon className={modal ? "h-3.5 w-3.5" : "h-4 w-4"} />
                  </span>
                  <h2 className={modal ? "text-sm font-medium text-white" : "font-medium text-white"}>{g.label}</h2>
                  <span className="h-px flex-1 bg-ocean-800/60" />
                </div>
                <ul className="divide-y divide-ocean-800/50 overflow-hidden rounded-2xl border border-ocean-800/60 bg-white/[0.02]">
                  {g.hits.map((h) => {
                    idx++;
                    const i = idx;
                    return (
                      <li key={h.href} data-idx={i}>
                        <Link
                          href={h.href}
                          onClick={onNavigate}
                          onMouseEnter={() => setActive(i)}
                          className={`block px-4 transition ${modal ? "py-2.5" : "py-3"} ${
                            i === active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="block text-sm font-medium text-white">
                            <Hl text={h.title} terms={terms} />
                          </span>
                          {h.subtitle && <span className="mt-0.5 block text-xs text-emerald-400/80">{h.subtitle}</span>}
                          {h.snippet && (
                            <span
                              className={`mt-1 block text-[13px] leading-relaxed text-ocean-300 ${
                                modal ? "line-clamp-1" : "line-clamp-2"
                              }`}
                            >
                              <Hl text={h.snippet} terms={terms} />
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {g.more && !modal && (
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
    </div>
  );
}
