"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, MessagesSquare, ChevronRight } from "lucide-react";
import { Snippet } from "@/lib/forum/snippet";

type Result = {
  thread_id: string;
  thread_slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  snippet: string | null;
};

const MIN_CHARS = 3;
const DEBOUNCE_MS = 280;

export default function ForumSearchBar({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced typeahead: one query after the person pauses, 3+ characters,
  // cancelling any request still in flight.
  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/forum/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults((data.results ?? []) as Result[]);
        setActive(-1);
      } catch {
        // aborted or failed: leave results as they are
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function goToResults(term: string) {
    const t = term.trim();
    if (t.length < MIN_CHARS) return;
    setOpen(false);
    router.push(`/forums/search?q=${encodeURIComponent(t)}`);
  }

  function goToThread(r: Result) {
    setOpen(false);
    router.push(`/forums/${r.category_slug}/${r.thread_slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Enter") goToResults(q);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < results.length) goToThread(results[active]);
      else goToResults(q);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const term = q.trim();
  const showDropdown = open && term.length >= MIN_CHARS;

  // Group results under their forum, keeping the best match's forum first.
  const groups: { name: string; items: { r: Result; idx: number }[] }[] = [];
  results.forEach((r, idx) => {
    let g = groups.find((x) => x.name === r.category_name);
    if (!g) {
      g = { name: r.category_name, items: [] };
      groups.push(g);
    }
    g.items.push({ r, idx });
  });

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults(q);
        }}
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-400" />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ocean-400" />
        )}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          type="search"
          enterKeyHint="search"
          placeholder="Search the forums…"
          aria-label="Search the forums"
          className="w-full rounded-2xl border border-ocean-700/70 bg-ocean-900/60 py-3 pl-10 pr-10 text-[15px] text-white placeholder-ocean-400 transition-colors focus:border-ocean-400 focus:outline-none"
        />
      </form>

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-ocean-600/60 bg-ocean-950 shadow-2xl shadow-black/60">
          {results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-ocean-300">
              {loading ? "Searching…" : `No threads match "${term}" yet. Press Enter to search every reply too.`}
            </p>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.name}>
                  <p className="flex items-center gap-2 border-b border-ocean-800/70 bg-ocean-900/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ocean-200">
                    <MessagesSquare className="h-3.5 w-3.5 text-ocean-400" />
                    {g.name}
                  </p>
                  <ul>
                    {g.items.map(({ r, idx }) => (
                      <li key={r.thread_id}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => goToThread(r)}
                          className={`block w-full border-b border-ocean-800/50 px-4 py-3 text-left transition-colors ${
                            active === idx ? "bg-ocean-800/60" : "hover:bg-ocean-800/40"
                          }`}
                        >
                          <span className="block text-[15px] font-medium leading-snug text-white">{r.title}</span>
                          {r.snippet && (
                            <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-ocean-200">
                              <Snippet text={r.snippet} />
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <button
                type="button"
                onClick={() => goToResults(q)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-ocean-100 transition-colors hover:bg-ocean-800/40"
              >
                See all results for &ldquo;{term}&rdquo;
                <ChevronRight className="h-4 w-4 text-ocean-400" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
