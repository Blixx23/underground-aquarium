"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { HelpSection } from "@/lib/help/types";
import { helpHref } from "@/lib/help/types";
import { highlightParts, queryTerms, searchHelp } from "@/lib/help/search";

/**
 * Instant help search. The whole index ships with the page (it's small), so
 * typing never touches the server or the database.
 */

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

// One download per page view at most, shared by every search box on the page.
let indexPromise: Promise<HelpSection[]> | null = null;
function loadIndex(): Promise<HelpSection[]> {
  if (!indexPromise) {
    indexPromise = fetch("/help/search-index.json")
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

export default function HelpSearch({
  autoFocus = false,
  placeholder = "Search help, e.g. “mark as sold”",
}: {
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [sections, setSections] = useState<HelpSection[] | null>(null);
  const warm = () => {
    if (!sections) loadIndex().then(setSections);
  };
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const terms = useMemo(() => queryTerms(q), [q]);
  const results = useMemo(() => (sections ? searchHelp(sections, q, 12) : []), [sections, q]);

  useEffect(() => setActive(0), [q]);

  // "/" or Cmd/Ctrl+K jumps to the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "/" && !typing) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(i: number) {
    const r = results[i];
    if (!r) return;
    setFocused(false);
    setQ("");
    router.push(helpHref(r.s));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setQ("");
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(active);
    }
  }

  const showPanel = focused && q.trim().length > 1;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ocean-400" />
        <input
          ref={inputRef}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            setFocused(true);
            warm();
          }}
          onPointerEnter={warm}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={onKeyDown}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          aria-label="Search help"
          className="w-full rounded-2xl border border-ocean-700/60 bg-ocean-950/80 py-4 pl-12 pr-14 text-base text-white placeholder:text-ocean-500 shadow-lg outline-none transition focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ocean-400 hover:bg-white/5 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-ocean-700/60 px-1.5 py-0.5 text-[11px] text-ocean-400 sm:block">
            /
          </kbd>
        )}
      </div>

      {showPanel && (
        <div
          ref={panelRef}
          className="absolute z-30 mt-2 max-h-[60vh] w-full overflow-y-auto rounded-2xl border border-ocean-700/60 bg-ocean-950/95 p-2 shadow-2xl backdrop-blur-xl"
        >
          {!sections ? (
            <p className="px-3 py-6 text-center text-sm text-ocean-400">Loading answers…</p>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm font-medium text-white">No help articles match “{q}”.</p>
              <p className="mt-1 text-sm text-ocean-400">
                Try different words, browse the topics below, or email{" "}
                <a href="mailto:support@undergroundaquarium.com" className="text-emerald-400 hover:underline">
                  support@undergroundaquarium.com
                </a>
                .
              </p>
            </div>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={`${r.s.slug}#${r.s.anchor}`} data-idx={i}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => go(i)}
                    className={`flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition ${
                      i === active ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">
                      <Hl text={r.s.heading} terms={terms} />
                    </span>
                    <span className="text-xs text-emerald-400/80">
                      {r.s.anchor ? r.s.articleTitle : r.s.category}
                    </span>
                    {r.snippet && (
                      <span className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-ocean-300">
                        <Hl text={r.snippet} terms={terms} />
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
